/**
 * ============================================================================
 * GLOBALMARKET ANALYTICS - ESQUEMA DE VALIDACIÓN Y REGLAS DE INTEGRIDAD
 * ============================================================================
 * @description Define las reglas de validación JSON Schema para garantizar la
 * calidad de los datos en MongoDB Atlas.
 * @context     Proyecto 1: Ingeniería de Datos NoSQL
 * @author      Equipo GlobalMarket
 * ============================================================================
 */

// Seleccionar base de datos
db = db.getSiblingDB("globalmarket");

/**
 * Función auxiliar para asegurar la existencia de la colección antes de modificarla.
 * Evita errores si se ejecuta el script en una base de datos limpia.
 */
function ensureCollection(name) {
  if (!db.getCollectionNames().includes(name)) {
    db.createCollection(name);
    print(`[INFO] Colección '${name}' creada inicializada.`);
  }
}

// Inicializar colecciones requeridas
["products", "users", "reviews", "sales"].forEach(ensureCollection);

// ============================================================================
// 1. COLECCIÓN: PRODUCTS
// ============================================================================
/**
 * Reglas de Negocio:
 * - Precios y descuentos no pueden ser negativos.
 * - Categoría debe tener al menos una clasificación principal.
 * - Rating promedio limitado entre 0.0 y 5.0.
 */
print("\n[PROCESO] Aplicando reglas de validación a 'products'...");

db.runCommand({
  collMod: "products",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["product_id", "name", "category", "pricing", "rating"],
      properties: {
        product_id: {
          bsonType: "string",
          description: "Identificador único del producto (PK).",
        },
        name: {
          bsonType: "string",
          minLength: 3,
          maxLength: 500,
          description: "Nombre comercial del producto.",
        },
        category: {
          bsonType: "object",
          required: ["main"],
          properties: {
            main: {
              bsonType: "string",
              description: "Categoría taxonómica principal.",
            },
            sub: { bsonType: "array", items: { bsonType: "string" } },
          },
        },
        pricing: {
          bsonType: "object",
          required: ["discounted_price", "actual_price"],
          properties: {
            discounted_price: {
              bsonType: "number",
              minimum: 0,
              description: "Precio final de venta. Debe ser >= 0.",
            },
            actual_price: {
              bsonType: "number",
              minimum: 0,
              description: "Precio de lista original (PVP).",
            },
            discount_percentage: {
              bsonType: "number",
              minimum: 0,
              maximum: 100,
              description: "Porcentaje calculado de descuento.",
            },
            currency: {
              enum: ["INR", "USD", "EUR", "GBP"],
              description: "Código ISO 4217 de la moneda.",
            },
          },
        },
        rating: {
          bsonType: "object",
          properties: {
            average: {
              bsonType: "number",
              minimum: 0,
              maximum: 5,
              description: "Puntuación media ponderada (0-5).",
            },
            count: {
              bsonType: "int",
              minimum: 0,
              description: "Volumen total de valoraciones.",
            },
          },
        },
        images: {
          bsonType: "object",
          properties: {
            thumbnail: { bsonType: "string", pattern: "^https?://" },
            main: { bsonType: "string", pattern: "^https?://" },
          },
        },
        created_at: { bsonType: "string" },
        updated_at: { bsonType: "string" },
      },
    },
  },
  validationLevel: "strict",
  validationAction: "error",
});
print("[OK] Esquema de 'products' aplicado correctamente.");

// ============================================================================
// 2. COLECCIÓN: USERS
// ============================================================================
/**
 * Reglas de Negocio:
 * - El email debe cumplir con el formato estándar (Regex).
 * - El nombre de usuario requiere longitud mínima.
 */
print("[PROCESO] Aplicando reglas de validación a 'users'...");

db.runCommand({
  collMod: "users",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "name", "email"],
      properties: {
        user_id: {
          bsonType: "string",
          description: "Identificador único de usuario.",
        },
        name: {
          bsonType: "string",
          minLength: 1,
          maxLength: 100,
          description: "Nombre completo del cliente.",
        },
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          description: "Dirección de correo electrónico válida.",
        },
        total_reviews: { bsonType: "int", minimum: 0 },
        average_rating_given: { bsonType: "number", minimum: 0, maximum: 5 },
      },
    },
  },
  validationLevel: "strict",
  validationAction: "error",
});
print("[OK] Esquema de 'users' aplicado correctamente.");

// ============================================================================
// 3. COLECCIÓN: REVIEWS
// ============================================================================
/**
 * Reglas de Negocio:
 * - Integridad referencial: Debe apuntar a product_id y user_id.
 * - Rating obligatorio entre 1 y 5 (enteros).
 */
print("[PROCESO] Aplicando reglas de validación a 'reviews'...");

db.runCommand({
  collMod: "reviews",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["review_id", "product_id", "user_id", "rating"],
      properties: {
        review_id: { bsonType: "string" },
        product_id: {
          bsonType: "string",
          description: "FK: Referencia al producto.",
        },
        user_id: {
          bsonType: "string",
          description: "FK: Referencia al usuario.",
        },
        title: { bsonType: "string", maxLength: 200 },
        content: { bsonType: "string", maxLength: 5000 },
        rating: {
          bsonType: "int",
          minimum: 1,
          maximum: 5,
          description: "Valoración del usuario (escala Likert 1-5).",
        },
        helpful_count: { bsonType: "int", minimum: 0 },
        verified_purchase: { bsonType: "bool" },
        images: {
          bsonType: "array",
          items: { bsonType: "string", pattern: "^https?://" },
        },
      },
    },
  },
  validationLevel: "strict",
  validationAction: "error",
});
print("[OK] Esquema de 'reviews' aplicado correctamente.");

// ============================================================================
// 4. COLECCIÓN: SALES
// ============================================================================
/**
 * Reglas de Negocio:
 * - ID de venta debe seguir el patrón SALE-YYYY-NNNNNN.
 * - Enumeración estricta para estados de pedido y métodos de pago.
 */
print("[PROCESO] Aplicando reglas de validación a 'sales'...");

db.runCommand({
  collMod: "sales",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "sale_id",
        "product_id",
        "user_id",
        "total_amount",
        "sale_date",
      ],
      properties: {
        sale_id: {
          bsonType: "string",
          pattern: "^SALE-\\d{4}-\\d{6}$",
          description: "Número de orden formateado.",
        },
        product_id: { bsonType: "string" },
        user_id: { bsonType: "string" },
        quantity: { bsonType: "int", minimum: 1 },
        // CORRECCIÓN AQUÍ: Cambiado de "double" a "number"
        total_amount: {
          bsonType: "number",
          minimum: 0,
          description: "Valor monetario total de la transacción.",
        },
        sale_date: { bsonType: "string" },
        payment_method: {
          enum: [
            "credit_card",
            "debit_card",
            "upi",
            "cash_on_delivery",
            "net_banking",
          ],
          description: "Pasarela de pago utilizada.",
        },
        status: {
          enum: [
            "pending",
            "processing",
            "shipped",
            "delivered",
            "completed",
            "cancelled",
          ],
          description: "Estado actual del ciclo de vida del pedido.",
        },
        shipping: {
          bsonType: "object",
          properties: {
            city: { bsonType: "string" },
            country: { bsonType: "string" },
            postal_code: { bsonType: "string", pattern: "^\\d{6}$" },
          },
        },
      },
    },
  },
  validationLevel: "strict",
  validationAction: "error",
});
print("[OK] Esquema de 'sales' aplicado correctamente.");

// ============================================================================
// PRUEBAS DE INTEGRIDAD (UNIT TESTS)
// ============================================================================
print("\n");
print("-----------------------------------------------------");
print("EJECUTANDO PRUEBAS DE INTEGRIDAD DE DATOS");
print("-----------------------------------------------------");

// TEST 1: Violación de Regla de Negocio (Precio Negativo)
try {
  db.products.insertOne({
    product_id: "TEST_FAIL_01",
    name: "Producto Inválido",
    category: { main: "Test" },
    pricing: { discounted_price: -50.0, actual_price: 100.0 }, // Error intencional
    rating: { average: 4.5, count: 10 },
  });
  print("[FALLO] El sistema permitió un precio negativo (Falso Negativo).");
} catch (e) {
  print("[EXITO] El sistema rechazó correctamente el precio negativo.");
}

// TEST 2: Violación de Formato (Email Inválido)
try {
  db.users.insertOne({
    user_id: "TEST_FAIL_02",
    name: "Usuario Inválido",
    email: "correo_sin_arroba.com", // Error intencional
  });
  print("[FALLO] El sistema permitió un email inválido (Falso Negativo).");
} catch (e) {
  print("[EXITO] El sistema rechazó correctamente el email mal formado.");
}

// TEST 3: Inserción Correcta
try {
  db.products.insertOne({
    product_id: "TEST_SUCCESS_01",
    name: "Producto de Prueba Válido",
    category: { main: "Electronics", sub: ["Test"] },
    pricing: {
      discounted_price: 100.0,
      actual_price: 150.0,
      discount_percentage: 33.3,
      currency: "USD",
    },
    rating: { average: 5.0, count: 1 },
  });
  print("[EXITO] Inserción de datos válidos completada.");
  db.products.deleteOne({ product_id: "TEST_SUCCESS_01" });
} catch (e) {
  print("[FALLO] El sistema rechazó datos válidos: " + e.message);
}

print("\n");
print("=====================================================");
print("ESTADO FINAL: Validaciones Activadas y Verificadas");
print("=====================================================");
