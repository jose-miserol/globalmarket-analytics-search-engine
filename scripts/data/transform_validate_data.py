import json
import re
import os
import sys

# ==============================================================================
# CONFIGURACIÓN
# ==============================================================================

DATA_DIR = '../../data/processed/'

FILES = {
    'products': 'products.json',
    'users': 'users.json',
    'reviews': 'reviews.json',
    'sales': 'sales.json'
}

# Definición de Regex extraídos de validation.js
REGEX_PATTERNS = {
    'email': re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"),
    'url': re.compile(r"^https?://"),
    'sale_id': re.compile(r"^SALE-\d{4}-\d{6}$")
}

# Listas permitidas (Enums)
ENUMS = {
    'payment_method': ["credit_card", "debit_card", "upi", "cash_on_delivery", "net_banking"],
    'sale_status': ["pending", "processing", "shipped", "delivered", "completed", "cancelled"],
    'currency': ["INR", "USD", "EUR", "GBP"]
}

class Color:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    CYAN = '\033[96m'
    RESET = '\033[0m'

def load_json(filename):
    path = os.path.join(DATA_DIR, filename)
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"📦 {filename}: Cargados {len(data)} registros.")
            return data
    except FileNotFoundError:
        print(f"{Color.RED} [Error]: No se encontró el archivo {path}{Color.RESET}")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"{Color.RED} [Error]: El archivo {path} no es un JSON válido{Color.RESET}")
        sys.exit(1)

def validate_schema_products(products):
    print(f"\n{Color.CYAN}--- Validando Esquema: Products ---{Color.RESET}")
    errors = 0
    ids = set()
    
    for p in products:
        pid = p.get('product_id')
        
        # 1. Unicidad de ID
        if pid in ids:
            print(f"{Color.RED}   [DUPLICADO] Product ID duplicado: {pid}{Color.RESET}")
            errors += 1
        ids.add(pid)

        # 2. Precios negativos
        pricing = p.get('pricing', {})
        if pricing.get('discounted_price', -1) < 0 or pricing.get('actual_price', -1) < 0:
            print(f"{Color.RED}   [PRECIO] Precio negativo en producto: {pid}{Color.RESET}")
            errors += 1
        
        # 3. Rating rango
        rating = p.get('rating', {}).get('average', 0)
        if not (0 <= rating <= 5):
            print(f"{Color.RED}   [RATING] Rating fuera de rango ({rating}) en: {pid}{Color.RESET}")
            errors += 1

    if errors == 0: print(f"{Color.GREEN}✔ Esquema de productos correcto.{Color.RESET}")
    return ids, errors

def validate_schema_users(users):
    print(f"\n{Color.CYAN}--- Validando Esquema: Users ---{Color.RESET}")
    errors = 0
    ids = set()
    
    for u in users:
        uid = u.get('user_id')
        email = u.get('email', '')
        
        # 1. Unicidad
        if uid in ids:
            print(f"{Color.RED}   [DUPLICADO] User ID duplicado: {uid}{Color.RESET}")
            errors += 1
        ids.add(uid)
        
        # 2. Regex Email
        if not REGEX_PATTERNS['email'].match(email):
            print(f"{Color.RED}   [EMAIL] Formato inválido ({email}) en usuario: {uid}{Color.RESET}")
            errors += 1

    if errors == 0: print(f"{Color.GREEN}✔ Esquema de usuarios correcto.{Color.RESET}")
    return ids, errors

def validate_integrity_reviews(reviews, product_ids, user_ids):
    print(f"\n{Color.CYAN}--- Validando Integridad: Reviews ---{Color.RESET}")
    errors = 0
    orphans = 0
    
    for r in reviews:
        rid = r.get('review_id')
        pid = r.get('product_id')
        uid = r.get('user_id')
        rating = r.get('rating')

        # 1. Validación Schema (Rating 1-5 entero)
        if not isinstance(rating, int) or not (1 <= rating <= 5):
            print(f"{Color.RED}   [RATING] Review {rid} tiene rating inválido: {rating}{Color.RESET}")
            errors += 1

        # 2. Integridad Referencial (FK -> Products)
        if pid not in product_ids:
            # Solo reportar los primeros 5 para no saturar consola
            if orphans < 5: 
                print(f"{Color.YELLOW}   [HUÉRFANO] Review {rid} apunta a producto inexistente: {pid}{Color.RESET}")
            orphans += 1

        # 3. Integridad Referencial (FK -> Users)
        # Nota: Si tu script de transformación usa 'ANONYMOUS' o 'GUEST', deben estar en users.json
        # O debemos excluirlos de esta validación. Asumiremos que deben existir.
        if uid not in user_ids:
            if orphans < 5:
                print(f"{Color.YELLOW}   [HUÉRFANO] Review {rid} apunta a usuario inexistente: {uid}{Color.RESET}")
            orphans += 1

    if orphans > 0:
        print(f"{Color.RED} TOTAL DATOS SUELTOS (HUÉRFANOS): {orphans}{Color.RESET}")
    elif errors == 0:
        print(f"{Color.GREEN}✔ Relaciones y esquema de reviews correctos.{Color.RESET}")
    
    return errors + orphans

def validate_integrity_sales(sales, product_ids, user_ids):
    print(f"\n{Color.CYAN}--- Validando Integridad: Sales ---{Color.RESET}")
    errors = 0
    orphans = 0
    
    for s in sales:
        sid = s.get('sale_id')
        pid = s.get('product_id')
        uid = s.get('user_id')
        
        # 1. Regex Sale ID
        if not REGEX_PATTERNS['sale_id'].match(sid):
            print(f"{Color.RED}   [FORMATO] Sale ID inválido: {sid}{Color.RESET}")
            errors += 1

        # 2. Enums
        if s.get('payment_method') not in ENUMS['payment_method']:
            print(f"{Color.RED}   [ENUM] Método de pago desconocido en {sid}: {s.get('payment_method')}{Color.RESET}")
            errors += 1
        
        if s.get('status') not in ENUMS['sale_status']:
            print(f"{Color.RED}   [ENUM] Estado desconocido en {sid}: {s.get('status')}{Color.RESET}")
            errors += 1

        # 3. Integridad (FK -> Products)
        if pid not in product_ids:
            if orphans < 5: print(f"{Color.YELLOW}   [HUÉRFANO] Venta {sid} de producto desconocido: {pid}{Color.RESET}")
            orphans += 1
            
        # 4. Integridad (FK -> Users)
        if uid not in user_ids:
            # Nota: Si usas GUEST_USER en sales, asegúrate de que exista en users.json o ignóralo aquí
            if uid != "GUEST_USER" and uid not in user_ids: 
                if orphans < 5: print(f"{Color.YELLOW}   [HUÉRFANO] Venta {sid} de usuario desconocido: {uid}{Color.RESET}")
                orphans += 1

    if orphans > 0:
        print(f"{Color.RED} TOTAL DATOS SUELTOS (HUÉRFANOS): {orphans}{Color.RESET}")
    elif errors == 0:
        print(f"{Color.GREEN}✔ Relaciones y esquema de ventas correctos.{Color.RESET}")

    return errors + orphans

print("==================================================")
print(" INICIANDO VALIDACIÓN DE INTEGRIDAD DE DATOS")
print("==================================================")

# 1. Cargar datos
products_data = load_json(FILES['products'])
users_data = load_json(FILES['users'])
reviews_data = load_json(FILES['reviews'])
sales_data = load_json(FILES['sales'])

# 2. Validar maestros (Obtener PKs válidas)
valid_product_ids, err_prod = validate_schema_products(products_data)
valid_user_ids, err_users = validate_schema_users(users_data)

# 3. Validar transaccionales (Usando las PKs de arriba)
err_reviews = validate_integrity_reviews(reviews_data, valid_product_ids, valid_user_ids)
err_sales = validate_integrity_sales(sales_data, valid_product_ids, valid_user_ids)

# Resumen
total_errors = err_prod + err_users + err_reviews + err_sales

print("\n==================================================")
if total_errors == 0:
    print(f"{Color.GREEN}[ÉXITO]: Todos los archivos son consistentes y válidos.{Color.RESET}")
    print("   Listos para importar a MongoDB Atlas.")
else:
    print(f"{Color.RED} [VALIDACIÓN FALLIDA]: Se encontraron {total_errors} problemas.{Color.RESET}")
    print("   Revisa los logs anteriores y corrige transform_data.py")
print("==================================================")
