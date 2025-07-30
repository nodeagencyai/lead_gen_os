import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const SupabaseDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('🔍 Testing Supabase connection...');
        
        // Test basic connection
        const { data: connectionTest, error: connectionError } = await supabase
          .from('Apollo')
          .select('count', { count: 'exact', head: true });

        console.log('Connection test result:', { connectionTest, connectionError });

        // Test simple select
        const { data: simpleSelect, error: selectError } = await supabase
          .from('Apollo')
          .select('*')
          .limit(5);

        console.log('Simple select result:', { 
          count: simpleSelect?.length, 
          data: simpleSelect, 
          error: selectError 
        });

        // Test different table names
        const tables = ['Apollo', 'apollo', 'leads', 'Leads'];
        const tableTests = {};
        
        for (const tableName of tables) {
          try {
            const { count, error } = await supabase
              .from(tableName)
              .select('*', { count: 'exact', head: true });
            
            tableTests[tableName] = { count, error: error?.message };
            console.log(`Table ${tableName} test:`, { count, error: error?.message });
          } catch (err) {
            tableTests[tableName] = { error: err instanceof Error ? err.message : 'Unknown error' };
          }
        }

        setDebugInfo({
          connectionTest: { data: connectionTest, error: connectionError?.message },
          simpleSelect: { 
            count: simpleSelect?.length || 0, 
            data: simpleSelect?.slice(0, 2) || [], 
            error: selectError?.message 
          },
          tableTests
        });

      } catch (err) {
        console.error('Debug test failed:', err);
        setDebugInfo({ error: err instanceof Error ? err.message : 'Unknown error' });
      } finally {
        setLoading(false);
      }
    };

    testConnection();
  }, []);

  if (loading) {
    return (
      <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#1a1a1a', border: '1px solid #444444' }}>
        <h3 className="text-white font-semibold mb-2">🔍 Supabase Debug Test</h3>
        <p className="text-gray-400">Testing connection...</p>
      </div>
    );
  }

  return (
    <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#1a1a1a', border: '1px solid #444444' }}>
      <h3 className="text-white font-semibold mb-2">🔍 Supabase Debug Results</h3>
      <pre className="text-xs text-gray-300 overflow-x-auto">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
};

export default SupabaseDebug;