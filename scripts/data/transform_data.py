# ==============================================================================
# GLOBALMARKET ANALYTICS - 
# ==============================================================================
# @description  ...
# @context      ... 
# @author       Equipo
# ==============================================================================

import pandas as pd
import json
from datetime import datetime
import random
import re 

# ======================================================
# CONFIGURACIÓN Y LECTURA
# ======================================================
INPUT_CSV = '../../data/raw/amazon_sales_data.csv'
OUTPUT_DIR = '../../data/processed/'

print(f"Leyendo dataset desde: {INPUT_CSV}")

# Leer el CSV con manejo de errores de codificación y líneas
try:
    df = pd.read_csv(INPUT_CSV, on_bad_lines='skip')
except Exception as e:
    # Fallback para errores comunes de encoding en Windows
    df = pd.read_csv(INPUT_CSV, encoding='latin-1', on_bad_lines='skip')

# ======================================================
# FUNCIONES DE LIMPIEZA (SANITIZACIÓN)
# ======================================================
def clean_currency(value):
    """Limpia strings de moneda y los convierte a float. Evita negativos."""
    if pd.isna(value): return 0.0
    # Remover todo lo que no sea dígito o punto
    clean_str = re.sub(r'[^\d.]', '', str(value))
    try:
        val = float(clean_str)
        return max(0.0, val) # Asegurar que no sea negativo
    except ValueError:
        return 0.0

def clean_int(value):
    """Limpia strings con comas y los convierte a int"""
    if pd.isna(value): return 0
    clean_str = re.sub(r'[^\d]', '', str(value))
    try:
        return int(clean_str)
    except ValueError:
        return 0

def sanitize_user_name(raw_name):
    """
    Regla de Negocio: El nombre debe tener al menos 2 caracteres válidos.
    Si el nombre es basura (ej: '*', 'A', '123', ''), devuelve un default.
    """
    if pd.isna(raw_name):
        return "Amazon Customer"
    
    clean_name = str(raw_name).strip()
    
    # Validar longitud mínima (schema requiere minLength: 2)
    if len(clean_name) < 2:
        return "Amazon Customer"
    
    # Validar que contenga al menos una letra (evitar nombres como "123" o "***")
    if not re.search(r'[a-zA-Z]', clean_name):
        return "Amazon Customer"
        
    return clean_name

# ======================================================
# 1. TRANSFORMAR PRODUCTOS
# ======================================================
def transform_products(df):
    products = []
    # Agrupar por product_id para evitar duplicados
    grouped = df.groupby('product_id').first().reset_index()
    
    for _, row in grouped.iterrows():
        try:
            # Procesar categorías
            cat_str = str(row.get('category', 'Uncategorized'))
            categories = cat_str.split('|')
            
            # Limpieza precios
            discounted = clean_currency(row.get('discounted_price', 0))
            actual = clean_currency(row.get('actual_price', 0))
            
            # Limpieza porcentaje
            try:
                disc_pct = float(str(row.get('discount_percentage', '0')).replace('%', ''))
            except (ValueError, AttributeError):
                disc_pct = 0.0

            # Limpieza rating (El '|' causaba problemas en tu CSV original)
            try:
                raw_rating = str(row.get('rating', '0')).replace('|', '').strip()
                rating_val = float(raw_rating)
                # Clamp rating entre 0 y 5
                rating_val = max(0.0, min(5.0, rating_val))
            except ValueError:
                rating_val = 0.0

            product = {
                "product_id": str(row['product_id']),
                "name": str(row['product_name']).strip()[:500], # Truncar si es muy largo
                "category": {
                    "main": categories[0].strip() if len(categories) > 0 else "Uncategorized",
                    "sub": [c.strip() for c in categories[1:]] if len(categories) > 1 else []
                },
                "pricing": {
                    "discounted_price": discounted,
                    "actual_price": actual,
                    "discount_percentage": disc_pct,
                    "currency": "INR"
                },
                "rating": {
                    "average": rating_val,
                    "count": clean_int(row.get('rating_count', 0))
                },
                "description": str(row.get('about_product', ""))[:1000], # Limitar longitud
                "specifications": str(row.get('about_product', "")).split('|') if pd.notna(row.get('about_product')) else [],
                "images": {
                    "thumbnail": str(row.get('img_link', "")),
                    "main": str(row.get('img_link', ""))
                },
                "product_link": str(row.get('product_link', "")),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            products.append(product)
        except Exception as e:
            print(f"[WARN] Error procesando producto {row.get('product_id', 'UNKNOWN')}: {e}")
            continue
    
    return products

# ======================================================
# 2. TRANSFORMAR USUARIOS
# ======================================================
def transform_users(df):
    users = []
    user_ids_seen = set()
    
    for _, row in df.iterrows():
        if pd.notna(row['user_id']):
            user_id_list = str(row['user_id']).split(',')
            user_name_list = str(row['user_name']).split(',')
            
            for i, uid in enumerate(user_id_list):
                uid = uid.strip()
                
                # Validación estricta de ID
                if uid and uid not in user_ids_seen and len(uid) > 2:
                    user_ids_seen.add(uid)
                    
                    # --- AQUÍ ESTÁ LA MAGIA DE LA LIMPIEZA ---
                    raw_name = user_name_list[i] if i < len(user_name_list) else ""
                    final_name = sanitize_user_name(raw_name)
                    # -----------------------------------------
                    
                    user = {
                        "user_id": uid,
                        "name": final_name,
                        "email": f"{uid.lower()[:8]}@example.com", # Email sintético válido
                        "registration_date": datetime.now().isoformat(),
                        "total_reviews": random.randint(1, 50),
                        # Aseguramos que sea float para el esquema 'number'
                        "average_rating_given": float(round(random.uniform(3.0, 5.0), 1))
                    }
                    users.append(user)
    
    return users

# ======================================================
# 3. TRANSFORMAR REVIEWS (CORREGIDO)
# ======================================================
def transform_reviews(df):
    reviews = []
    seen_review_ids = set() # SET PARA EVITAR DUPLICADOS
    
    for _, row in df.iterrows():
        if pd.notna(row['review_id']):
            review_ids = str(row['review_id']).split(',')
            review_titles = str(row['review_title']).split(',')
            review_contents = str(row['review_content']).split(',')
            user_ids = str(row['user_id']).split(',')
            
            for i, rid in enumerate(review_ids):
                rid = rid.strip()
                
                # VALIDACIÓN: Si hay ID y NO lo hemos visto antes
                if rid and rid not in seen_review_ids:
                    seen_review_ids.add(rid) # Marcar como visto
                    
                    # Asignar usuario seguro
                    u_id = user_ids[i].strip() if i < len(user_ids) else "ANONYMOUS"
                    if len(u_id) < 3: u_id = "ANONYMOUS"

                    review = {
                        "review_id": rid,
                        "product_id": str(row['product_id']),
                        "user_id": u_id,
                        "title": review_titles[i].strip()[:200] if i < len(review_titles) else "Review",
                        "content": review_contents[i].strip()[:5000] if i < len(review_contents) else "",
                        "rating": int(random.randint(3, 5)),
                        "helpful_count": int(random.randint(0, 100)),
                        "verified_purchase": random.choice([True, False]),
                        "review_date": datetime.now().isoformat(),
                        "images": []
                    }
                    reviews.append(review)
    
    return reviews

# ======================================================
# 4. GENERAR VENTAS (SIMULADAS)
# ======================================================
def generate_sales(df, num_sales=1000):
    sales = []
    cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune']
    
    # Pre-calcular precios limpios
    df['clean_price'] = df['discounted_price'].apply(clean_currency)
    valid_products = df[df['clean_price'] > 0] # Solo usar productos con precio
    
    for i in range(num_sales):
        try:
            if valid_products.empty: break
            
            product = valid_products.sample(1).iloc[0]
            price = float(product['clean_price'])
            
            quantity = random.randint(1, 5)
            
            # Obtener usuario
            u_ids = str(product['user_id']).split(',')
            u_id = u_ids[0].strip() if len(u_ids) > 0 and len(u_ids[0].strip()) > 2 else "GUEST_USER"

            sale = {
                "sale_id": f"SALE-2024-{str(i+1).zfill(6)}", # Formato Regex ^SALE-\d{4}-\d{6}$
                "product_id": str(product['product_id']),
                "user_id": u_id,
                "quantity": int(quantity),
                "total_amount": round(price * quantity, 2),
                "sale_date": (datetime.now() - pd.Timedelta(days=random.randint(0, 365))).isoformat(),
                "payment_method": random.choice(['credit_card', 'debit_card', 'upi', 'cash_on_delivery']),
                "status": random.choice(['completed', 'pending', 'shipped', 'delivered']),
                "shipping": {
                    "city": random.choice(cities),
                    "country": "India",
                    "postal_code": str(random.randint(100000, 999999))
                }
            }
            sales.append(sale)
        except Exception as e:
            continue
    
    return sales

# ======================================================
# EJECUCIÓN PRINCIPAL
# ======================================================
print("Transformando productos...")
products = transform_products(df)

print("Transformando usuarios (con limpieza de nombres)...")
users = transform_users(df)

print("Transformando reviews...")
reviews = transform_reviews(df)

print("Generando ventas...")
sales = generate_sales(df, 1000)

# ======================================================
# GUARDAR ARCHIVOS JSON
# ======================================================
def save_json(filename, data):
    path = OUTPUT_DIR + filename
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f" [OK] Guardado: {path} ({len(data)} registros)")

save_json('products.json', products)
save_json('users.json', users)
save_json('reviews.json', reviews)
save_json('sales.json', sales)

print("\n PROCESO COMPLETADO.")