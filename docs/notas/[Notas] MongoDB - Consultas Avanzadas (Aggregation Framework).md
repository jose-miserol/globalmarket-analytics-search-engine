# B. Consultas Avanzadas (Aggregation Framework)

## Proyecto: GlobalMarket Analytics & Search Engine

---

### Agregaciones, Analytics y Business Intelligence

**Sistemas de Bases de Datos II • UNEG • 2025-II**

---

## 1. Conceptos Fundamentales

### ¿Qué es el Aggregation Framework?

Es un framework de procesamiento de datos dentro de MongoDB que permite realizar análisis complejos. Funciona como una **tubería (pipeline)** de pasos secuenciales.

### Metáfora de la Fábrica (Pipeline)
Imagina una línea de ensamblaje de fábrica:
1.  **Input:** Entran documentos crudos (materia prima).
2.  **Stages (Estapas):** Los documentos pasan por estaciones de trabajo. En cada una, se transforman (se filtran, se agrupan, se calculan campos).
3.  **Output:** Salen documentos procesados (producto final).

### Comparativa SQL vs MongoDB Aggregation

| Operación SQL | Etapa de Agregación (Stage) | Descripción |
|:---|:---|:---|
| WHERE | **$match** | Filtra documentos. |
| GROUP BY | **$group** | Agrupa por claves y calcula acumuladores (SUM, AVG). |
| SELECT | **$project** | Selecciona o renombra campos específicos. |
| JOIN | **$lookup** | Une documentos de otra colección. |
| HAVING | **$match** (después de $group) | Filtra resultados agrupados. |
| ORDER BY | **$sort** | Ordena los resultados. |
| LIMIT | **$limit** | Limita el número de resultados. |

---

## 2. Reporte de Ventas por Categoría y Mes

### Objetivo de Negocio
Generar un reporte financiero que muestre el rendimiento de ventas desglosado por categoría de producto y temporalidad mensual.

### Desafío Técnico
La colección `sales` tiene `product_id` y `sale_date`, pero no tiene el nombre de la categoría (está en `products`).
*   Necesitamos hacer un **Join**.
*   Necesitamos extraer el mes/año de una fecha ISO.

### Implementación del Pipeline

```javascript
db.sales.aggregate([
  // 1. JOIN: Unimos Ventas con Productos
  {
    $lookup: {
      from: "products",
      localField: "product_id",
      foreignField: "product_id",
      as: "product_info"
    }
  },
  
  // 2. APLANAR: El lookup devuelve un array, lo convertimos a objeto
  { $unwind: "$product_info" },
  
  // 3. TRANSFORMACIÓN: Extraemos Año y Mes de la fecha
  {
    $addFields: {
      year: { $year: { $toDate: "$sale_date" } },
      month: { $month: { $toDate: "$sale_date" } }
    }
  },
  
  // 4. AGRUPACIÓN: El corazón del reporte
  {
    $group: {
      _id: {
        category: "$product_info.category.main",
        year: "$year",
        month: "$month"
      },
      total_sales: { $sum: "$total_amount" },    // SQL: SUM(total_amount)
      avg_ticket: { $avg: "$total_amount" },     // SQL: AVG(total_amount)
      tx_count: { $sum: 1 }                      // SQL: COUNT(*)
    }
  }
])
```

> **Resultado:** Un documento por cada combinación Categoría-Mes con sus métricas financieras.

---

## 3. Top Productos Mejor Calificados

### Objetivo de Negocio
Identificar los productos "Héroes" (Best Sellers) basándonos en la satisfacción del cliente.

### Desafío Técnico
Un producto con **1 reseña de 5 estrellas** tiene promedio 5.0.
Un producto con **1000 reseñas de 4.8 estrellas** tiene promedio 4.8.
¿Cuál es mejor? El segundo es estadísticamente más confiable.
*   Debemos filtrar productos con pocas reseñas (ruido estadístico).
*   Debemos ordenar por calidad real.

### Implementación del Pipeline

```javascript
db.products.aggregate([
  // 1. FILTRADO: Solo productos con relevancia estadística (>50 reviews)
  {
    $match: {
      "rating.count": { $gt: 50 }
    }
  },
  
  // 2. ENRIQUECIMIENTO: Traemos detalles de las reseñas (Opcional para análisis profundo)
  {
    $lookup: {
      from: "reviews",
      localField: "product_id",
      foreignField: "product_id",
      as: "detailed_reviews"
    }
  },
  
  // 3. CÁLCULO DE SCORE: Ponderación (Rating * Logaritmo de Cantidad)
  {
    $addFields: {
      rating_score: {
        $multiply: ["$rating.average", { $ln: "$rating.count" }]
      }
    }
  },
  
  // 4. RANKING
  { $sort: { rating_score: -1 } },
  
  // 5. PROYECCIÓN: Limpiamos la salida
  {
    $project: {
      name: 1,
      category: "$category.main",
      final_score: { $round: ["$rating_score", 2] },
      stats: "$rating"
    }
  }
])
```

---

## 4. Segmentación de Precios (Bucket Pattern)

### Objetivo de Negocio
Entender la distribución del catálogo de productos para definir estrategias de marketing (Gama Baja vs Gama Alta).

### Desafío Técnico
Agrupar miles de precios dispares (499.99, 500.00, 1250.50...) en **rangos legibles** (Buckets).

### Implementación del Pipeline

Utilizamos **`$bucket`**, una etapa especializada para histogramas y segmentación.

```javascript
db.products.aggregate([
  // 1. CLASIFICACIÓN POR CUBETAS
  {
    $bucket: {
      groupBy: "$pricing.discounted_price",  // Campo a analizar
      boundaries: [0, 500, 1000, 2000, 5000, 10000, 50000], // Límites de los rangos
      default: "50000+", // Para valores fuera de rango (Ultra Luxury)
      output: {
        count: { $sum: 1 },
        avg_price: { $avg: "$pricing.discounted_price" },
        titles: { $push: "$name" } // Guardamos nombres de productos en el bucket
      }
    }
  },
  
  // 2. ETIQUETADO SEMÁNTICO (Mejora la legibilidad)
  {
    $addFields: {
      label: {
        $switch: {
          branches: [
            { case: { $eq: ["$_id", 0] }, then: "Budget (<500)" },
            { case: { $eq: ["$_id", 1000] }, then: "Mid-Range (1k-2k)" },
            { case: { $eq: ["$_id", 5000] }, then: "Luxury (5k-10k)" }
            // ... otros casos
          ],
          default: "Other"
        }
      }
    }
  }
])
```

---

## 5. Resumen

### Patrones de Agregación Utilizados

| Patrón | Etapas Clave | Aplicación en GlobalMarket |
|:---|:---|:---|
| **Join & Group** | `$lookup` → `$unwind` → `$group` | Unir Ventas con Productos para reportes por categoría. |
| **Filtering & Ranking** | `$match` → `$sort` | Encontrar los "Mejores Productos" descartando ruido. |
| **Bucketing** | `$bucket` | Segmentar productos en rangos de precios (Budget vs Luxury). |
| **Transformation** | `$addFields` → `$project` | Calcular fechas, scores ponderados y limpiar JSON final. |

---