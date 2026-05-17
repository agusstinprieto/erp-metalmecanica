import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kfdbgvyeomoewzmhkbsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZGJndnllb21vZXd6bWhrYnNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3ODIyMTgsImV4cCI6MjA5MjM1ODIxOH0.jFUjtbPOTUiNesoy6Su3k1gTDoO5tv8ZotVFw7Ffb5Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- BUSCANDO MÁQUINAS REPETIDAS ---');
  const { data, error } = await supabase
    .from('activos_maquinas')
    .select('id, codigo, nombre, modelo');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const seen = new Map();
  const toDelete = [];

  data.forEach(m => {
    // Definimos duplicado por código o por nombre si el código está vacío
    const key = (m.codigo || m.nombre).trim().toUpperCase();
    if (seen.has(key)) {
      toDelete.push(m);
      console.log(`[DUPLICADO] ${m.codigo} - ${m.nombre} (ID: ${m.id})`);
    } else {
      seen.set(key, m);
    }
  });

  if (toDelete.length === 0) {
    console.log('No se encontraron máquinas repetidas.');
  } else {
    console.log(`\nEliminando ${toDelete.length} registros duplicados...`);
    const { error: delError } = await supabase
      .from('activos_maquinas')
      .delete()
      .in('id', toDelete.map(d => d.id));

    if (delError) {
      console.error('Error al eliminar:', delError);
    } else {
      console.log('¡Duplicados eliminados exitosamente!');
    }
  }
}

run();
