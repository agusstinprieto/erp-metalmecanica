import psycopg2
import os

# Database connection parameters
params = {
    "host": "2600:1f18:2e13:9d5a:c773:3b0e:e3c:52f3",
    "port": 5432,
    "database": "postgres",
    "user": "postgres",
    "password": "Supabase_2026!",
    "sslmode": "require"
}

migrations = [
    'update_schema_v3.sql',
    'fix_data_v1.sql',
    'fix_data_v2.sql'
]

def run_migrations():
    try:
        conn = psycopg2.connect(**params)
        cur = conn.cursor()
        
        for migration in migrations:
            print(f"Running {migration}...")
            file_path = os.path.join(os.path.dirname(__file__), migration)
            with open(file_path, 'r', encoding='utf-8') as f:
                sql = f.read()
                # Split SQL into individual statements if necessary, 
                # but usually psycopg2 handles multiple statements in one execute() 
                # if they are separated by semicolons and not returning data.
                cur.execute(sql)
                conn.commit()
            print(f"DONE: {migration} executed successfully.")
        
        cur.close()
        conn.close()
        print("\nAll migrations applied successfully!")
        
    except Exception as e:
        print(f"ERROR applying migration: {e}")

if __name__ == "__main__":
    run_migrations()
