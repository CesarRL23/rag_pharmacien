// src/services/vectorSearchService.js
const { getDB } = require('../config/db');
const Document = require('../models/Document');
const Image = require('../models/Image');
const embeddingService = require('./embeddingService');

class VectorSearchService {
  constructor() {
    this.db = null;
    this.embeddingsColl = null;
    this.initialized = false;
    this.defaultTextIndex = 'vector_index_embeddings_text_384';
    this.defaultImageIndex = 'vector_index_embeddings_img_512';
    this.defaultTopK = 5;
  }

  async initialize() {
    if (this.initialized) return;
    this.db = getDB();
    this.embeddingsColl = this.db.collection('embeddings');
    this.initialized = true;
  }

  _buildMatch(filters = {}) {
    const match = {};
    if (filters.referenceCollection) match.referenceCollection = filters.referenceCollection;
    if (filters.tipo) match.tipo = filters.tipo;
    if (filters.modelo) match.modelo = filters.modelo;
    if (filters.referenceId) match.referenceId = filters.referenceId;
    if (filters.fechaDesde || filters.fechaHasta) {
      match.fecha = {};
      if (filters.fechaDesde) match.fecha.$gte = new Date(filters.fechaDesde);
      if (filters.fechaHasta) match.fecha.$lte = new Date(filters.fechaHasta);
    }
    if (filters.metadata && typeof filters.metadata === 'object') {
      for (const [k, v] of Object.entries(filters.metadata)) {
        match[`metadata.${k}`] = v;
      }
    }
    return match;
  }

  // ---------- Helper: fetch referenced doc ----------
  async _resolveReference(refCollection, refId) {
    try {
      if (refCollection === 'documents') return await Document.findById(refId);
      if (refCollection === 'images') return await Image.findById(refId);
      return null;
    } catch (e) {
      return null;
    }
  }

  // ---------- searchByText: generate embedding, knnBeta, compute cos locally ----------
  async searchByText(query, options = {}) {
    await this.initialize();
    if (!query || typeof query !== 'string') throw new Error('query debe ser string');

    const limit = options.limit || this.defaultTopK;
    // candidateK: cuantos candidatos sacar del knn para luego rankear localmente
    const candidateK = options.candidateLimit || Math.max(limit * 10, 50);
    const filters = options.filters || {};
    const vectorIndexName = options.vectorIndexName || this.defaultTextIndex;

    const { embedding: queryEmbedding, tiempo_ms } = await embeddingService.generateTextEmbedding(query);

    const pipeline = [
      {
        $search: {
          index: vectorIndexName,
          knnBeta: {
            vector: queryEmbedding,
            path: 'embedding',
            k: candidateK
          }
        }
      }
    ];

    const match = this._buildMatch(filters);
    if (Object.keys(match).length > 0) pipeline.push({ $match: match });

    // Proyectamos EL embedding (necesario para cálculo local), y campos útiles
    pipeline.push(
      {
        $project: {
          referenceId: 1,
          referenceCollection: 1,
          modelo: 1,
          tipo: 1,
          fecha: 1,
          embedding: 1
        }
      },
      { $limit: candidateK }
    );

    const candidates = await this.embeddingsColl.aggregate(pipeline).toArray();

    // Si no hay candidatos regresamos vacío
    if (!candidates || candidates.length === 0) {
      return { query, success: true, results: [], timings: { embed_ms: tiempo_ms } };
    }

    // Calcular similitud coseno localmente y ordenar
    const scored = candidates.map(c => {
      let sim = 0;
      try {
        sim = embeddingService.cosineSimilarity(queryEmbedding, c.embedding);
      } catch (e) {
        sim = 0;
      }
      return { ...c, score: sim };
    });

    // Orden descendente por score
    scored.sort((a, b) => b.score - a.score);

    // Tomar top-K finales
    const top = scored.slice(0, limit);

    // Resolver referencias (Document/Image) — puedes optimizar con $lookup si quieres
    const results = [];
    for (const c of top) {
      const referenced = await this._resolveReference(c.referenceCollection, c.referenceId);
      results.push({
        score: c.score,
        referenceId: c.referenceId,
        referenceCollection: c.referenceCollection,
        modelo: c.modelo,
        tipo: c.tipo,
        fecha: c.fecha,
        document: referenced
      });
    }

    return {
      query,
      success: true,
      results,
      timings: {
        embed_ms: tiempo_ms
      }
    };
  }

  // ---------- hybridSearch: same idea but with compound search ----------
  async hybridSearch(query, options = {}) {
    await this.initialize();
    if (!query || typeof query !== 'string') throw new Error('query debe ser string');

    const limit = options.limit || this.defaultTopK;
    const candidateK = options.candidateLimit || Math.max(limit * 10, 100);
    const filters = options.filters || {};
    const vectorIndexName = options.vectorIndexName || this.defaultTextIndex;

    const { embedding: queryEmbedding, tiempo_ms } = await embeddingService.generateTextEmbedding(query);

    const must = [
      {
        text: {
          query,
          path: ['modelo', 'tipo', 'referenceCollection']
        }
      }
    ];

    const should = [
      {
        knnBeta: {
          vector: queryEmbedding,
          path: 'embedding',
          k: candidateK
        }
      }
    ];

    const pipeline = [
      {
        $search: {
          index: vectorIndexName,
          compound: {
            must,
            should
          }
        }
      }
    ];

    const match = this._buildMatch(filters);
    if (Object.keys(match).length > 0) pipeline.push({ $match: match });

    pipeline.push(
      {
        $project: {
          referenceId: 1,
          referenceCollection: 1,
          modelo: 1,
          tipo: 1,
          fecha: 1,
          embedding: 1
        }
      },
      { $limit: candidateK }
    );

    const candidates = await this.embeddingsColl.aggregate(pipeline).toArray();
    if (!candidates || candidates.length === 0) {
      return { query, success: true, results: [], timings: { embed_ms: tiempo_ms } };
    }

    const scored = candidates.map(c => {
      let sim = 0;
      try {
        sim = embeddingService.cosineSimilarity(queryEmbedding, c.embedding);
      } catch (e) {
        sim = 0;
      }
      return { ...c, score: sim };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit);

    const results = [];
    for (const c of top) {
      const referenced = await this._resolveReference(c.referenceCollection, c.referenceId);
      results.push({
        score: c.score,
        referenceId: c.referenceId,
        referenceCollection: c.referenceCollection,
        modelo: c.modelo,
        tipo: c.tipo,
        fecha: c.fecha,
        document: referenced
      });
    }

    return { query, success: true, results, timings: { embed_ms: tiempo_ms } };
  }

  // ---------- multimodalSearch ----------
  async multimodalSearch(queryOrImageUrl, options = {}) {
    await this.initialize();
    const tipo = (options.tipo || 'text-to-image');
    const limit = options.limit || this.defaultTopK;
    const vectorIndexName = options.vectorIndexName || (tipo.startsWith('image') ? this.defaultImageIndex : this.defaultTextIndex);

    if (tipo === 'text-to-image' || tipo === 'text-to-text') {
      const { embedding: emb, tiempo_ms } = await embeddingService.generateTextEmbedding(queryOrImageUrl);
      return this.searchByEmbedding(emb, { limit, vectorIndexName, filters: options.filters });
    } else if (tipo === 'image-to-image') {
      const { embedding: emb, tiempo_ms } = await embeddingService.generateImageEmbedding(queryOrImageUrl);
      return this.searchByEmbedding(emb, { limit, vectorIndexName, filters: options.filters });
    } else {
      throw new Error('Tipo multimodal no soportado');
    }
  }

  // ---------- searchByEmbedding ----------
  async searchByEmbedding(inputEmbedding, options = {}) {
    await this.initialize();
    if (!Array.isArray(inputEmbedding)) throw new Error('inputEmbedding debe ser un array');

    const limit = options.limit || this.defaultTopK;
    const candidateK = options.candidateLimit || Math.max(limit * 10, 100);
    const filters = options.filters || {};
    const vectorIndexName = options.vectorIndexName || this.defaultTextIndex;

    const pipeline = [
      {
        $search: {
          index: vectorIndexName,
          knnBeta: {
            vector: inputEmbedding,
            path: 'embedding',
            k: candidateK
          }
        }
      }
    ];

    const match = this._buildMatch(filters);
    if (Object.keys(match).length > 0) pipeline.push({ $match: match });

    pipeline.push(
      {
        $project: {
          referenceId: 1,
          referenceCollection: 1,
          modelo: 1,
          tipo: 1,
          fecha: 1,
          embedding: 1
        }
      },
      { $limit: candidateK }
    );

    const candidates = await this.embeddingsColl.aggregate(pipeline).toArray();
    if (!candidates || candidates.length === 0) return { success: true, results: [] };

    const scored = candidates.map(c => {
      let sim = 0;
      try {
        sim = embeddingService.cosineSimilarity(inputEmbedding, c.embedding);
      } catch (e) {
        sim = 0;
      }
      return { ...c, score: sim };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit);

    const results = [];
    for (const c of top) {
      const referenced = await this._resolveReference(c.referenceCollection, c.referenceId);
      results.push({
        score: c.score,
        referenceId: c.referenceId,
        referenceCollection: c.referenceCollection,
        modelo: c.modelo,
        tipo: c.tipo,
        fecha: c.fecha,
        document: referenced
      });
    }

    return { success: true, results };
  }

  // ---------- searchSimilarDocuments ----------
  async searchSimilarDocuments(documentId, options = {}) {
    await this.initialize();
    if (!documentId) throw new Error('documentId requerido');

    // Buscar embedding del documento guardado en embeddings collection
    const embDoc = await this.embeddingsColl.findOne({ referenceId: documentId, referenceCollection: 'documents', tipo: 'text' });
    if (!embDoc) return { success: false, results: [], error: 'No embedding encontrado para el documentId' };

    const inputEmbedding = embDoc.embedding;
    const resultsObj = await this.searchByEmbedding(inputEmbedding, options);
    const filtered = (resultsObj.results || []).filter(r => String(r.referenceId) !== String(documentId));
    return { success: true, results: filtered };
  }
}

module.exports = new VectorSearchService();