import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const WORKING_GEMINI_KEY = process.env.GEMINI_API_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log('🔗 Connecting to Supabase...');
  
  // 1. Fetch and update tenants
  console.log('\n--- 1. TENANTS TABLE ---');
  const { data: tenants, error: tenantsErr } = await supabase
    .from('tenants')
    .select('id, slug, name, gemini_api_key');

  if (tenantsErr) {
    console.error('❌ Error fetching tenants:', tenantsErr);
  } else {
    console.log(`Found ${tenants.length} tenants:`);
    for (const t of tenants) {
      console.log(`- Slug: ${t.slug}, Name: ${t.name}`);
      console.log(`  Current Key: ${t.gemini_api_key ? t.gemini_api_key.substring(0, 12) + '...' : 'None'}`);
      
      // Update key
      const { error: updateErr } = await supabase
        .from('tenants')
        .update({ gemini_api_key: WORKING_GEMINI_KEY })
        .eq('id', t.id);

      if (updateErr) {
        console.error(`  ❌ Error updating key for ${t.slug}:`, updateErr);
      } else {
        console.log(`  ✅ Updated key to: ${WORKING_GEMINI_KEY}`);
      }
    }
  }

  // 2. Fetch and update app_configs
  console.log('\n--- 2. APP_CONFIGS TABLE ---');
  const { data: configs, error: configsErr } = await supabase
    .from('app_configs')
    .select('config_key, config_value');

  if (configsErr) {
    console.warn('⚠️ config_configs table error (may not exist in this DB):', configsErr.message);
  } else {
    console.log(`Found ${configs.length} config entries:`);
    for (const c of configs) {
      console.log(`- Key: ${c.config_key}, Value: ${c.config_value ? c.config_value.substring(0, 12) + '...' : 'None'}`);
      if (c.config_key === 'GEMINI_API_KEY') {
        const { error: updateConfigErr } = await supabase
          .from('app_configs')
          .update({ config_value: WORKING_GEMINI_KEY })
          .eq('config_key', 'GEMINI_API_KEY');
        if (updateConfigErr) {
          console.error('  ❌ Error updating app_configs key:', updateConfigErr);
        } else {
          console.log(`  ✅ Updated app_configs key to: ${WORKING_GEMINI_KEY}`);
        }
      }
    }
  }
}

run();
