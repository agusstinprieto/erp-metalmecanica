import { createClient } from '@supabase/supabase-client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Note: This script is intended to be run in a node environment where env vars are available
// Since I'm an agent, I'll try to use the supabase client from the app if possible, 
// but for a one-off script, I'll just use the values from .env if I can find them.

async function checkDuplicates() {
  // I need to find the supabase URL and KEY
  // Usually in .env or src/lib/supabase.ts
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in env');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('activos_maquinas')
    .select('id, codigo, nombre, modelo');

  if (error) {
    console.error('Error fetching machines:', error);
    return;
  }

  const seen = new Map();
  const duplicates = [];

  data.forEach(m => {
    const key = `${m.codigo}-${m.nombre}`;
    if (seen.has(key)) {
      duplicates.push(m);
    } else {
      seen.set(key, m);
    }
  });

  console.log('Total machines:', data.length);
  console.log('Duplicates found:', duplicates.length);
  
  if (duplicates.length > 0) {
    console.log('Duplicate IDs:', duplicates.map(d => d.id).join(', '));
    // Uncomment to actually delete
    /*
    const { error: delError } = await supabase
      .from('activos_maquinas')
      .delete()
      .in('id', duplicates.map(d => d.id));
    
    if (delError) console.error('Error deleting duplicates:', delError);
    else console.log('Successfully deleted duplicates');
    */
  }
}

checkDuplicates();
