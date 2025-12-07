/**
 * ============================================================================
 * GLOBALMARKET ANALYTICS - SCRIPT DE CREACIÓN DE ÍNDICES
 * ============================================================================
 * @description Script robusto para la creación de índices en MongoDB Atlas.
 *              Maneja conflictos de nombres e índices duplicados de forma
 *              inteligente, comparando las definiciones de llaves (keys).
 * @context     Proyecto 1: Ingeniería de Datos NoSQL
 * @author      Equipo GlobalMarket
 * ============================================================================
 */

// ============================================================================
// CONFIGURACIÓN DE BASE DE DATOS
// ============================================================================
/**
 * Obtiene el nombre de la base de datos desde la variable de entorno DB_NAME.
 * Si no está definida, usa 'globalmarket' como valor por defecto.
 * 
 * Uso desde terminal:
 *   mongosh "$CONNECTION_STRING/$DB_NAME" --file "scripts/index.js"
 */
const DB_NAME = process.env.DB_NAME || db.getName() || "globalmarket";
db = db.getSiblingDB(DB_NAME);

print("\n==========================================");
print(`INICIANDO INDEXACIÓN INTELIGENTE`);
print(`Base de datos: ${DB_NAME}`);
print("==========================================\n");

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================
/**
 * Verifica si ya existe un índice con las mismas llaves (keys),
 * independientemente del nombre que tenga.
 * 
 * @param {string} collName - Nombre de la colección.
 * @param {object} keyPattern - El objeto de definición del índice (ej: { "category.main": 1 }).
 * @returns {string|null} - Retorna el nombre del índice existente si lo encuentra, o null.
 */
function findExistingIndexName(collName, keyPattern) {
  try {
    const indexes = db.getCollection(collName).getIndexes();
    // Convertimos a string para comparar objetos JSON
    const searchKey = JSON.stringify(keyPattern);

    const found = indexes.find((idx) => JSON.stringify(idx.key) === searchKey);
    return found ? found.name : null;
  } catch (e) {
    return null;
  }
}

/**
 * Intenta crear un índice manejando conflictos de nombres.
 */
function safeCreateIndex(collName, idxDef) {
  const collection = db.getCollection(collName);

  // 1. Verificar si ya existe un índice con EXACTAMENTE estas llaves
  const existingName = findExistingIndexName(collName, idxDef.spec);

  if (existingName) {
    if (existingName === idxDef.name) {
      print(`   [SKIP] El índice '${idxDef.name}' ya existe y está correcto.`);
    } else {
      print(
        `   [SKIP] Ya existe un índice idéntico con otro nombre: '${existingName}'. Se omite '${idxDef.name}' para evitar conflictos.`
      );
    }
    return;
  }

  // 2. Si no existe duplicado de llaves, intentamos crear
  try {
    collection.createIndex(idxDef.spec, {
      ...idxDef.options,
      name: idxDef.name,
    });
    print(`   [OK] Creado índice: '${idxDef.name}'`);
  } catch (e) {
    // Captura errores residuales (ej. si el nombre ya existe pero con otras llaves)
    print(`   [ERROR] No se pudo crear '${idxDef.name}': ${e.message}`);
  }
}

// ============================================================================
// PARTE 1: ATLAS SEARCH INDEX (LUCENE)
// ============================================================================
print("[1/4] Gestionando Índice Atlas Search en 'products'...");
try {
  db.products.createSearchIndex("default", {
    mappings: {
      dynamic: false,
      fields: {
        name: { type: "string", analyzer: "lucene.standard" },
        description: { type: "string", analyzer: "lucene.standard" },
        category: {
          type: "document",
          fields: { main: { type: "stringFacet" } },
        },
      },
    },
  });
  print("   [OK] Solicitud de índice 'default' enviada.");
} catch (error) {
  print("   [INFO] Estado Search: " + error.message);
}

// ============================================================================
// PARTE 2: ÍNDICES PARA 'PRODUCTS'
// ============================================================================
print("\n[2/4] Optimizando colección 'products'...");

const productsIndexes = [
  {
    name: "idx_product_id_unique",
    spec: { product_id: 1 },
    options: { unique: true },
  },
  // Índice compuesto para filtrar por categoría y ordenar por precio
  {
    name: "idx_category_price_desc",
    spec: { "category.main": 1, "pricing.actual_price": -1 },
    options: {},
  },
  // Índice para filtrar productos por cantidad de reseñas (Pipeline 2)
  {
    name: "idx_rating_count",
    spec: { "rating.count": -1 },
    options: {},
  },
];

productsIndexes.forEach((idx) => safeCreateIndex("products", idx));

// ============================================================================
// PARTE 3: ÍNDICES PARA 'SALES'
// ============================================================================
print("\n[3/4] Optimizando colección 'sales'...");

const salesIndexes = [
  // Índice para $lookup desde products
  {
    name: "idx_fk_product_id",
    spec: { product_id: 1 },
    options: {},
  },
  // Índice para agregación por usuario (Pipeline 4: Clientes VIP)
  {
    name: "idx_user_id",
    spec: { user_id: 1 },
    options: {},
  },
  // Índice para ordenar por fecha de venta
  {
    name: "idx_sale_date",
    spec: { sale_date: -1 },
    options: {},
  },
  // Índice compuesto para análisis por ciudad (Pipeline 5)
  {
    name: "idx_city_amount",
    spec: { "shipping.city": 1, total_amount: -1 },
    options: {},
  },
];

salesIndexes.forEach((idx) => safeCreateIndex("sales", idx));

// ============================================================================
// PARTE 4: COLECCIONES SECUNDARIAS
// ============================================================================
print("\n[4/4] Optimizando colecciones secundarias...");

// Índice único para email (login/autenticación)
safeCreateIndex("users", {
  name: "idx_email_unique",
  spec: { email: 1 },
  options: { unique: true },
});

// Índice único para user_id (FK desde sales y reviews)
safeCreateIndex("users", {
  name: "idx_user_id_unique",
  spec: { user_id: 1 },
  options: { unique: true },
});

// Índice compuesto para reviews (búsqueda por producto + ordenar por rating)
safeCreateIndex("reviews", {
  name: "idx_reviews_product_rating",
  spec: { product_id: 1, rating: -1 },
  options: {},
});

print("\n==========================================");
print("PROCESO COMPLETADO SIN ERRORES CRÍTICOS");
print("==========================================\n");
