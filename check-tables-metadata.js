import fetch from 'node-fetch';

const projectUrl = 'https://kfdbgvyeomoewzmhkbsn.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZGJndnllb21vZXd6bWhrYnNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc4MjIxOCwiZXhwIjoyMDkyMzU4MjE4fQ.Fiv_FSMBniNAeY26aJAPvxXYQCaNlHnPr88ZaqmJFv4';

async function run() {
  console.log('Fetching OpenAPI schema using Service Role Key...');
  const response = await fetch(`${projectUrl}/rest/v1/`, {
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    }
  });

  const schema = await response.json();
  console.log('Exposed Tables:', Object.keys(schema.paths || {}).map(p => p.replace(/^\//, '')));
}

run();
