import pandas as pd
import json
import urllib.request
import urllib.error
import math
import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv no instalado — usar variables de entorno del sistema

# Configuración de Supabase — definir en .env o variables de entorno del sistema
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise EnvironmentError(
        "Faltan SUPABASE_URL y/o SUPABASE_ANON_KEY. "
        "Crea un archivo .env con esas variables o expórtalas en tu entorno."
    )

def send_to_supabase(table, data):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            print(f"[{table}] Insertados {len(data)} registros exitosamente.")
    except urllib.error.HTTPError as e:
        print(f"Error insertando en {table}: {e.code} - {e.read().decode()}")
    except Exception as e:
        print(f"Error insertando en {table}: {str(e)}")

def is_nan(val):
    if isinstance(val, float) and math.isnan(val):
        return True
    return False

def clean_val(val):
    if is_nan(val):
        return None
    return val

print("Leyendo Excel...")
xl = pd.ExcelFile('PLANTILLA DE COSTOS (MCVILL-MARZO-2026).xlsx')

# 1. MATERIALES 1Q 2026
df_mat = pd.read_excel(xl, sheet_name='MATERIALES 1Q 2026', header=1)
mat_payload = []

def safe_float(val):
    if is_nan(val): return None
    try:
        return float(val)
    except:
        return None

for _, row in df_mat.iterrows():
    # Saltamos si "Descripcion MP" es NaN o vacío o igual a "Descripcion MP"
    desc = clean_val(row.get('Descripcion MP'))
    if desc is None or str(desc).strip() == '' or str(desc).strip() == 'Descripcion MP':
        continue
        
    mat_payload.append({
        "descripcion_mp": str(desc),
        "grado": str(clean_val(row.get('Grado'))) if clean_val(row.get('Grado')) else None,
        "espesor": safe_float(row.get('Espesor')),
        "ancho": safe_float(row.get('Ancho')),
        "largo": safe_float(row.get('Largo')),
        "peso_mp": safe_float(row.get('Peso MP')),
        "origen": str(clean_val(row.get('ORIGEN'))) if clean_val(row.get('ORIGEN')) else None,
        "ton_min": str(clean_val(row.get('TON. MIN'))) if clean_val(row.get('TON. MIN')) else None,
        "tiempo_entrega": str(clean_val(row.get('T.E.'))) if clean_val(row.get('T.E.')) else None,
        "precio_mp_usd_ton": safe_float(row.get('PRECIO MP USD/TON')) or 0,
        "precio_limpieza_usd_ton": safe_float(row.get('PRECIO LIMPIEZA USD/TON')) or 0,
        "precio_flete_usd_ton": safe_float(row.get('PRECIO FLETE USD/TON')) or 0,
        "precio_total_usd_ton": safe_float(row.get('PRECIO TOTAL USD/TON')) or 0,
        "comentarios": str(clean_val(row.get('Comentarios'))) if clean_val(row.get('Comentarios')) else None
    })

# Inyectar en batches de 50
if len(mat_payload) > 0:
    for i in range(0, len(mat_payload), 50):
        send_to_supabase('materiales', mat_payload[i:i+50])

# 2. ILC (2025)
df_ilc = pd.read_excel(xl, sheet_name='ILC (2025)')
ilc_payload = []

for _, row in df_ilc.iterrows():
    itm_nbr = clean_val(row.get('ITM_NBR'))
    if itm_nbr is None or str(itm_nbr).strip() == '':
        continue
        
    ilc_payload.append({
        "itm_nbr": str(itm_nbr),
        "cost": float(row.get('COST')) if not is_nan(row.get('COST')) else 0,
        "cust_prc": str(clean_val(row.get('CUST_PRC'))) if clean_val(row.get('CUST_PRC')) else None,
        "box_qty": float(row.get('BOX_QTY')) if not is_nan(row.get('BOX_QTY')) else None,
        "lc_itm_typ": str(clean_val(row.get('LC_ITM_TYP'))) if clean_val(row.get('LC_ITM_TYP')) else None,
        "notes": str(clean_val(row.get('NOTES'))) if clean_val(row.get('NOTES')) else None
    })

if len(ilc_payload) > 0:
    for i in range(0, len(ilc_payload), 50):
        send_to_supabase('catalogo_ilc', ilc_payload[i:i+50])

print("Inyección completada.")
