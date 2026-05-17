import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

const connectionString = "postgresql://postgres:kfdbgvyeomoewzmhkbsn@db.kfdbgvyeomoewzmhkbsn.supabase.co:5432/postgres";

async function applyMigrations() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log('Connected to database');

        const migrationsDir = 'c:/Users/aguss/Downloads/IA Inteligencia Artificial/IA.AGUS/McVill/Apps para McVill/mcvill-erp/supabase/migrations';
        const files = fs.readdirSync(migrationsDir).sort();

        for (const file of files) {
            if (file.endsWith('.sql')) {
                console.log(`Applying migration: ${file}`);
                const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
                try {
                    await client.query(sql);
                    console.log(`Successfully applied: ${file}`);
                } catch (err) {
                    console.error(`Error applying ${file}:`, err.message);
                    // Continue with other migrations if it's "already exists" or similar
                    if (!err.message.includes('already exists')) {
                        // throw err; // Optional: stop on error
                    }
                }
            }
        }
    } catch (err) {
        console.error('Connection error:', err);
    } finally {
        await client.end();
    }
}

applyMigrations();
