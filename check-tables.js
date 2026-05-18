import fetch from 'node-fetch';

const projectUrl = 'https://kfdbgvyeomoewzmhkbsn.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZGJndnllb21vZXd6bWhrYnNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3ODIyMTgsImV4cCI6MjA5MjM1ODIxOH0.jFUjtbPOTUiNesoy6Su3k1gTDoO5tv8ZotVFw7Ffb5Q';

async function run() {
  console.log('Fetching OpenAPI schema from PostgREST...');
  const response = await fetch(`${projectUrl}/rest/v1/`, {
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`
    }
  });

  const schema = await response.json();
  console.log('Exposed Tables:', Object.keys(schema.paths || {}).map(p => p.replace(/^\//, '')));
}

run();
