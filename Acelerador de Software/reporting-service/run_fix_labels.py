import psycopg2
import sys

# Datos de conexión desde appsettings.json
params = {
    "host": "db.kfdbgvyeomoewzmhkbsn.supabase.co",
    "port": 5432,
    "database": "postgres",
    "user": "postgres",
    "password": "Supabase_2026!",
    "sslmode": "require"
}

def run_fix():
    print("[FIX] Iniciando inyeccion de etiquetas profesionales en Supabase...")
    try:
        conn = psycopg2.connect(**params)
        cur = conn.cursor()
        
        with open('fix_labels_v3.sql', 'r', encoding='utf-8') as f:
            sql = f.read()
            cur.execute(sql)
            conn.commit()
        
        print("[SUCCESS] Datos de PARTE y DIBUJO actualizados correctamente.")
        
        # Mostrar una muestra de los cambios
        cur.execute("SELECT id, numero_parte, dibujo, revision FROM viajeros LIMIT 5;")
        rows = cur.fetchall()
        print("\n[INFO] Muestra de datos actualizados:")
        print("-" * 60)
        print(f"{'JobID':<15} | {'Parte':<15} | {'Dibujo':<15} | {'Rev'}")
        print("-" * 60)
        for r in rows:
            print(f"{str(r[0]):<15} | {str(r[1]):<15} | {str(r[2]):<15} | {str(r[3])}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"[ERROR] Fallo la inyeccion: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_fix()
