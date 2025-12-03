const { pipeline } = require('@xenova/transformers');

class EmbeddingService {
  constructor() {
    this.textPipeline = null;
    this.initialized = false;
    this.textModel = 'Xenova/all-MiniLM-L6-v2';
    this.imageModel = 'clip-vit-base-patch32'; // placeholder para CLIP
  }

  async initialize() {
    if (this.initialized) return;

    try {
      console.log('🔄 Inicializando modelo de embeddings para texto...');
      this.textPipeline = await pipeline('feature-extraction', this.textModel);
      this.initialized = true;
      console.log('✅ Modelos de embeddings inicializados');
    } catch (error) {
      console.error('❌ Error inicializando modelos de embeddings:', error);
      throw error;
    }
  }

  /** Genera embedding de texto */
  async generateTextEmbedding(text) {
    if (!this.initialized) await this.initialize();

    const startTime = Date.now();
    const output = await this.textPipeline(text, { pooling: 'mean', normalize: true });
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

  /** Genera embedding de imagen (placeholder, usar CLIP real en producción) */
  async generateImageEmbedding(imageUrl) {
    console.warn('⚠️ Embeddings de imagen requiere CLIP - usando dummy por ahora');
    const dummyEmbedding = Array(512).fill(0).map(() => Math.random());
    return {
      embedding: dummyEmbedding,
      dimensiones: 512,
      modelo: this.imageModel,
      tiempo_ms: 0,
      warning: 'Dummy embedding - implementar CLIP real'
    };
  }

  /** Calcula similitud coseno entre dos vectores */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) throw new Error('Dimensiones no coinciden');

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
