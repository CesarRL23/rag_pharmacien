const { pipeline } = require('@xenova/transformers');
const axios = require('axios');

class EmbeddingService {
  constructor() {
    this.textPipeline = null;
    this.imageFeaturePipeline = null;
    this.initialized = false;
    this.clipInitialized = false;
    this.textModel = 'Xenova/all-MiniLM-L6-v2';
    this.imageModel = 'Xenova/clip-vit-base-patch32';
  }

  async initialize() {
    if (this.initialized) return;

    try {
      console.log('🔄 Inicializando modelo de embeddings para texto...');
      this.textPipeline = await pipeline('feature-extraction', this.textModel);
      this.initialized = true;
      console.log('✅ Modelo de texto inicializado');
    } catch (error) {
      console.error('❌ Error inicializando modelo de texto:', error);
      throw error;
    }
  }

  async initializeCLIP() {
    if (this.clipInitialized) return;

    try {
      console.log('🔄 Inicializando modelo CLIP para imágenes...');
      this.imageFeaturePipeline = await pipeline(
        'image-feature-extraction',
        this.imageModel
      );
      this.clipInitialized = true;
      console.log('✅ Modelo CLIP inicializado');
    } catch (error) {
      console.error('❌ Error inicializando CLIP:', error.message);
      throw error;
    }
  }

  /** Genera embedding de texto */
  async generateTextEmbedding(text) {
    if (!this.initialized) await this.initialize();

    const startTime = Date.now();
    const output = await this.textPipeline(text, { 
      pooling: 'mean', 
      normalize: true 
    });
    const embedding = Array.from(output.data);
    const endTime = Date.now();

    return {
      embedding,
      dimensiones: embedding.length,
      modelo: this.textModel,
      tiempo_ms: endTime - startTime
    };
  }

  /** Genera embeddings de un batch de textos */
  async generateBatchTextEmbeddings(texts) {
    const embeddings = [];
    for (const text of texts) {
      embeddings.push(await this.generateTextEmbedding(text));
    }
    return embeddings;
  }

  /** Genera embedding REAL de imagen usando CLIP */
  async generateImageEmbedding(imageInput) {
    await this.initializeCLIP();

    try {
      console.log(`📸 Generando embedding de imagen...`);
      const startTime = Date.now();

      // CLIP puede procesar directamente:
      // 1. URLs (http/https)
      // 2. Rutas de archivo locales
      // 3. Buffers de imagen
      
      let inputForCLIP = imageInput;

      // Si es base64, convertir a Buffer
      if (typeof imageInput === 'string' && !imageInput.startsWith('http')) {
        console.log(`   📄 Convirtiendo base64 a Buffer...`);
        
        // Extraer datos base64 si tiene prefijo data:image
        let base64Data = imageInput;
        if (imageInput.startsWith('data:')) {
          base64Data = imageInput.split(',')[1];
        }
        
        inputForCLIP = Buffer.from(base64Data, 'base64');
        console.log(`   ✓ Buffer creado: ${inputForCLIP.length} bytes`);
      } else if (imageInput.startsWith('http')) {
        console.log(`   🌐 Procesando desde URL directamente...`);
      }

      // Generar embedding con CLIP
      console.log(`   🧠 Ejecutando modelo CLIP...`);
      const output = await this.imageFeaturePipeline(inputForCLIP);

      // Extraer embedding del output
      let embedding;
      if (output && output.data) {
        embedding = Array.from(output.data);
      } else if (Array.isArray(output) && output[0]?.data) {
        embedding = Array.from(output[0].data);
      } else if (Array.isArray(output)) {
        embedding = output;
      } else {
        throw new Error('Formato de salida de CLIP no reconocido');
      }

      // Validar que el embedding sea real (no todos ceros)
      const isValid = embedding.some(val => Math.abs(val) > 0.01);
      if (!isValid) {
        throw new Error('Embedding inválido: todos los valores son cercanos a cero');
      }

      const endTime = Date.now();

      console.log(`   ✅ Embedding generado: ${embedding.length} dims en ${endTime - startTime}ms`);
      console.log(`   📊 Muestra: [${embedding.slice(0, 3).map(v => v.toFixed(4)).join(', ')}...]`);

      return {
        embedding,
        dimensiones: embedding.length,
        modelo: this.imageModel,
        tiempo_ms: endTime - startTime,
        fuente: 'CLIP-REAL'
      };

    } catch (error) {
      console.error(`   ❌ Error generando embedding de imagen: ${error.message}`);
      throw error;
    }
  }

  /** Calcula similitud coseno entre dos vectores */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error(`Dimensiones no coinciden: ${vecA.length} vs ${vecB.length}`);
    }

    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] ** 2;
      normB += vecB[i] ** 2;
    }
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    return (normA && normB) ? dot / (normA * normB) : 0;
  }

  /** Retorna los topK embeddings más similares */
  async findSimilar(queryEmbedding, candidateEmbeddings, topK = 5) {
    const sims = candidateEmbeddings.map((candidate, idx) => ({
      index: idx,
      similarity: this.cosineSimilarity(queryEmbedding, candidate.embedding),
      ...candidate
    }));
    sims.sort((a, b) => b.similarity - a.similarity);
    return sims.slice(0, topK);
  }
}

module.exports = new EmbeddingService();