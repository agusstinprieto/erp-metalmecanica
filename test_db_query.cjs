const { createClient } = require('@supabase/supabase-js');
const url = 'https://kfdbgvyeomoewzmhkbsn.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZGJndnllb21vZXd6bWhrYnNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc4MjIxOCwiZXhwIjoyMDkyMzU4MjE4fQ.Fiv_FSMBniNAeY26aJAPvxXYQCaNlHnPr88ZaqmJFv4';

const supabase = createClient(url, key);

async function check() {
  console.log('🔄 Querying tables...');
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('id, email, role, tenant_id');
  if (profErr) {
    console.error('❌ Error fetching profiles:', profErr);
  } else {
    console.log(`✅ Profiles in DB (${profiles ? profiles.length : 0}):`);
    if (profiles) {
      profiles.forEach(p => console.log(`  - ${p.email} | Role: ${p.role} | Tenant: ${p.tenant_id} | UUID: ${p.id}`));
    }
  }

  const { data: empleados, error: empErr } = await supabase.from('empleados').select('id, first_name, last_name, tenant_id');
  if (empErr) {
    console.error('❌ Error fetching empleados:', empErr);
  } else {
    console.log(`✅ Employees in DB (${empleados ? empleados.length : 0}):`);
    if (empleados) {
      empleados.forEach(e => console.log(`  - ${e.first_name} ${e.last_name} | Tenant: ${e.tenant_id} | UUID: ${e.id}`));
    }
  }
}

check();
