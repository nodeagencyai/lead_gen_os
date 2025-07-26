import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { type, jobId, data, status, progress, error } = await req.json();

    switch (type) {
      case 'job_progress':
        await supabaseClient
          .from('automation_jobs')
          .update({
            progress: progress,
            status: status,
            error_message: error,
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
        break;

      case 'leads_scraped':
        // Insert scraped leads
        if (data.leads && data.leads.length > 0) {
          const { data: job } = await supabaseClient
            .from('automation_jobs')
            .select('campaign_id, user_id')
            .eq('id', jobId)
            .single();

          if (job) {
            // Insert leads
            const leadsToInsert = data.leads.map((lead: any) => ({
              user_id: job.user_id,
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              company: lead.company,
              position: lead.position,
              linkedin_url: lead.linkedin_url,
              source: lead.source,
              raw_data: lead
            }));

            const { data: insertedLeads } = await supabaseClient
              .from('leads')
              .insert(leadsToInsert)
              .select();

            // Link leads to campaign
            if (insertedLeads) {
              const campaignLeads = insertedLeads.map(lead => ({
                campaign_id: job.campaign_id,
                lead_id: lead.id
              }));

              await supabaseClient
                .from('campaign_leads')
                .insert(campaignLeads);
            }
          }
        }

        // Update job status
        await supabaseClient
          .from('automation_jobs')
          .update({
            status: 'completed',
            progress: 100,
            result_data: { leads_count: data.leads?.length || 0 },
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
        break;

      case 'email_sent':
        // Update campaign lead status
        await supabaseClient
          .from('campaign_leads')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('campaign_id', data.campaignId)
          .eq('lead_id', data.leadId);

        // Log activity
        await supabaseClient
          .from('lead_activities')
          .insert({
            lead_id: data.leadId,
            campaign_id: data.campaignId,
            activity_type: 'email_sent',
            details: data
          });
        break;

      case 'email_opened':
        await supabaseClient
          .from('campaign_leads')
          .update({
            status: 'opened',
            opened_at: new Date().toISOString()
          })
          .eq('campaign_id', data.campaignId)
          .eq('lead_id', data.leadId);

        await supabaseClient
          .from('lead_activities')
          .insert({
            lead_id: data.leadId,
            campaign_id: data.campaignId,
            activity_type: 'email_opened',
            details: data
          });
        break;

      case 'email_replied':
        await supabaseClient
          .from('campaign_leads')
          .update({
            status: 'replied',
            replied_at: new Date().toISOString()
          })
          .eq('campaign_id', data.campaignId)
          .eq('lead_id', data.leadId);

        await supabaseClient
          .from('leads')
          .update({ status: 'replied' })
          .eq('id', data.leadId);

        await supabaseClient
          .from('lead_activities')
          .insert({
            lead_id: data.leadId,
            campaign_id: data.campaignId,
            activity_type: 'email_replied',
            details: data
          });
        break;

      default:
        throw new Error(`Unknown webhook type: ${type}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});