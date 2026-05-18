import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kfdbgvyeomoewzmhkbsn.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZGJndnllb21vZXd6bWhrYnNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc4MjIxOCwiZXhwIjoyMDkyMzU4MjE4fQ.Fiv_FSMBniNAeY26aJAPvxXYQCaNlHnPr88ZaqmJFv4';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log('🔍 Listing tables in public schema...');
  const { data, error } = await supabase.rpc('get_tables');
  
  if (error) {
    console.log('⚠️ RPC get_tables failed, attempting raw query...');
    // If RPC is not available, we can execute a simple SELECT on pg_tables
    // Wait, PostgREST doesn't let you query pg_tables directly unless there is an RPC.
    // Let's try querying standard tables to see which ones respond with 404 or success
    const tables = [
      'tenants', 'profiles', 'ordenes_trabajo', 'work_orders', 
      'nominas', 'payrolls', 'empleados', 'employees',
      'materiales', 'suministros', 'materials', 'clientes', 'customers'
    ];
    
    for (const t of tables) {
      const { error: err } = await supabase.from(t).select('count', { count: 'exact', head: true });
      if (err) {
        console.log(`- Table [${t}]: ❌ Error / Not Found (${err.message})`);
      } else {
        console.log(`- Table [${t}]: ✅ Available`);
      }
    }
  } else {
    console.log('Tables:', data);
  }
}

run();
