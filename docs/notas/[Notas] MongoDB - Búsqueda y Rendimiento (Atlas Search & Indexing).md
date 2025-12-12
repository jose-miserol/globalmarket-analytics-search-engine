# C. Búsqueda y Rendimiento (Atlas Search & Indexing)

## Proyecto: GlobalMarket Analytics & Search Engine

---

### Optimización de Consultas y Búsqueda Full-Text

**Sistemas de Bases de Datos II • UNEG • 2025-II**

---

## 1. Atlas Search (Lucene)

### ¿Qué es Atlas Search?

Es un motor de búsqueda de texto completo integrado en MongoDB Atlas, construido sobre **Apache Lucene**. Permite implementar experiencias de búsqueda tipo Google (con corrección de errores, autocompletado, sinónimos) sin necesidad de infraestructura externa como ElasticSearch.

### Fuzzy Search (Búsqueda Difusa)

¿Alguna vez has escrito mal una palabra en Google y aún así obtuviste resultados? Eso es **Fuzzy Search**.

*   Usuario busca: "Iphone" -> Sistema encuentra: "iPhone"
*   Usuario busca: "Samsung" -> Sistema encuentra: "Samsung"

---

## Implementación en el Proyecto

**Archivo:** `scripts/index.js`

Configuramos un índice de búsqueda llamado `default` en la colección `products` para indexar el nombre y la descripción.

```javascript
db.products.createSearchIndex("default", {
  mappings: {
    dynamic: false, // Mejor rendimiento: solo indexamos lo necesario
    fields: {
      // Indexamos el nombre con analizador estándar de Lucene
      name: { type: "string", analyzer: "lucene.standard" },
      // Indexamos la descripción para búsquedas profundas
      description: { type: "string", analyzer: "lucene.standard" },
      // Facetado para filtros por categoría
      category: {
        type: "document",
        fields: { main: { type: "stringFacet" } }
      }
    }
  }
});
```

---

## Consulta de Ejemplo (Query)

Una vez creado el índice, podemos usar la etapa `$search` en el Aggregation Framework:

```javascript
db.products.aggregate([
  {
    $search: {
      index: "default",
      text: {
        query: "smartfone", // <--- Error tipográfico intencional
        path: ["name", "description"],
        fuzzy: { maxEdits: 2 } // <--- Tolerancia a 2 errores
      }
    }
  }
])
```

> **Resultado:** Encontrará documentos que contienen "Smartphone" aunque el usuario escribió "smartfone".

---

## 2. Optimización con Índices

### Índices Tradicionales (B-Tree)

Los índices son estructuras de datos especiales que almacenan una pequeña porción del conjunto de datos en una forma fácil de recorrer (normalmente B-Tree). Sin índices, MongoDB debe realizar un **Collection Scan** (leer todos los documentos).

---

### Estrategia de Indexación GlobalMarket

Hemos implementado una estrategia mixta de índices Simples y Compuestos.

#### 1. Índices Simples (Single Field)

Para búsquedas directas y unicidad.

| Colección | Índice | Propósito | Implementación |
|:---|:---|:---|:---|
| `users` | `email` | **Login rápido** y unicidad de cuenta. | `{ email: 1 }, { unique: true }` |
| `sales` | `sale_date` | **Reportes cronológicos** y ordenamiento. | `{ sale_date: -1 }` |
| `products` | `product_id` | **Lookups efficientes** (Foreign Keys). | `{ product_id: 1 }` |

#### 2. Índices Compuestos (Compound Index)

Para consultas que filtran y ordenan por múltiples campos a la vez.

**Caso de Uso:** Tienda Online - Categoría + Precio

> "Muéstrame celulares (`category.main`) ordenados del más caro al más barato (`actual_price`)"

```javascript
// scripts/index.js
{
  name: "idx_category_price_desc",
  spec: { 
    "category.main": 1,       // 1. Primero filtra por categoría
    "pricing.actual_price": -1 // 2. Luego ordena por precio descendente
  }
}
```

> **Regla ESR (Equality, Sort, Range):** El orden de los campos en el índice importa. Primero Igualdad (Categoría), luego Ordenamiento (Precio).

---

## 3. Análisis de Rendimiento (Explain Plan)

### La Herramienta: .explain("executionStats")

MongoDB nos permite "radiografiar" una consulta para ver cómo se ejecutó realmente.

### Escenario de Prueba
Buscar productos de la categoría "Electronics" ordenados por precio.

---

### ANTES (Sin Índices)

```javascript
// Estadísticas de ejecución simuladas
{
  "executionTimeMillis": 150,      // Lento
  "totalDocsExamined": 1465,       // Leyó TODOS los productos
  "nReturned": 450,                // Solo devolvió 450
  "stage": "COLLSCAN"              // ESCANEO TOTAL (Malo)
}
```

> **Diagnóstico:** La base de datos tuvo que leer 1,465 documentos para encontrar los 450 que necesitábamos. Eficiencia pobre.

---

### DESPUÉS (Con Índice Compuesto)

```javascript
// Estadísticas de ejecución simuladas
{
  "executionTimeMillis": 5,        // Rápido
  "totalDocsExamined": 450,        // Leyó EXACTAMENTE lo necesario
  "nReturned": 450,
  "stage": "IXSCAN"                // ESCANEO DE ÍNDICE (Bueno)
}
```

> **Diagnóstico:** El motor fue directamente a la entrada del índice "Electronics", recorrió los punteros ya ordenados por precio y devolvió los datos. **Mejora de 30x en velocidad.**

---

## 4. Resumen

| Tecnología | Herramienta | Uso Principal |
|:---|:---|:---|
| **Atlas Search** | Apache Lucene | Barra de búsqueda, corrección ortográfica, relevancia. |
| **Índices B-Tree** | `createIndex()` | Filtros exactos, rangos, ordenamientos, $lookup. |
| **Optimización** | Explain Plans | Diagnóstico de cuellos de botella. |

> "Un sistema sin índices es un sistema destinado a fallar bajo carga."
