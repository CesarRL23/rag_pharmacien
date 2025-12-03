# 🚀 Sistema RAG NoSQL con MongoDB Atlas Vector Search

Sistema completo de Retrieval-Augmented Generation (RAG) usando MongoDB Atlas, Node.js, y Groq API para generación de respuestas con LLM.

## 📋 Tabla de Contenidos

1. [Características](#características)
2. [Arquitectura](#arquitectura)
3. [Requisitos Previos](#requisitos-previos)
4. [Instalación](#instalación)
5. [Configuración](#configuración)
6. [Uso](#uso)
7. [API Endpoints](#api-endpoints)
8. [Ejemplos de Uso](#ejemplos-de-uso)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

## ✨ Características

- **Búsqueda Vectorial**: Búsqueda semántica usando embeddings de 384 dimensiones (MiniLM-L6-v2)
- **Búsqueda Híbrida**: Combina búsqueda vectorial con filtros de metadatos
- **Pipeline RAG Completo**: Recuperación + generación de respuestas con Groq/Llama 3.1
- **Búsqueda Multimodal**: Soporte para búsqueda texto-imagen (preparado para CLIP)
- **Arquitectura NoSQL**: Diseño optimizado con MongoDB y Atlas Vector Search
- **API RESTful**: Endpoints bien documentados y fáciles de usar
- **Escalable**: Diseño preparado para manejar grandes volúmenes de datos

## 🏗️ Arquitectura

```
┌─────────────┐
│   Cliente   │
└──────┬──────┘
       │
       │ HTTP Request
       │
┌──────▼──────────────────────────────────────┐
│          Express.js Server                   │
│  ┌────────────────────────────────────────┐ │
│  │         Routes Layer                    │ │
│  │  /api/search  │  /api/rag              │ │
│  └──────┬──────────────┬───────────────────┘ │
│         │              │                      │
│  ┌──────▼──────┐  ┌───▼──────────┐          │
│  │ Controllers │  │  Controllers  │          │
│  └──────┬──────┘  └───┬───────────┘          │
│         │              │                      │
│  ┌──────▼──────────────▼───────────────────┐ │
│  │         Services Layer                   │ │
│  │  • embeddingService                      │ │
│  │  • vectorSearchService                   │ │
│  │  • ragService                            │ │
│  └──────┬───────────────┬──────────────────┘ │
└─────────┼───────────────┼────────────────────┘
          │               │
          │               │
┌─────────▼───────┐  ┌───▼──────────────────┐
│  Transformers.js│  │    Groq API          │
│  (Embeddings)   │  │  (Llama 3.1)         │
└─────────────────┘  └──────────────────────┘
          │
          │
┌─────────▼────────────────────────────────────┐
│        MongoDB Atlas                          │
│  ┌──────────────────────────────────────┐   │
│  │  Collections:                         │   │
│  │  • documents (texto + metadata)       │   │
│  │  • embeddings (vectores 384-dim)      │   │
│  │  • images (referencias)               │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │  Indexes:                             │   │
│  │  • Vector Search (cosine, kNN)        │   │
│  │  • Text Search (full-text)            │   │
│  │  • Compound (fecha + idioma)          │   │
│  └──────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

## 📦 Requisitos Previos

- **Node.js**: >= 18.0.0
- **MongoDB Atlas**: Cuenta activa con cluster M0 o superior
- **Groq API Key**: Para generación de respuestas (obtener en https://console.groq.com)

## 🔧 Instalación

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd rag-mongodb-system
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copiar `.env.example` a `.env`:

```bash
cp .env.example .env
```

Editar `.env` con tus credenciales:

```env
# MongoDB Atlas
MONGO_URI=mongodb+srv://username:password@cluster0.mongodb.net/
MONGO_DB_NAME=rag_pharmacien

# Groq API
GROQ_API_KEY=tu_groq_api_key_aqui

# Configuración
TEXT_EMBEDDING_DIM=384
IMAGE_EMBEDDING_DIM=512
PORT=3000
NODE_ENV=development
```

### 4. Crear índices en MongoDB

```bash
npm run create-indexes
```

**IMPORTANTE**: Después de ejecutar este script, debes crear manualmente el índice vectorial en MongoDB Atlas:

1. Ve a MongoDB Atlas → tu cluster → Browse Collections
2. Selecciona tu base de datos
3. Haz clic en "Search Indexes"
4. Crea un nuevo "Atlas Vector Search Index"
5. Usa esta configuración:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 384,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "tipo"
    }
  ]
}
```

6. Nombra el índice como: `vector_index_embeddings`
7. Selecciona la colección: `embeddings`
8. Espera 2-5 minutos a que se construya

### 5. Ingerir datos de ejemplo

```bash
npm run ingest-docs
```

Este script:
- Carga 8 documentos de ejemplo sobre farmacología
- Genera embeddings para cada documento
- Los guarda en la base de datos

### 6. Iniciar servidor

```bash
# Producción
npm start

# Desarrollo (con nodemon)
npm run dev
```

El servidor iniciará en `http://localhost:3000`

## 🎯 Uso

### Health Check

Verificar que el servidor está corriendo:

```bash
curl http://localhost:3000/health
```

### Ejecutar Demo Completa

Para ejecutar los 5 ejemplos requeridos automáticamente:

```bash
node scripts/test-examples.js
```

Este script ejecutará:
1. ✅ Búsqueda Semántica Simple
2. ✅ Búsqueda Híbrida con Filtros
3. ✅ RAG - Pregunta Compleja
4. ✅ Búsqueda Multimodal
5. ✅ RAG Contextualizado

## 📡 API Endpoints

### POST /api/search

Búsqueda vectorial o híbrida de documentos.

**Request:**
```json
{
  "query": "medicamentos para el dolor",
  "filters": {
    "tipo": "medicamento",
    "idioma": "es"
  },
  "hybrid": false,
  "limit": 10
}
```

**Response:**
```json
{
  "success": true,
  "query": "medicamentos para el dolor",
  "results": [
    {
      "document": {
        "_id": "...",
        "titulo": "Ibuprofeno: Uso y Precauciones",
        "contenido": "...",
        "tipo": "medicamento",
        "tags": ["antiinflamatorio", "analgésico"]
      },
      "score": 0.89
    }
  ],
  "metadata": {
    "total_results": 5,
    "query_embedding_time_ms": 45,
    "search_time_ms": 120,
    "total_time_ms": 165
  }
}
```

### POST /api/rag

Pipeline RAG completo con generación de respuesta.

**Request:**
```json
{
  "pregunta": "¿Qué precauciones debo tener con el ibuprofeno?",
  "contexto_adicional": "Paciente de 65 años",
  "max_contexto": 3,
  "temperature": 0.7
}
```

**Response:**
```json
{
  "success": true,
  "respuesta": "El ibuprofeno requiere varias precauciones importantes...",
  "pregunta": "¿Qué precauciones debo tener con el ibuprofeno?",
  "contexto_usado": 3,
  "fuentes": [
    {
      "_id": "...",
      "titulo": "Ibuprofeno: Uso y Precauciones",
      "tipo": "medicamento",
      "score": 0.92
    }
  ],
  "metadata": {
    "modelo": "llama-3.1-70b-versatile",
    "tokens_usados": 450,
    "tiempo_busqueda_ms": 120,
    "tiempo_llm_ms": 890,
    "tiempo_total_ms": 1010
  }
}
```

### POST /api/search/multimodal

Búsqueda multimodal (texto a imagen).

**Request:**
```json
{
  "query": "pastillas redondas blancas",
  "tipo": "text-to-image",
  "limit": 5
}
```

### GET /api/search/similar/:documentId

Encuentra documentos similares a uno dado.

```bash
curl http://localhost:3000/api/search/similar/65f3b7c8d9e1234567890abc?limit=5
```

### POST /api/rag/conversational

RAG con historial de conversación.

**Request:**
```json
{
  "mensajes": [
    {"role": "user", "content": "¿Qué es el ibuprofeno?"},
    {"role": "assistant", "content": "El ibuprofeno es un antiinflamatorio..."},
    {"role": "user", "content": "¿Tiene efectos secundarios?"}
  ],
  "max_contexto": 3
}
```

## 🧪 Ejemplos de Uso Detallados

### Ejemplo 1: Búsqueda Semántica Simple

```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "medicamentos para el dolor de cabeza",
    "limit": 5
  }'
```

**Qué hace:**
- Convierte el query a embedding vectorial (384 dimensiones)
- Busca documentos con embeddings similares usando cosine similarity
- Retorna los top-5 más relevantes

### Ejemplo 2: Búsqueda Híbrida con Filtros

```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "antibióticos efectivos",
    "filters": {
      "tipo": "medicamento",
      "idioma": "es"
    },
    "hybrid": true,
    "limit": 5
  }'
```

**Qué hace:**
- Combina búsqueda vectorial con búsqueda de texto tradicional
- Aplica filtros de metadata (tipo, idioma)
- Pondera resultados: 70% vectorial + 30% texto
- Re-rankea y retorna los mejores resultados

### Ejemplo 3: RAG - Pregunta Compleja

```bash
curl -X POST http://localhost:3000/api/rag \
  -H "Content-Type: application/json" \
  -d '{
    "pregunta": "¿Qué precauciones debo tener al tomar ibuprofeno con otros medicamentos?",
    "max_contexto": 3,
    "temperature": 0.7
  }'
```

**Pipeline completo:**
1. **Embedding**: Convierte pregunta a vector
2. **Retrieval**: Busca los 3 documentos más relevantes
3. **Prompt Engineering**: Construye prompt con contexto
4. **Generation**: Groq API genera respuesta
5. **Post-processing**: Formatea y añade citas

### Ejemplo 4: Búsqueda Multimodal

```bash
curl -X POST http://localhost:3000/api/search/multimodal \
  -H "Content-Type: application/json" \
  -d '{
    "query": "pastillas para la presión arterial",
    "tipo": "text-to-image",
    "limit": 5
  }'
```

**Nota**: Este ejemplo está preparado pero requiere implementación completa de CLIP para producción.

### Ejemplo 5: RAG Contextualizado

```bash
curl -X POST http://localhost:3000/api/rag \
  -H "Content-Type: application/json" \
  -d '{
    "pregunta": "¿Qué medicamento me recomiendas?",
    "contexto_adicional": "Paciente de 65 años con hipertensión que toma aspirina diaria",
    "max_contexto": 5,
    "filters": {
      "tipo": "medicamento"
    }
  }'
```

**Qué hace:**
- Incluye el contexto del paciente en el prompt
- Filtra solo documentos de tipo "medicamento"
- Genera respuesta personalizada considerando el perfil del paciente

## 🧪 Testing

### Ejecutar tests unitarios

```bash
npm test
```

### Validar performance

```bash
# Búsqueda debe ser < 200ms
# RAG completo debe ser < 2000ms
node scripts/test-examples.js
```

### Casos de prueba recomendados

1. **Precisión Semántica**: Buscar "dolor muscular" debe encontrar documentos sobre ibuprofeno
2. **Filtros**: Verificar que filtros de tipo e idioma funcionan correctamente
3. **Calidad RAG**: Las respuestas deben citar fuentes correctamente
4. **Manejo de errores**: Preguntas sin contexto relevante deben manejarse gracefully
5. **Performance**: Medir tiempos de respuesta bajo carga

## 🔧 Troubleshooting

### Error: "Cannot find module"

```bash
rm -rf node_modules package-lock.json
npm install
```

### Error: "MongoDB connection failed"

1. Verifica que `MONGO_URI` esté correcta en `.env`
2. Verifica tu IP en la whitelist de MongoDB Atlas
3. Verifica que el usuario/contraseña sean correctos

### Error: "Vector search not working"

1. Verifica que el índice vectorial esté creado en Atlas
2. El índice debe llamarse exactamente `vector_index_embeddings`
3. Las dimensiones deben ser 384
4. El índice tarda 2-5 minutos en construirse

### Error: "Groq API key invalid"

1. Verifica que `GROQ_API_KEY` esté en `.env`
2. Obtén una key válida en https://console.groq.com
3. Verifica que no haya espacios extra en la key

### Embeddings muy lentos

En la primera ejecución, el modelo se descarga (~30MB). Las ejecuciones subsecuentes serán más rápidas.

### RAG no genera respuestas

1. Verifica que Groq API key sea válida
2. Verifica que haya documentos en la base de datos
3. Revisa los logs del servidor para más detalles

## 📊 Estructura de la Base de Datos

### Colección: documents

```javascript
{
  _id: ObjectId("..."),
  titulo: "Ibuprofeno: Uso y Precauciones",
  contenido: "El ibuprofeno es...",
  tipo: "medicamento",  // medicamento | procedimiento | guia | articulo
  idioma: "es",
  fecha: ISODate("2024-01-15"),
  tags: ["antiinflamatorio", "analgésico"],
  metadata: {
    autor: "Dr. García",
    fuente: "Manual de Farmacología"
  },
  created_at: ISODate("2024-11-20"),
  updated_at: ISODate("2024-11-20")
}
```

### Colección: embeddings

```javascript
{
  _id: ObjectId("..."),
  tipo: "text",  // text | image
  embedding: [0.123, -0.456, ...],  // 384 dimensiones
  referenceId: ObjectId("..."),  // Referencia al documento
  referenceCollection: "documents",
  modelo: "all-MiniLM-L6-v2",
  dimensiones: 384,
  fecha: ISODate("2024-11-20"),
  created_at: ISODate("2024-11-20")
}
```

### Colección: images

```javascript
{
  _id: ObjectId("..."),
  url: "https://example.com/image.jpg",
  titulo: "Ibuprofeno 400mg",
  descripcion: "Comprimidos recubiertos",
  tipo: "medicamento",
  metadata: {},
  fecha: ISODate("2024-01-15")
}
```

## 🎓 Conceptos Clave

### Embeddings

Los embeddings son representaciones vectoriales de texto que capturan el significado semántico. Dos textos con significado similar tendrán embeddings similares, incluso si usan palabras diferentes.

### Vector Search

MongoDB Atlas Vector Search usa índices kNN (k-Nearest Neighbors) optimizados con HNSW (Hierarchical Navigable Small World) para búsquedas rápidas en espacios de alta dimensión.

### RAG (Retrieval-Augmented Generation)

RAG combina recuperación de información con generación de lenguaje:
1. **Retrieval**: Encuentra documentos relevantes usando embeddings
2. **Augmentation**: Enriquece el prompt con el contexto recuperado  
3. **Generation**: El LLM genera una respuesta basada en el contexto

### Búsqueda Híbrida

Combina múltiples estrategias de búsqueda:
- **Vectorial**: Basada en similitud semántica
- **Texto**: Basada en coincidencias de palabras clave
- **Filtros**: Basada en metadata estructurada

## 📚 Recursos

- [MongoDB Atlas Vector Search](https://www.mongodb.com/docs/atlas/atlas-vector-search/)
- [Sentence Transformers](https://www.sbert.net/)
- [Groq API Documentation](https://console.groq.com/docs)
- [Transformers.js](https://huggingface.co/docs/transformers.js)

## 🤝 Contribución

Este es un proyecto académico. Para mejoras:

1. Fork el repositorio
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 Licencia

MIT License - Proyecto Universitario 2025

## ✨ Créditos

Desarrollado como proyecto universitario para el curso de Bases de Datos NoSQL.

**Tecnologías utilizadas:**
- Node.js + Express
- MongoDB Atlas
- Transformers.js (Xenova)
- Groq API (Llama 3.1)
- Vector Search#   r a g _ p h a r m a c i e n  
 