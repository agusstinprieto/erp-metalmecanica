import pg from 'pg';
const { Client } = pg;

// Use regional pooler with the correct password "Supabase_2026%21" and correct user
const connectionString = 'postgresql://postgres.kfdbgvyeomoewzmhkbsn:Supabase_2026%21@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

async function run() {
  console.log('Conectando a la base de datos remota con AWS pooler y contraseña correcta...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log('¡CONEXIÓN EXITOSA!');
    
    // Eliminar la migración conflictiva
    console.log('Eliminando la migración version 20260425 de schema_migrations...');
    const deleteRes = await client.query("DELETE FROM supabase_migrations.schema_migrations WHERE version = '20260425'");
    console.log('Filas eliminadas:', deleteRes.rowCount);

    // Listar las versiones para verificar
    const listRes = await client.query('SELECT version FROM supabase_migrations.schema_migrations ORDER BY version ASC');
    console.log('Versiones remótamente registradas ahora:', listRes.rows.map(r => r.version));

  } catch (err) {
    console.error('Error de conexión o consulta:', err);
  } finally {
    await client.end();
  }
}

run();
