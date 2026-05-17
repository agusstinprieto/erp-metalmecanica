import psycopg2
import sys

# Datos de conexión
params = {
    "host": "db.kfdbgvyeomoewzmhkbsn.supabase.co",
    "port": 5432,
    "database": "postgres",
    "user": "postgres",
    "password": "Supabase_2026!",
    "sslmode": "require"
}

def run_stagger():
    print("[DATE_FIX] Iniciando escalonamiento de fechas en Supabase...")
    try:
        conn = psycopg2.connect(**params)
        cur = conn.cursor()
        
        with open('stagger_dates_v4.sql', 'r', encoding='utf-8') as f:
            sql = f.read()
            cur.execute(sql)
            conn.commit()
        
        print("[SUCCESS] Fechas de entrega escalonadas correctamente.")
        
        # Muestra de resultados
        cur.execute("SELECT id, fecha_orden::DATE, fecha_entrega::DATE FROM viajeros ORDER BY fecha_entrega ASC LIMIT 10;")
        rows = cur.fetchall()
        print("\n[INFO] Calendario de Produccion (Proximos Envios):")
        print("-" * 60)
        print(f"{'JobID':<15} | {'F. Orden':<15} | {'F. Entrega'}")
        print("-" * 60)
        for r in rows:
            print(f"{str(r[0]):<15} | {str(r[1]):<15} | {str(r[2])}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"[ERROR] Fallo el escalonamiento: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_stagger()
