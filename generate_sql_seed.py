import pandas as pd
import math
import os

def is_nan(val):
    if isinstance(val, float) and math.isnan(val):
        return True
    return False

def clean_val(val):
    if is_nan(val): return None
    return val

def safe_float(val):
    if is_nan(val): return 'NULL'
    try:
        return str(float(val))
    except:
        return 'NULL'

def safe_str(val):
    v = clean_val(val)
    if v is None: return 'NULL'
    s = str(v).replace("'", "''")
    return f"'{s}'"

print("Leyendo Excel...")
xl = pd.ExcelFile('PLANTILLA DE COSTOS (MCVILL-MARZO-2026).xlsx')
df_mat = pd.read_excel(xl, sheet_name='MATERIALES 1Q 2026', header=1)

sql_statements = []
sql_statements.append("-- ==========================================")
sql_statements.append("-- SEED DATA: MATERIALES")
sql_statements.append("-- ==========================================")
sql_statements.append("TRUNCATE TABLE materiales CASCADE;")
sql_statements.append("INSERT INTO materiales (descripcion_mp, grado, espesor, ancho, largo, peso_mp, origen, ton_min, tiempo_entrega, precio_mp_usd_ton, precio_limpieza_usd_ton, precio_flete_usd_ton, precio_total_usd_ton, comentarios) VALUES")

values_mat = []
for _, row in df_mat.iterrows():
    desc = clean_val(row.get('Descripcion MP'))
    if desc is None or str(desc).strip() == '' or str(desc).strip() == 'Descripcion MP':
        continue
    
    p_mp = safe_float(row.get('PRECIO MP USD/TON'))
    p_mp = '0' if p_mp == 'NULL' else p_mp
    
    p_limp = safe_float(row.get('PRECIO LIMPIEZA USD/TON'))
    p_limp = '0' if p_limp == 'NULL' else p_limp
    
    p_flete = safe_float(row.get('PRECIO FLETE USD/TON'))
    p_flete = '0' if p_flete == 'NULL' else p_flete
    
    p_total = safe_float(row.get('PRECIO TOTAL USD/TON'))
    p_total = '0' if p_total == 'NULL' else p_total
    
    v = f"({safe_str(desc)}, {safe_str(row.get('Grado'))}, {safe_float(row.get('Espesor'))}, {safe_float(row.get('Ancho'))}, {safe_float(row.get('Largo'))}, {safe_float(row.get('Peso MP'))}, {safe_str(row.get('ORIGEN'))}, {safe_str(row.get('TON. MIN'))}, {safe_str(row.get('T.E.'))}, {p_mp}, {p_limp}, {p_flete}, {p_total}, {safe_str(row.get('Comentarios'))})"
    values_mat.append(v)

sql_statements.append(",\n".join(values_mat) + ";\n")

df_ilc = pd.read_excel(xl, sheet_name='ILC (2025)')
values_ilc = []
for _, row in df_ilc.iterrows():
    itm_nbr = clean_val(row.get('ITM_NBR'))
    if itm_nbr is None or str(itm_nbr).strip() == '':
        continue
    
    c_cost = safe_float(row.get('COST'))
    c_cost = '0' if c_cost == 'NULL' else c_cost

    v = f"({safe_str(itm_nbr)}, {c_cost}, {safe_str(row.get('CUST_PRC'))}, {safe_float(row.get('BOX_QTY'))}, {safe_str(row.get('LC_ITM_TYP'))}, {safe_str(row.get('NOTES'))})"
    values_ilc.append(v)

CHUNK_SIZE = 10000

# Write Part 1 (Materiales + first chunk of ILC)
with open('supabase/migrations/seed_part1.sql', 'w', encoding='utf-8') as f:
    f.write("\n".join(sql_statements))
    f.write("\n-- ==========================================\n")
    f.write("-- SEED DATA: CATALOGO ILC (Part 1)\n")
    f.write("-- ==========================================\n")
    f.write("TRUNCATE TABLE catalogo_ilc CASCADE;\n")
    f.write("INSERT INTO catalogo_ilc (itm_nbr, cost, cust_prc, box_qty, lc_itm_typ, notes) VALUES\n")
    f.write(",\n".join(values_ilc[:CHUNK_SIZE]) + "\nON CONFLICT (itm_nbr) DO NOTHING;\n")

# Write subsequent parts for ILC
total_chunks = math.ceil(len(values_ilc) / CHUNK_SIZE)
for i in range(1, total_chunks):
    start_idx = i * CHUNK_SIZE
    end_idx = start_idx + CHUNK_SIZE
    chunk = values_ilc[start_idx:end_idx]
    
    with open(f'supabase/migrations/seed_part{i+1}.sql', 'w', encoding='utf-8') as f:
        f.write(f"-- SEED DATA: CATALOGO ILC (Part {i+1})\n")
        f.write("INSERT INTO catalogo_ilc (itm_nbr, cost, cust_prc, box_qty, lc_itm_typ, notes) VALUES\n")
        f.write(",\n".join(chunk) + "\nON CONFLICT (itm_nbr) DO NOTHING;\n")

print(f"SQL Scripts generados en supabase/migrations/seed_part1.sql hasta seed_part{total_chunks}.sql")
