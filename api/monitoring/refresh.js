// api/monitoring/refresh.js - Refresh materialized views
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { views = 'all', force = false } = req.body;

  try {
    const refreshResults = [];
    
    // Define available materialized views
    const availableViews = [
      'workflow_health_hourly',
      'api_cost_daily'
    ];

    const viewsToRefresh = views === 'all' ? availableViews : 
      Array.isArray(views) ? views.filter(v => availableViews.includes(v)) : [views];

    if (viewsToRefresh.length === 0) {
      return res.status(400).json({
        error: 'No valid views specified',
        available_views: availableViews
      });
    }

    // Refresh each view
    for (const viewName of viewsToRefresh) {
      const startTime = Date.now();
      
      try {
        // Check if view exists first
        const { data: viewExists, error: checkError } = await supabase
          .rpc('check_materialized_view_exists', { view_name: viewName });

        if (checkError || !viewExists) {
          refreshResults.push({
            view: viewName,
            status: 'skipped',
            reason: 'View does not exist',
            duration_ms: Date.now() - startTime
          });
          continue;
        }

        // Refresh the materialized view
        const refreshMode = force ? 'REFRESH MATERIALIZED VIEW' : 'REFRESH MATERIALIZED VIEW CONCURRENTLY';
        const { error: refreshError } = await supabase
          .rpc('refresh_materialized_view', { 
            view_name: viewName,
            concurrent: !force
          });

        if (refreshError) {
          throw refreshError;
        }

        // Get view statistics
        const { data: stats } = await supabase
          .rpc('get_materialized_view_stats', { view_name: viewName });

        refreshResults.push({
          view: viewName,
          status: 'success',
          duration_ms: Date.now() - startTime,
          stats: stats || {}
        });

      } catch (error) {
        console.error(`Error refreshing view ${viewName}:`, error);
        refreshResults.push({
          view: viewName,
          status: 'error',
          error: error.message,
          duration_ms: Date.now() - startTime
        });
      }
    }

    // Also refresh database functions if requested
    if (req.body.refresh_functions) {
      try {
        await refreshMonitoringFunctions();
        refreshResults.push({
          view: 'monitoring_functions',
          status: 'success',
          message: 'Monitoring functions refreshed'
        });
      } catch (error) {
        refreshResults.push({
          view: 'monitoring_functions',
          status: 'error',
          error: error.message
        });
      }
    }

    const successCount = refreshResults.filter(r => r.status === 'success').length;
    const errorCount = refreshResults.filter(r => r.status === 'error').length;

    return res.status(200).json({
      success: errorCount === 0,
      message: `Refreshed ${successCount} views successfully, ${errorCount} errors`,
      results: refreshResults,
      summary: {
        total_views: refreshResults.length,
        successful: successCount,
        errors: errorCount,
        skipped: refreshResults.filter(r => r.status === 'skipped').length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in refresh endpoint:', error);
    return res.status(500).json({
      error: 'Failed to refresh views',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function refreshMonitoringFunctions() {
  try {
    // Refresh workflow performance aggregation
    const { error: perfError } = await supabase
      .rpc('aggregate_daily_workflow_performance');

    if (perfError) {
      console.error('Error aggregating workflow performance:', perfError);
    }

    // Update health scores
    const workflows = ['LeadGenOS (LinkedIn)', 'LeadGenOS (Apollo)'];
    for (const workflow of workflows) {
      const { error: healthError } = await supabase
        .rpc('calculate_workflow_health_score', { 
          p_workflow_name: workflow,
          p_hours: 24
        });

      if (healthError) {
        console.error(`Error calculating health for ${workflow}:`, healthError);
      }
    }

    // Clean up old data
    const { error: cleanupError } = await supabase
      .rpc('cleanup_old_monitoring_data');

    if (cleanupError) {
      console.error('Error cleaning up old data:', cleanupError);
    }

    return true;
  } catch (error) {
    console.error('Error refreshing monitoring functions:', error);
    throw error;
  }
}

// Helper function to create the database functions if they don't exist
async function createHelperFunctions() {
  const functions = [
    {
      name: 'check_materialized_view_exists',
      sql: `
        CREATE OR REPLACE FUNCTION check_materialized_view_exists(view_name TEXT)
        RETURNS BOOLEAN AS $$
        BEGIN
          RETURN EXISTS (
            SELECT 1 FROM pg_matviews 
            WHERE schemaname = 'public' AND matviewname = view_name
          );
        END;
        $$ LANGUAGE plpgsql;
      `
    },
    {
      name: 'refresh_materialized_view',
      sql: `
        CREATE OR REPLACE FUNCTION refresh_materialized_view(view_name TEXT, concurrent BOOLEAN DEFAULT true)
        RETURNS VOID AS $$
        BEGIN
          IF concurrent THEN
            EXECUTE 'REFRESH MATERIALIZED VIEW CONCURRENTLY public.' || quote_ident(view_name);
          ELSE
            EXECUTE 'REFRESH MATERIALIZED VIEW public.' || quote_ident(view_name);
          END IF;
        END;
        $$ LANGUAGE plpgsql;
      `
    },
    {
      name: 'get_materialized_view_stats',
      sql: `
        CREATE OR REPLACE FUNCTION get_materialized_view_stats(view_name TEXT)
        RETURNS JSONB AS $$
        DECLARE
          result JSONB;
          row_count INTEGER;
        BEGIN
          EXECUTE 'SELECT COUNT(*) FROM public.' || quote_ident(view_name) INTO row_count;
          
          result := jsonb_build_object(
            'row_count', row_count,
            'last_refresh', (
              SELECT last_refresh FROM pg_stat_user_tables 
              WHERE schemaname = 'public' AND relname = view_name
            )
          );
          
          RETURN result;
        END;
        $$ LANGUAGE plpgsql;
      `
    }
  ];

  for (const func of functions) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: func.sql });
      if (error) {
        console.error(`Error creating function ${func.name}:`, error);
      }
    } catch (e) {
      console.error(`Error creating function ${func.name}:`, e);
    }
  }
}