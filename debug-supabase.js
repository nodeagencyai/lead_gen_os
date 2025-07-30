import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://efpwtvlgnftlabmliguf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcHd0dmxnbmZ0bGFibWxpZ3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODYyNjcsImV4cCI6MjA2OTM2MjI2N30.yrN4CZESXKCdiBnOImC5ia4iPkM15z7BzmYpu_RtpHI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSupabase() {
  console.log('🔍 Testing Supabase connection and tables...');
  
  // Test different table names
  const tableNames = ['Apollo', 'apollo', 'leads', 'Leads', 'apollo_leads', 'Apollo_Leads'];
  
  for (const tableName of tableNames) {
    try {
      console.log(`\n📊 Testing table: ${tableName}`);
      
      // Test count query
      const { count, error: countError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
        
      if (countError) {
        console.log(`❌ ${tableName} - Count Error:`, countError.message);
      } else {
        console.log(`✅ ${tableName} - Count:`, count);
      }
      
      // If count worked, try to get actual data
      if (!countError && count > 0) {
        const { data, error: dataError } = await supabase
          .from(tableName)
          .select('*')
          .limit(2);
          
        if (dataError) {
          console.log(`❌ ${tableName} - Data Error:`, dataError.message);
        } else {
          console.log(`✅ ${tableName} - Sample Data:`, data);
          
          // Show column structure
          if (data && data.length > 0) {
            console.log(`📋 ${tableName} - Columns:`, Object.keys(data[0]));
          }
        }
      }
      
    } catch (err) {
      console.log(`❌ ${tableName} - Exception:`, err.message);
    }
  }
  
  // Also test getting all table names
  try {
    console.log('\n🗂️ Attempting to get table list...');
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
      
    if (error) {
      console.log('❌ Could not get table list:', error.message);
    } else {
      console.log('✅ Available tables:', tables?.map(t => t.table_name) || []);
    }
  } catch (err) {
    console.log('❌ Exception getting table list:', err.message);
  }
}

debugSupabase().catch(console.error);