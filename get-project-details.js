import fetch from 'node-fetch';

const projectRef = 'kfdbgvyeomoewzmhkbsn';
const token = 'sbp_a01cded7bbc34829760c4c75e6ca3591b9e4389e';

async function run() {
  console.log('Obteniendo detalles del proyecto de Supabase...');
  const url = `https://api.supabase.com/v1/projects/${projectRef}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  console.log('Project details:', JSON.stringify(data, null, 2));
}

run();
