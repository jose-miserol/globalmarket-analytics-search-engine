<div align="center">

# 🚀 GlobalMarket Analytics & Search Engine

![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Atlas](https://img.shields.io/badge/MongoDB%20Atlas-4ea94b?style=for-the-badge&logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)

### 📚 Universidad Nacional Experimental de Guayana (UNEG)

**Sistemas de Bases de Datos II • Semestre 2025-II**

---

[🎯 Características](#-características-principales) •
[📦 Instalación](#-guía-de-instalación) •
[🏗️ Arquitectura](#-arquitectura-de-datos) •
[📊 Analytics](#-analytics-y-consultas) •
[📈 Dashboard](#-mongodb-charts-dashboard) •
[👥 Equipo](#-equipo-de-desarrollo)

</div>

---

## 📋 Tabla de Contenidos

- [🚀 GlobalMarket Analytics \& Search Engine](#-globalmarket-analytics--search-engine)
  - [📚 Universidad Nacional Experimental de Guayana (UNEG)](#-universidad-nacional-experimental-de-guayana-uneg)
  - [📋 Tabla de Contenidos](#-tabla-de-contenidos)
  - [📋 Descripción del Proyecto](#-descripción-del-proyecto)
    - [¿Por qué MongoDB para E-commerce?](#por-qué-mongodb-para-e-commerce)
  - [✨ Características Principales](#-características-principales)
    - [🎯 Modelado de Datos](#-modelado-de-datos)
    - [🔒 Calidad de Datos](#-calidad-de-datos)
    - [🚀 Performance](#-performance)
    - [📊 Analytics](#-analytics)
  - [🏗️ Arquitectura de Datos](#️-arquitectura-de-datos)
    - [Modelo de Datos Relacional (Diagrama Entidad-Relación - ERD)](#modelo-de-datos-relacional-diagrama-entidad-relación---erd)
    - [Modelo de Datos NoSQL (MongoDB/JSON Schema)](#modelo-de-datos-nosql-mongodbjson-schema)
    - [⚡ Despliegue Rápido con master_setup.sh \[BETA\]](#-despliegue-rápido-con-master_setupsh-beta)
      - [Requisitos previos](#requisitos-previos)
      - [Paso 1: Configurar credenciales](#paso-1-configurar-credenciales)
      - [Paso 2: Ejecutar el script](#paso-2-ejecutar-el-script)
      - [Opciones disponibles](#opciones-disponibles)
    - [📝 Despliegue Manual (Paso a Paso)](#-despliegue-manual-paso-a-paso)
    - [🔄 Paso 1: Transformación de Datos (ETL)](#-paso-1-transformación-de-datos-etl)
    - [🛡️ Paso 2: Aplicar Validaciones (Schema Validation)](#️-paso-2-aplicar-validaciones-schema-validation)
    - [📥 Paso 3: Ingesta de Datos](#-paso-3-ingesta-de-datos)
    - [⚡ Paso 4: Indexación Inteligente](#-paso-4-indexación-inteligente)
  - [📊 Analytics y Consultas](#-analytics-y-consultas)
    - [🔎 Pipelines Implementados](#-pipelines-implementados)
  - [📁 Estructura del Proyecto](#-estructura-del-proyecto)
  - [📈 Análisis de Performance (Explain Plan)](#-análisis-de-performance-explain-plan)
  - [📊 MongoDB Charts Dashboard](#-mongodb-charts-dashboard)
  - [👥 Equipo de Desarrollo](#-equipo-de-desarrollo)

---

## 📋 Descripción del Proyecto

**GlobalMarket** es una implementación completa de un sistema de comercio electrónico utilizando **MongoDB Atlas**. Este proyecto demuestra la transición de un modelo relacional tradicional a una arquitectura documental NoSQL, diseñada específicamente para manejar **Big Data en E-commerce**.

<br/>

<div align="center">

|    🎯 Objetivo    | 📌 Descripción                                     |
| :---------------: | :------------------------------------------------- |
|   **Migración**   | Transición de modelo relacional a NoSQL documental |
| **Escalabilidad** | Arquitectura preparada para millones de documentos |
|   **Analytics**   | Dashboards en tiempo real con MongoDB Charts       |
|   **Búsqueda**    | Full-text search con Atlas Search (Lucene)         |

</div>

### ¿Por qué MongoDB para E-commerce?

<br/>

El sistema ha sido optimizado para resolver los principales desafíos del comercio electrónico moderno:

- ⚡ **Alto rendimiento** en consultas de agregación complejas
- 📊 **Analytics en tiempo real** para dashboards de ventas
- 🔍 **Búsqueda inteligente** (Fuzzy Search) con Atlas Search
- 🛡️ **Integridad de datos** mediante validaciones estrictas JSON Schema
- 🚀 **Escalabilidad horizontal** nativa de MongoDB

---

## ✨ Características Principales

<br/>

<table>
<tr>
<td width="50%">

### 🎯 Modelado de Datos

- **Hybrid Pattern**: Embedding + Referencing
- **Computed Pattern**: Métricas pre-calculadas
- **Snapshot Pattern**: Historial de precios y direcciones

</td>
<td width="50%">

### 🔒 Calidad de Datos

- Validaciones `jsonSchema` en 4 colecciones
- Reglas de negocio a nivel de DB
- Precios positivos, emails válidos, ratings 0-5

</td>
</tr>
<tr>
<td width="50%">

### 🚀 Performance

- Índices compuestos estratégicos
- Atlas Search (Lucene) para full-text
- Índices únicos para integridad

</td>
<td width="50%">

### 📊 Analytics

- 5 Pipelines de agregación complejos
- `$lookup`, `$unwind`, `$bucket`, `$graphLookup`
- Análisis de cohortes y segmentación VIP

</td>
</tr>
</table>

---

## 🏗️ Arquitectura de Datos

### Modelo de Datos Relacional (Diagrama Entidad-Relación - ERD)

<br/>

```mermaid
erDiagram
    PRODUCTS ||--o{ REVIEWS : "tiene"
    USERS ||--o{ REVIEWS : "escribe"
    CATEGORIES ||--o{ PRODUCTS : "contiene"

    PRODUCTS {
        string product_id PK
        string product_name
        decimal discounted_price
        decimal actual_price
        float discount_percentage
        float rating
        int rating_count
        text about_product
        string img_link
        string product_link
        string category_id FK
        datetime created_at
    }

    USERS {
        string user_id PK
        string user_name
        datetime created_at
    }

    REVIEWS {
        string review_id PK
        string product_id FK
        string user_id FK
        string review_title
        text review_content
        datetime review_date
    }

    CATEGORIES {
        string category_id PK
        string category_name
    }
```

<br/>

### Modelo de Datos NoSQL (MongoDB/JSON Schema)

<br/>

```mermaid
erDiagram
    PRODUCTS ||--o{ REVIEWS : "has (Referenced)"
    USERS ||--o{ SALES : "places (Referenced)"
    PRODUCTS ||--o{ SALES : "contains (Referenced)"
    USERS ||--o{ REVIEWS : "writes (Referenced)"

    PRODUCTS {
        string product_id PK
        string name
        object category "Embedded"
        object pricing "Embedded"
        object rating "Embedded"
        array specifications
    }

    REVIEWS {
        string review_id PK
        string product_id FK
        string user_id FK
        int rating
        string content
        bool verified_purchase
    }

    SALES {
        string sale_id PK
        string product_id FK
        string user_id FK
        number total_amount
        object shipping "Snapshot"
        string status
    }

    USERS {
        string user_id PK
        string name
        string email "Unique Index"
        int total_reviews
    }
```

<br/>

> [!NOTE]
> La colección “sales” actúa como el núcleo transaccional del ecosistema GlobalMarket Analytics. Aunque ha sido generada sintéticamente, su estructura está diseñada para representar fielmente el flujo de compra, vinculando las entidades de users y products para permitir un análisis profundo del comportamiento comercial.

<br/>

### ⚡ Despliegue Rápido con master_setup.sh [BETA]

La forma más rápida de desplegar todo el proyecto es usando el script automatizado `master_setup.sh`.

#### Requisitos previos

- **Git Bash** o terminal compatible con Bash
- Cuenta en **MongoDB Atlas** con un cluster configurado
- **MongoDB Database Tools** instalado (`mongoimport`)
- **mongosh** instalado

#### Paso 1: Configurar credenciales

Edita el archivo `.env` en la raíz del proyecto con tus credenciales de MongoDB Atlas:

```bash
# MongoDB Atlas Credentials
MONGO_USER="tu_usuario"
MONGO_PASSWORD="tu_contraseña"
MONGO_CLUSTER="cluster0.xxxxx.mongodb.net"

# Database name (opcional, por defecto "globalmarket")
DB_NAME="globalmarket"
```

> [!TIP]
> Para obtener el nombre del cluster, ve a MongoDB Atlas → Connect → Shell y copia el hostname.

#### Paso 2: Ejecutar el script

Desde **Git Bash**, ejecuta:

```bash
./master_setup.sh
```

El script realizará automáticamente:

1. ✅ Verificación de herramientas (mongoimport, mongosh, Python)
2. ✅ Conexión a MongoDB Atlas usando las credenciales del `.env`
3. ✅ Importación de datos JSON (products, users, sales, reviews)
4. ✅ Aplicación de validaciones JSON Schema
5. ✅ Creación de índices optimizados
6. ✅ Verificación de la importación

#### Opciones disponibles

```bash
./master_setup.sh --help
```

| Opción              | Descripción                               |
| :------------------ | :---------------------------------------- |
| `--uri <string>`    | Especificar connection string manualmente |
| `--skip-validation` | Omitir validación de esquema              |
| `--skip-indexes`    | Omitir creación de índices                |
| `--skip-verify`     | Omitir verificación final                 |

> [!IMPORTANT]
> El archivo `.env` contiene credenciales sensibles y está incluido en `.gitignore`. **Nunca subas este archivo a repositorios públicos.**

<br/>

---

### 📝 Despliegue Manual (Paso a Paso)

Si prefieres ejecutar cada paso manualmente, sigue las instrucciones a continuación.

<br/>

### 🔄 Paso 1: Transformación de Datos (ETL)

Prepara el dataset crudo (CSV) y conviértelo a documentos JSON estructurados.

```bash
python src/data/transform_data.py
```

> [!TIP]
> **Resultado:** Se generarán 4 archivos JSON en `data/processed/` listos para importar.

```bash
python src/data/transform_validate_data.py
```

> [!TIP]
> **Resultado:** Se validan los datos JSON en `data/processed/`.

<br/>

> [!NOTE]
> Los scripts de python para Transformación de Datos (ETL) ha sido incluido para ofrecer una flexibilidad en el proceso de ETL (Extract, Transform, Load). Sin embargo, si deseas omitir el paso de transformación en Python y cargar directamente los archivos JSON pre-procesados, puedes hacerlo. Estos archivos optimizados están ya disponibles en la ruta data/process, listos para ser utilizados con la herramienta nativa mongoimport en los siguientes pasos.

<br/>

### 🛡️ Paso 2: Aplicar Validaciones (Schema Validation)

<br/>

```javascript
// Conectarse al cluster Atlas
mongosh "mongodb+srv://<usuario>:<password>@cluster.mongodb.net/globalmarket"

// Ejecutar script de validación
load("validation.js")
```

> [!IMPORTANT]
> Las validaciones incluyen:
>
> - ✅ `price >= 0`
> - ✅ `email` con formato regex válido
> - ✅ `rating` entre 0 y 5

### 📥 Paso 3: Ingesta de Datos

```bash
# Reemplazar TU_STRING con tu connection string de Atlas
mongoimport --uri "TU_STRING" --db globalmarket --collection products --file data/processed/products.json --jsonArray --drop
mongoimport --uri "TU_STRING" --db globalmarket --collection users --file data/processed/users.json --jsonArray --drop
mongoimport --uri "TU_STRING" --db globalmarket --collection sales --file data/processed/sales.json --jsonArray --drop
mongoimport --uri "TU_STRING" --db globalmarket --collection reviews --file data/processed/reviews.json --jsonArray --drop
```

<br/>

### ⚡ Paso 4: Indexación Inteligente

<br/>

```javascript
// Desde mongosh conectado:
load("index.js");
```

> [!NOTE]
> Este script crea índices compuestos y configura Atlas Search para búsquedas de texto completo.

<br/>

---

## 📊 Analytics y Consultas

Para ejecutar los pipelines de análisis de negocio:

```javascript
load("queries.js");
```

### 🔎 Pipelines Implementados

<details>
<summary><strong>🏆 Pipeline 1: Ventas por Categoría y Mes</strong></summary>

**Objetivo:** Reporte financiero mensual

| Stage        | Operación                    |
| :----------- | :--------------------------- |
| `$lookup`    | Unir con productos           |
| `$unwind`    | Expandir arrays              |
| `$addFields` | Extraer componentes de fecha |
| `$group`     | Sumar ventas por categoría   |
| `$project`   | Formatear resultado final    |

**Resultado:** Tabla con Total Ventas ($), Unidades y Ticket Promedio por categoría.

</details>

<details>
<summary><strong>⭐ Pipeline 2: Top Productos (Ranking Ponderado)</strong></summary>

**Objetivo:** Identificar "Best Sellers" reales

**Fórmula de Score:**

```
Score = Rating × ln(Número de Reviews)
```

**Filtro:** Solo productos con >50 reseñas para resultados estadísticamente significativos.

</details>

<details>
<summary><strong>💰 Pipeline 3: Bucket Pattern (Rangos de Precio)</strong></summary>

**Objetivo:** Segmentación de mercado

| Categoría  | Rango de Precio  |
| :--------- | :--------------- |
| 🟢 Budget  | $0 - $500        |
| 🔵 Economy | $500 - $2,000    |
| 🟡 Premium | $2,000 - $10,000 |
| 🔴 Luxury  | $10,000+         |

**Técnica:** Uso de `$bucket` para agrupación automática.

</details>

<details>
<summary><strong>👑 Pipeline 4: Análisis VIP (Bonus)</strong></summary>

**Objetivo:** CRM y Fidelización

**Métrica VIP:**

```
VIP Score = Gasto Total × (1 + Frecuencia de Compra / 10)
```

**Resultado:** Lista priorizada de usuarios para campañas de marketing dirigidas.

</details>

<details>
<summary><strong>🌍 Pipeline 5: Tendencias Geográficas (Bonus)</strong></summary>

**Objetivo:** Optimización logística

**Análisis:**

- Ventas por ciudad
- Tasa de éxito de entregas (`completed` vs `cancelled`)
- Identificación de zonas con alta demanda

</details>

<br/>

---

## 📁 Estructura del Proyecto

<br/>

```
globalmarket-analytics/
├── 📂 data/
│   ├── 📂 raw/                             # Dataset original (CSV)
│   └── 📂 processed/                       # JSONs generados por ETL
├── 📂 docs/
│   ├── 📂 assets/                          # Recursos visuales
│   ├── 📂 diagrams/                        # Diagramas del proyecto
│   ├── 📂 schema/                          # Documentación de schemas
│   └── 📂 screenshots/                     # Capturas de pantalla
├── 📂 scripts/
│   ├── 📄 data/transform_data.py           # Script ETL (Python)
│   ├── 📄 data/transform_validate_data.py  # Script de Validacion
│   ├── 📄 validation.js                    # Reglas JSON Schema
│   ├── 📄 index.js                         # Estrategia de indexación
│   └── 📄 queries.js                       # Pipelines de agregación
├── 📄 README.md                            # Documentación principal
├── 📄 master_setup.sh                      # Script de configuración
```

<br/>

---

## 📈 Análisis de Performance (Explain Plan)

Demostración del impacto de los índices en el tiempo de respuesta:

**Consulta de prueba:** _Buscar productos en categoría "Electronics"_

| 📊 Escenario  | 🔍 Tipo de Búsqueda | ⏱️ Tiempo             | 📄 Docs Examinados    |
| :------------ | :------------------ | :-------------------- | :-------------------- |
| ❌ Sin Índice | `COLLSCAN`          | ~150ms                | 1,465 (Todos)         |
| ✅ Con Índice | `IXSCAN`            | **~5ms**              | 450 (Solo relevantes) |
| 📈 **Mejora** | —                   | **30x más rápido** 🚀 | **-70% documentos**   |

> [!TIP]
> La estrategia de indexación reduce dramáticamente el tiempo de respuesta y el uso de recursos.

---

## 📊 MongoDB Charts Dashboard

<div align="center">

[![MongoDB Charts](https://img.shields.io/badge/Ver_Dashboard-MongoDB_Charts-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://charts.mongodb.com/charts-globalmarket-analytics-se-vttjgmj/public/dashboards/c0145842-7bb1-45c2-bc1c-2493fbf35571)

**Accede al dashboard interactivo con visualizaciones en tiempo real**

</div>

---

## 👥 Equipo de Desarrollo

<div align="center">

Este proyecto fue desarrollado para la asignatura **Sistemas de Bases de Datos II** de la UNEG.

| 🎭 Rol                    | 📋 Responsabilidad                                 | 👤 Integrante             |
| :------------------------ | :------------------------------------------------- | :------------------------ |
| **🏗️ Data Architect**     | Modelado de esquemas, ETL y diseño de colecciones  | [Nombre del Integrante 1] |
| **🔐 Security Engineer**  | Implementación de validaciones JSON Schema y tests | [Nombre del Integrante 2] |
| **📊 Analytics Engineer** | Desarrollo de Pipelines y optimización de índices  | [Nombre del Integrante 3] |

</div>

---

<div align="center">

**Hecho con ❤️ por el Equipo GlobalMarket**

![UNEG](https://img.shields.io/badge/UNEG-2025-blue?style=flat-square)
![MongoDB](https://img.shields.io/badge/Powered_by-MongoDB-47A248?style=flat-square&logo=mongodb)

_Sistemas de Bases de Datos II • Semestre 2025-II_

</div>
