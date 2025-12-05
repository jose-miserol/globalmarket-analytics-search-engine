/**
 * ============================================================================
 * GLOBALMARKET ANALYTICS - AGGREGATION PIPELINES
 * ============================================================================
 * @description
 * @context     Proyecto 1: Ingeniería de Datos NoSQL
 * @author      Equipo GlobalMarket
 * ============================================================================
 */

// Seleccionar base de datos
db = db.getSiblingDB("globalmarket");

print("==========================================\n");
print("EJECUTANDO PIPELINES DE AGREGACIÓN");
print("==========================================\n");

// ============================================
// PIPELINE 1: Reporte de Ventas por Categoría y Mes
// ============================================
print("PIPELINE 1: Ventas por Categoría y Mes\n");

db.sales
  .aggregate([
    // Stage 1: Lookup para obtener información del producto
    {
      $lookup: {
        from: "products",
        localField: "product_id",
        foreignField: "product_id",
        as: "product_info",
      },
    },

    // Stage 2: Unwind para descomponer el array
    {
      $unwind: "$product_info",
    },

    // Stage 3: Convertir sale_date a fecha y extraer mes/año
    {
      $addFields: {
        sale_date_obj: { $toDate: "$sale_date" },
        year: { $year: { $toDate: "$sale_date" } },
        month: { $month: { $toDate: "$sale_date" } },
      },
    },

    // Stage 4: Agrupar por categoría principal y mes
    {
      $group: {
        _id: {
          category: "$product_info.category.main",
          year: "$year",
          month: "$month",
        },
        total_sales: { $sum: "$total_amount" },
        total_units: { $sum: "$quantity" },
        num_transactions: { $sum: 1 },
        avg_sale_amount: { $avg: "$total_amount" },
      },
    },

    // Stage 5: Ordenar por categoría y fecha
    {
      $sort: {
        "_id.category": 1,
        "_id.year": -1,
        "_id.month": -1,
      },
    },

    // Stage 6: Proyectar con formato legible
    {
      $project: {
        _id: 0,
        category: "$_id.category",
        period: {
          $concat: [
            { $toString: "$_id.year" },
            "-",
            {
              $cond: [
                { $lt: ["$_id.month", 10] },
                { $concat: ["0", { $toString: "$_id.month" }] },
                { $toString: "$_id.month" },
              ],
            },
          ],
        },
        metrics: {
          total_sales: { $round: ["$total_sales", 2] },
          total_units: "$total_units",
          num_transactions: "$num_transactions",
          avg_sale_amount: { $round: ["$avg_sale_amount", 2] },
        },
      },
    },

    // Limitar resultados para visualización
    { $limit: 20 },
  ])
  .forEach((doc) => printjson(doc));

print("\n Pipeline 1 completado\n");

// ============================================
// PIPELINE 2: Top Productos por Rating
// (Productos con más de 50 reseñas)
// ============================================
print("PIPELINE 2: Top Productos con Mejor Rating (>50 reviews)\n");

db.products
  .aggregate([
    // Stage 1: Filtrar productos con más de 50 reseñas
    {
      $match: {
        "rating.count": { $gt: 50 },
      },
    },

    // Stage 2: Lookup para obtener reviews detalladas
    {
      $lookup: {
        from: "reviews",
        localField: "product_id",
        foreignField: "product_id",
        as: "detailed_reviews",
      },
    },

    // Stage 3: Calcular métricas adicionales
    {
      $addFields: {
        review_count_actual: { $size: "$detailed_reviews" },
        avg_detailed_rating: { $avg: "$detailed_reviews.rating" },
        discount_amount: {
          $subtract: ["$pricing.actual_price", "$pricing.discounted_price"],
        },
        rating_score: {
          $multiply: ["$rating.average", { $ln: "$rating.count" }],
        },
      },
    },

    // Stage 4: Ordenar por rating_score (rating * ln(count))
    {
      $sort: {
        rating_score: -1,
      },
    },

    // Stage 5: Proyectar información relevante
    {
      $project: {
        _id: 0,
        product_id: 1,
        name: 1,
        category: "$category.main",
        rating: {
          average: "$rating.average",
          count: "$rating.count",
          score: { $round: ["$rating_score", 2] },
        },
        pricing: {
          current: "$pricing.discounted_price",
          original: "$pricing.actual_price",
          savings: { $round: ["$discount_amount", 2] },
          discount_pct: "$pricing.discount_percentage",
        },
        review_stats: {
          atlas_count: "$rating.count",
          actual_count: "$review_count_actual",
          avg_rating: { $round: ["$avg_detailed_rating", 2] },
        },
      },
    },

    // Top 10 productos
    { $limit: 10 },
  ])
  .forEach((doc) => printjson(doc));

print("\n Pipeline 2 completado\n");

// ============================================
// PIPELINE 3: Bucket Pattern - Rangos de Precio
// ============================================
print("PIPELINE 3: Distribución de Productos por Rango de Precio\n");

db.products
  .aggregate([
    // Stage 1: Proyectar solo precio para simplificar
    {
      $project: {
        product_id: 1,
        name: 1,
        price: "$pricing.discounted_price",
        category: "$category.main",
        rating: "$rating.average",
      },
    },

    // Stage 2: Usar $bucket para crear rangos
    {
      $bucket: {
        groupBy: "$price",
        boundaries: [0, 500, 1000, 2000, 5000, 10000, 50000],
        default: "50000+",
        output: {
          count: { $sum: 1 },
          products: {
            $push: {
              id: "$product_id",
              name: "$name",
              price: "$price",
              category: "$category",
            },
          },
          avg_price: { $avg: "$price" },
          avg_rating: { $avg: "$rating" },
          min_price: { $min: "$price" },
          max_price: { $max: "$price" },
        },
      },
    },

    // Stage 3: Agregar etiquetas descriptivas
    {
      $addFields: {
        price_range_label: {
          $switch: {
            branches: [
              { case: { $eq: ["$_id", 0] }, then: "Budget (₹0-500)" },
              { case: { $eq: ["$_id", 500] }, then: "Economy (₹500-1000)" },
              { case: { $eq: ["$_id", 1000] }, then: "Mid-Range (₹1000-2000)" },
              { case: { $eq: ["$_id", 2000] }, then: "Premium (₹2000-5000)" },
              { case: { $eq: ["$_id", 5000] }, then: "Luxury (₹5000-10000)" },
              {
                case: { $eq: ["$_id", 10000] },
                then: "Ultra-Luxury (₹10000-50000)",
              },
            ],
            default: "Ultra-Premium (₹50000+)",
          },
        },
      },
    },

    // Stage 4: Proyectar con formato limpio
    {
      $project: {
        _id: 0,
        price_range: "$price_range_label",
        statistics: {
          total_products: "$count",
          avg_price: { $round: ["$avg_price", 2] },
          avg_rating: { $round: ["$avg_rating", 2] },
          price_span: {
            min: { $round: ["$min_price", 2] },
            max: { $round: ["$max_price", 2] },
          },
        },
        sample_products: { $slice: ["$products", 3] },
      },
    },

    // Ordenar por rango de precio
    { $sort: { "statistics.avg_price": 1 } },
  ])
  .forEach((doc) => printjson(doc));

print("\n Pipeline 3 completado\n");

// ============================================
// PIPELINE 4 (BONUS): Análisis de Clientes VIP
// ============================================
print("PIPELINE 4 (BONUS): Top Clientes VIP\n");

db.sales
  .aggregate([
    // Stage 1: Agrupar por usuario
    {
      $group: {
        _id: "$user_id",
        total_spent: { $sum: "$total_amount" },
        total_purchases: { $sum: 1 },
        avg_order_value: { $avg: "$total_amount" },
        products_bought: { $addToSet: "$product_id" },
        first_purchase: { $min: "$sale_date" },
        last_purchase: { $max: "$sale_date" },
      },
    },

    // Stage 2: Lookup para información del usuario
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "user_id",
        as: "user_info",
      },
    },

    // Stage 3: Unwind user info
    {
      $unwind: {
        path: "$user_info",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Stage 4: Calcular métricas de cliente
    {
      $addFields: {
        unique_products: { $size: "$products_bought" },
        customer_lifetime_days: {
          $dateDiff: {
            startDate: { $toDate: "$first_purchase" },
            endDate: { $toDate: "$last_purchase" },
            unit: "day",
          },
        },
        vip_score: {
          $multiply: [
            "$total_spent",
            { $add: [1, { $divide: ["$total_purchases", 10] }] },
          ],
        },
      },
    },

    // Stage 5: Filtrar solo clientes significativos
    {
      $match: {
        total_purchases: { $gte: 3 },
      },
    },

    // Stage 6: Ordenar por VIP score
    {
      $sort: { vip_score: -1 },
    },

    // Stage 7: Proyección final
    {
      $project: {
        _id: 0,
        user_id: "$_id",
        user_name: "$user_info.name",
        user_email: "$user_info.email",
        metrics: {
          total_spent: { $round: ["$total_spent", 2] },
          total_purchases: "$total_purchases",
          avg_order_value: { $round: ["$avg_order_value", 2] },
          unique_products: "$unique_products",
          vip_score: { $round: ["$vip_score", 2] },
        },
        engagement: {
          first_purchase: "$first_purchase",
          last_purchase: "$last_purchase",
          lifetime_days: "$customer_lifetime_days",
        },
      },
    },

    // Top 15 clientes VIP
    { $limit: 15 },
  ])
  .forEach((doc) => printjson(doc));

print("\n Pipeline 4 completado\n");

// ============================================
// PIPELINE 5 (BONUS): Análisis de Tendencias
// ============================================
print("PIPELINE 5 (BONUS): Tendencias de Ventas por Ciudad\n");

db.sales
  .aggregate([
    // Stage 1: Descomponer información de shipping
    {
      $match: {
        "shipping.city": { $exists: true },
      },
    },

    // Stage 2: Agrupar por ciudad
    {
      $group: {
        _id: "$shipping.city",
        total_sales: { $sum: "$total_amount" },
        total_orders: { $sum: 1 },
        avg_order_value: { $avg: "$total_amount" },
        payment_methods: { $addToSet: "$payment_method" },
        status_distribution: {
          $push: "$status",
        },
      },
    },

    // Stage 3: Calcular distribución de estados
    {
      $addFields: {
        completed_orders: {
          $size: {
            $filter: {
              input: "$status_distribution",
              as: "status",
              cond: { $in: ["$$status", ["completed", "delivered"]] },
            },
          },
        },
        completion_rate: {
          $multiply: [
            {
              $divide: [
                {
                  $size: {
                    $filter: {
                      input: "$status_distribution",
                      as: "status",
                      cond: { $in: ["$$status", ["completed", "delivered"]] },
                    },
                  },
                },
                { $size: "$status_distribution" },
              ],
            },
            100,
          ],
        },
      },
    },

    // Stage 4: Ordenar por ventas totales
    {
      $sort: { total_sales: -1 },
    },

    // Stage 5: Proyección final
    {
      $project: {
        _id: 0,
        city: "$_id",
        metrics: {
          total_sales: { $round: ["$total_sales", 2] },
          total_orders: "$total_orders",
          avg_order_value: { $round: ["$avg_order_value", 2] },
          completion_rate: { $round: ["$completion_rate", 1] },
        },
        payment_methods: 1,
        completed_orders: 1,
      },
    },

    { $limit: 10 },
  ])
  .forEach((doc) => printjson(doc));

print("\n Pipeline 5 completado\n");

print("==========================================");
print("TODOS LOS PIPELINES EJECUTADOS");
print("==========================================\n");
