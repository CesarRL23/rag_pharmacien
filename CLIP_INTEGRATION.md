# 🖼️ CLIP Integration Guide - Embeddings de Imágenes

**Actualizado:** 3 de diciembre de 2025  
**Estado:** ✅ Implementado

## 📋 Resumen

Se ha integrado **CLIP (Contrastive Language-Image Pre-training)** en el servicio de embeddings para generar vectores reales de imágenes en lugar de valores dummy.

---

## 🎯 ¿Qué es CLIP?

CLIP es un modelo entrenado por OpenAI que entiende tanto texto como imágenes. Genera embeddings de **512 dimensiones** que representan el contenido visual y semántico de las imágenes.

**Ventajas:**
- ✅ Búsqueda multimodal (texto-imagen)
- ✅ Embeddings coherentes con semántica visual
- ✅ Compatible con `@xenova/transformers` (sin GPU requerida)
- ✅ Modelo: `Xenova/clip-vit-base-patch32`

---

## 📦 Dependencia Instalada

```bash
# Ya incluida en package.json
"@xenova/transformers": "^2.10.0"
```

No se requieren instalaciones adicionales.

---

## 🔧 Implementación

### Archivo Principal: `src/services/embeddingService.js`

#### Nuevos métodos:

**1. `initializeCLIP()`**
```javascript
await embeddingService.initializeCLIP();
```
Inicializa el modelo CLIP la primera vez que se usa. Cached posteriormente.

**2. `generateImageEmbedding(imageUrl)`**
```javascript
const result = await embeddingService.generateImageEmbedding(
  'https://example.com/image.jpg'
);
// Retorna:
// {
//   embedding: Array(512),
//   dimensiones: 512,
//   modelo: 'Xenova/clip-vit-base-patch32',
//   tiempo_ms: 2500,
//   fuente: 'CLIP'
// }
```

**3. `_extractImageFeatures(imageBuffer)` (Interno)**
Extrae características visuales de un buffer de imagen.

**4. `_generateFallbackImageEmbedding(imageUrl)` (Fallback)**
Si CLIP falla, genera un embedding determinista basado en la URL para consistencia.

---

## 🧪 Testing

### Ejecutar tests de CLIP:
```bash
npm run test-clip
```

#### Qué se prueba:
- ✅ Inicialización del servicio
- ✅ Generación de embeddings de texto
- ✅ Generación de embeddings de imagen
- ✅ Cálculo de similitud coseno
- ✅ Batch processing
- ✅ Estructura y validación de embeddings

#### Resultado esperado:
```
═══════════════════════════════════════════════════
🔬 TEST DE CLIP - Embeddings de Imágenes
═══════════════════════════════════════════════════

📌 Test 1: Inicializar servicio de embeddings
✅ Servicio inicializado correctamente

[... más tests ...]

✅ TODOS LOS TESTS PASARON CORRECTAMENTE
═══════════════════════════════════════════════════
```

---

## 🚀 Uso en Ingesta de Imágenes

### Script: `scripts/ingest-images.js`

El script de ingesta ahora genera embeddings reales:

```javascript
const embeddingService = require('../src/services/embeddingService');

// Durante ingesta:
for (const image of images) {
  const embedResult = await embeddingService.generateImageEmbedding(image.url);
  
  // Guardar en colección de embeddings
  await Embedding.create({
    embedding: embedResult.embedding,
    referenceId: image._id,
    referenceCollection: 'images',
    tipo: 'image',
    modelo: embedResult.modelo,
    fecha: new Date(),
    metadata: {
      fuente: embedResult.fuente,
      dimensiones: embedResult.dimensiones
    }
  });
}
```

---

## 🔍 Búsqueda Multimodal

Con CLIP integrado, ahora puedes:

### 1. Buscar imágenes por descripción textual:
```javascript
// Generar embedding de texto
const queryEmbedding = await embeddingService.generateTextEmbedding(
  'Medicamento en tableta roja'
);

// Buscar imágenes similares
const results = await vectorSearchService.searchByText(
  'Medicamento en tableta roja',
  {
    vectorIndexName: 'vector_index_embeddings_img_512',
    filters: { tipo: 'image' }
  }
);
```

### 2. Encontrar imágenes similares:
```javascript
const similarImages = await vectorSearchService.findSimilar(
  imageEmbedding,
  candidateEmbeddings,
  topK: 5
);
```

---

## ⚙️ Configuración

### Variables de entorno (`.env`):

```bash
# Dimensiones de embeddings
TEXT_EMBEDDING_DIM=384          # MiniLM-L6-v2
IMAGE_EMBEDDING_DIM=512         # CLIP ViT-Base-Patch32
```

### Índice MongoDB para imágenes:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 512,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "tipo"
    }
  ]
}
```

---

## 📊 Comparativa: Antes vs Después

| Aspecto | Antes | Después |
|---------|-------|---------|
| Embeddings de imagen | ❌ Dummy (aleatorio) | ✅ CLIP Real (512D) |
| Búsqueda multimodal | ❌ No funcional | ✅ Texto-Imagen |
| Similitud imagen-imagen | ❌ Falsa | ✅ Semántica real |
| Consistencia | ❌ Aleatorio c/ ejecución | ✅ Determinista (CLIP) |
| Requisito API externo | ❌ No | ✅ No (local) |

---

## 🎓 Ejemplo Completo

```javascript
const embeddingService = require('./src/services/embeddingService');

async function searchImagesByDescription() {
  // Inicializar
  await embeddingService.initialize();
  
  // 1. Generar embedding de descripción textual
  const textEmbedding = await embeddingService.generateTextEmbedding(
    'Pastillas redondas de color blanco'
  );
  console.log('Texto embedding:', textEmbedding.embedding.slice(0, 5));
  
  // 2. Generar embedding de imagen
  const imageEmbedding = await embeddingService.generateImageEmbedding(
    'https://example.com/medicamento.jpg'
  );
  console.log('Imagen embedding:', imageEmbedding.embedding.slice(0, 5));
  
  // 3. Calcular similitud
  const similarity = embeddingService.cosineSimilarity(
    textEmbedding.embedding,
    imageEmbedding.embedding
  );
  console.log('Similitud:', similarity.toFixed(4));
}

searchImagesByDescription();
```

---

## 🐛 Troubleshooting

### Error: "CLIP model not initialized"
```bash
# Solución: Llamar initializeCLIP() antes de usar:
await embeddingService.initializeCLIP();
```

### Error: "Failed to download CLIP model"
```bash
# Pueden pasar minutos en primera ejecución
# CLIP se cachea en ~/.cache/huggingface
# Asegurate de tener conexión a internet
```

### Imágenes grandes tardan mucho
```bash
# Usar URLs más pequeñas (< 5MB)
# O procesar en batch asincrónico:
Promise.all(urls.map(url => generateImageEmbedding(url)));
```

---

## 📈 Próximos Pasos

1. ✅ Ingestar 50+ imágenes reales con `npm run ingest-images`
2. ✅ Probar búsqueda multimodal con `npm run test-clip`
3. ⏳ Implementar endpoint `/api/search/multimodal`
4. ⏳ Agregar búsqueda por imagen (reverse search)

---

## 📚 Referencias

- [CLIP Paper](https://arxiv.org/abs/2103.14030)
- [@xenova/transformers](https://github.com/xenova/transformers.js)
- [Xenova CLIP](https://huggingface.co/Xenova/clip-vit-base-patch32)

---

**Documento:** CLIP Integration Guide  
**Última actualización:** 3 de diciembre de 2025
