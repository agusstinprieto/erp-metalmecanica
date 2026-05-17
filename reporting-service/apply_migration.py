import psycopg2

conn_str = "Host=[2600:1f18:2e13:9d5a:c773:3b0e:e3c:52f3];Port=5432;Database=postgres;Username=postgres;Password=Supabase_2026!;SslMode=Require"

# Convert npgsql string to psycopg2
# Note: psycopg2 needs the brackets removed or handled differently for IPv6
params = {
    "host": "2600:1f18:2e13:9d5a:c773:3b0e:e3c:52f3",
    "port": 5432,
    "database": "postgres",
    "user": "postgres",
    "password": "Supabase_2026!",
    "sslmode": "require"
}

try:
    conn = psycopg2.connect(**params)
    cur = conn.cursor()
    
    with open('update_schema_v2.sql', 'r') as f:
        sql = f.read()
        cur.execute(sql)
        conn.commit()
    
    print("Schema updated successfully")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
