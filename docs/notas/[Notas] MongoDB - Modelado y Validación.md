# A. Modelado y Validación (Schema Design)

## Proyecto: GlobalMarket Analytics & Search Engine

---

## 1. Diseño del Esquema (Schema Design)

### Concepto Fundamental: Modelo de Documentos
A diferencia del modelo relacional (SQL) que fragmenta la datos en múltiples tablas normalizadas, MongoDB utiliza un **Modelo de Documentos**. Los datos se almacenan en documentos BSON (JSON binario) que pueden contener estructuras anidadas (arrays y subdocumentos). Esto permite que datos relacionados se almacenen juntos, alineándose mejor con la forma en que las aplicaciones acceden a ellos.

### Transición: De SQL a NoSQL

Antes de la migración, el sistema utilizaba un modelo relacional tradicional altamente normalizado. A continuación se contrastan las estructuras:

#### Estado Previo (SQL / Relacional)
En el modelo SQL, la información de un solo producto estaba dispersa en múltiples tablas para evitar duplicidad (Normalización):

*   **Tabla Products:** (id, name, category_id_FK)
*   **Tabla Categories:** (id, name, parent_id)
*   **Tabla Product_Prices:** (id, product_id_FK, price, discount, currency)
*   **Tabla Ratings:** (id, product_id_FK, score, count)
*   **Tabla Addresses:** (id, user_id_FK, city, zip)

> *Problema:* Para obtener la ficha de un producto, se requerían múltiples JOINs costosos.

#### Nueva Estrategia (MongoDB / NoSQL)
Pasamos a un **Patrón Híbrido** donde desnormalizamos datos estratégicos para optimizar la lectura:

| Entidad | Relación SQL (Antes) | Estrategia MongoDB (Ahora) | Justificación del Diseño NoSQL |
|:---|:---|:---|:---|
| **Categoría** | Tabla separada (FOREIGN KEY) | **Embedding** (Subdocumento) | La categoría es intrínseca al producto. Se lee el 100% de las veces junto con él. Evita un $lookup innecesario. |
| **Precios** | Tabla separada (1:1) | **Embedding** (Subdocumento) | El precio es un atributo del producto, no una entidad independiente. |
| **Rating** | Tabla agregada o cálculo dinámico AVG() | **Computed Pattern** (Embebido) | Se pre-calculan average y count al escribir una reseña. Lectura O(1) vs cálculo costoso en tiempo real. |
| **Shipping** | Tabla Addresses vinculada al usuario | **Snapshot Pattern** (Embebido en Venta) | En la colección sales, embebemos la dirección *tal cual estaba* al momento de la compra. Si el usuario se muda años después, el histórico de la venta no se corrompe. |
| **Reseñas** | Tabla Reviews (1:N) | **Referencing** (Colección aparte) | Un producto puede tener miles de reseñas (Cardinalidad 1:Infinite). Embeberlas desbordaría el límite de 16MB por documento. |

---

## 2. Validación de Esquema (Schema Validation)

### Concepto Fundamental: Integridad en Esquemas Flexibles
Aunque MongoDB tiene un esquema flexible (schemaless), para aplicaciones empresariales es crítico mantener la **Calidad de los Datos**. MongoDB permite aplicar reglas de validación **JSON Schema** directamente en el motor de base de datos. Esto actúa como una barrera de seguridad que garantiza que ningún dato corrupto o incompleto se persista, similar a los Constraints en SQL pero con la flexibilidad de JSON.

### Implementación en el Proyecto

Utilizamos el comando `collMod` para inyectar validadores estrictos.

#### Validaciones Clave Implementadas

| Colección | Regla de Integridad | Implementación JSON Schema |
|:---|:---|:---|
| **Products** | **Integridad Financiera:** Precios y descuentos no pueden ser negativos. | `pricing.actual_price: { minimum: 0 }`<br>`pricing.discount_percentage: { min: 0, max: 100 }` |
| **Users** | **Calidad de Contacto:** El email debe ser real. | `email: { pattern: "^[a-zA-Z0-9...]+@..." }` (Regex) |
| **Sales** | **Control de Tipos:** Montos numéricos y estados enumerados. | `status: { enum: ["pending", "shipped", ...] }`<br>`total_amount: { minimum: 0 }` |
| **Reviews** | **Integridad Referencial:** Debe pertenecer a un producto/usuario. | `product_id: { bsonType: "string" }`<br>`rating: { minimum: 1, maximum: 5 }` |

---

## 3. Ingesta de Datos (Data Ingestion)

### Concepto Fundamental: Ingesta Masiva
La ingesta de datos es el proceso de transportar datos desde diversas fuentes hacia la base de datos de destino. En el contexto de Big Data y NoSQL, las herramientas de ingesta deben ser capaces de manejar grandes volúmenes de información eficientemente, convirtiendo formatos planos (como CSV) a jerárquicos (como JSON/BSON).

### Proceso Implementado

Para nuestro clúster M0 (Free Tier), utilizamos `mongoimport`, una herramienta de línea de comandos diseñada para cargas de alto rendimiento.

**Flujo Automatizado (master_setup.sh):**

1.  **Transformación (ETL):** Los datos relacionales legados se convierten a JSON.
2.  **Carga:**
    ```bash
    # Ejemplo de comando interno
    mongoimport --uri $URI --collection products --file products.json --jsonArray --drop
    ```
3.  **Post-Procesamiento:** Una vez cargados los datos crudos, aplicamos los esquemas (`validation.js`) y creamos las estructuras de acceso rápido (`index.js`).