import pg from 'pg';
const { Client } = pg;

const configs = [
  {
    name: 'Direct host port 5432 (SSL)',
    connectionString: 'postgresql://postgres:Supabase_2026%21@db.kfdbgvyeomoewzmhkbsn.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  },
  {
    name: 'Direct host port 5432 (no SSL)',
    connectionString: 'postgresql://postgres:Supabase_2026%21@db.kfdbgvyeomoewzmhkbsn.supabase.co:5432/postgres'
  }
];

async function run() {
  for (const item of configs) {
    console.log(`Probando: ${item.name}...`);
    const client = new Client({
      connectionString: item.connectionString,
      ssl: item.ssl
    });
    try {
      // Set connection timeout to 5 seconds
      const connectPromise = client.connect();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000));
      await Promise.race([connectPromise, timeoutPromise]);
      
      console.log(`¡CONEXIÓN EXITOSA con ${item.name}!`);
      
      // Eliminar la migración conflictiva
      console.log('Eliminando la migración version 20260425 de schema_migrations...');
      const deleteRes = await client.query("DELETE FROM supabase_migrations.schema_migrations WHERE version = '20260425'");
      console.log('Filas eliminadas:', deleteRes.rowCount);

      // Listar las versiones para verificar
      const listRes = await client.query('SELECT version FROM supabase_migrations.schema_migrations ORDER BY version ASC');
      console.log('Versiones remótamente registradas ahora:', listRes.rows.map(r => r.version));
      
      await client.end();
      return;
    } catch (err) {
      console.error(`Error en ${item.name}:`, err.message || err);
      try { await client.end(); } catch (e) {}
    }
    console.log('-----------------------------------------');
  }
}

run();
