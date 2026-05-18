import fetch from 'node-fetch'; // If node-fetch is not installed, Node 18+ has native fetch

const projectRef = 'kfdbgvyeomoewzmhkbsn';
const token = 'sbp_a01cded7bbc34829760c4c75e6ca3591b9e4389e';

async function run() {
  console.log('Llamando a la API de Supabase para ejecutar SQL remótamente...');
  const url = `https://api.supabase.com/v1/projects/${projectRef}/query`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: "DELETE FROM supabase_migrations.schema_migrations WHERE version = '20260425';"
    })
  });

  const text = await response.text();
  console.log('Status:', response.status);
  console.log('Response:', text);
}

run();
