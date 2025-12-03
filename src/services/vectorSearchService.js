// src/services/vectorSearchService.js
const { getDB } = require('../config/db');
const Document = require('../models/Document');
const Image = require('../models/Image');
const embeddingService = require('./embeddingService');

class VectorSearchService {
  constructor() {
    this.defaultTopK = 5;
  }

  /**
   * Busca por texto usando Atlas Vector Search (knn)
   * options:
   *  - limit: número final de resultados (topK)
   *  - filters: objeto con filtros aplicables (referenceCollection, tipo, metadata.*)
   *  - vectorIndexName: nombre del index knn en Atlas (opcional)
   */
  async searchByText(query, options = {}) {
    if (!query || typeof query !== 'string') throw new Error('query debe ser un string');

    const db = getDB();
    const embeddingsColl = db.collection('embeddings');
    const topK = options.limit || this.defaultTopK;
    const candidateLimit = options.candidateLimit || Math.max(100, topK * 10);
    const filters = options.filters || {};
    const vectorIndexName = options.vectorIndexName || 'embeddings_vector_idx';

    // 1) generar embedding de la query
    const genStart = Date.now();
    const { embedding: queryEmbedding } = await embeddingService.generateTextEmbedding(query);
    const genMs = Date.now() - genStart;

    // 2) construir pipeline de agregación usando $search (Atlas Vector Search)
    const mustFilters = [];

    // Si el usuario pide filtrar por referenceCollection (documents/images)
    if (filters.referenceCollection) {
      mustFilters.push({ equals: { path: 'referenceCollection', value: filters.referenceCollection } });
    }
    // Filtrar por tipo de embedding (text|image)
    if (filters.tipo) {
      mustFilters.push({ equals: { path: 'tipo', value: filters.tipo } });
    }
    // Filtros arbitrarios sobre metadata.* si existen en embeddings
    if (filters.metadata && typeof filters.metadata === 'object') {
      for (const [k, v] of Object.entries(filters.metadata)) {
        mustFilters.push({ equals: { path: `metadata.${k}`, value: v } });
      }
    }

    const searchStage = {
      $search: {
        index: vectorIndexName,
        knnBeta: {
          vector: queryEmbedding,
          path: 'embedding',
          k: candidateLimit
        }
      }
    };

    // if we have metadata filters, add a compound stage to apply them after knn
    const pipeline = [searchStage];

    // Add a $match stage to apply additional filters (faster than client-side)
    if (mustFilters.length > 0) {
      // Convert mustFilters into $and match conditions on their fields
      const matchQuery = {};
      for (const m of mustFilters) {
        // m is like { equals: { path: 'tipo', value: 'text' } }
        const path = m.equals.path;
        const value = m.equals.value;
        // translate to match: { path: value }
        // support nested path like metadata.someKey
        matchQuery[path] = value;
      }
      pipeline.push({ $match: matchQuery });
    }

    // Project useful fields and keep score
    pipeline.push(
      {
        $project: {
          embedding: 0 // opcional: no devolver vector completo
        }
      },
      { $limit: candidateLimit }
    );

    // 3) ejecutar agregación en collection embeddings
    const aggStart = Date.now();
    const cursor = embeddingsColl.aggregate(pipeline, { allowDiskUse: false });
    const candidates = await cursor.toArray();
    const aggMs = Date.now() - aggStart;

    // 4) candidates ya están ordenados por similitud (Atlas devuelve por knn),
    // limitar a topK y resolver referencias a documents/images
    const top = candidates.slice(0, topK);
    const results = [];

    for (const c of top) {
      let referenced = null;
      try {
        if (c.referenceCollection === 'documents') {
          referenced = await Document.findById(c.referenceId);
        } else if (c.referenceCollection === 'images') {
          referenced = await Image.findById(c.referenceId);
        } else {
          referenced = (await Document.findById(c.referenceId)) || (await Image.findById(c.referenceId));
        }
      } catch (err) {
        referenced = null;
      }

      results.push({
        score: c.score || c._score || null,
        embedding_score: c.score || c._score || null,
        referenceId: c.referenceId,
        referenceCollection: c.referenceCollection,
        embeddingDoc: {
          _id: c._id,
          modelo: c.modelo,
          tipo: c.tipo,
          fecha: c.fecha
        },
        document: referenced
      });
    }
    
    return {
      query,
      success: true,
      results,
      timings: {
        embed_ms: genMs,
        agg_ms: aggMs,
        total_ms: Date.now() - genStart
      }
    };
  }

  /**
   * Buscar por embedding directly (ej. imagen -> buscar imágenes similares)
   * options: same as searchByText, plus vectorIndexName
   */
  async searchByEmbedding(inputEmbedding, options = {}) {
    if (!Array.isArray(inputEmbedding)) throw new Error('inputEmbedding debe ser un array');

    const db = getDB();
    const embeddingsColl = db.collection('embeddings');
    const topK = options.limit || this.defaultTopK;
    const candidateLimit = options.candidateLimit || Math.max(100, topK * 10);
    const filters = options.filters || {};
    const vectorIndexName = options.vectorIndexName || 'embeddings_vector_idx';

    const mustFilters = [];
    if (filters.referenceCollection) mustFilters.push({ equals: { path: 'referenceCollection', value: filters.referenceCollection } });
    if (filters.tipo) mustFilters.push({ equals: { path: 'tipo', value: filters.tipo } });
    if (filters.metadata && typeof filters.metadata === 'object') {
      for (const [k, v] of Object.entries(filters.metadata)) {
        mustFilters.push({ equals: { path: `metadata.${k}`, value: v } });
      }
    }

    const searchStage = {
      $search: {
        index: vectorIndexName,
        knnBeta: {
          vector: inputEmbedding,
          path: 'embedding',
          k: candidateLimit
        }
      }
    };

    const pipeline = [searchStage];
    if (mustFilters.length > 0) {
      const matchQuery = {};
      for (const m of mustFilters) {
        matchQuery[m.equals.path] = m.equals.value;
      }
      pipeline.push({ $match: matchQuery });
    }

    pipeline.push({ $project: { embedding: 0 } }, { $limit: candidateLimit });

    const aggStart = Date.now();
    const cursor = embeddingsColl.aggregate(pipeline);
    const candidates = await cursor.toArray();
    const aggMs = Date.now() - aggStart;

    const top = candidates.slice(0, topK);
    const results = [];
    for (const c of top) {
      let referenced = null;
      try {
        if (c.referenceCollection === 'documents') {
          referenced = await Document.findById(c.referenceId);
        } else if (c.referenceCollection === 'images') {
          referenced = await Image.findById(c.referenceId);
        }
      } catch (err) {
        referenced = null;
      }

      results.push({
        score: c.score || c._score || null,
        embedding_score: c.score || c._score || null,
        referenceId: c.referenceId,
        referenceCollection: c.referenceCollection,
        embeddingDoc: {
          _id: c._id,
          modelo: c.modelo,
          tipo: c.tipo,
          fecha: c.fecha
        },
        document: referenced
      });
    }



    return {
      success: true,
      results,
      timings: { agg_ms: aggMs, total_ms: Date.now() - aggMs }
    };
  }
} 
module.exports = new VectorSearchService();
