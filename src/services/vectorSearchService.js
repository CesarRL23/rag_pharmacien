// src/services/vectorSearchService.js
const { getDB } = require('../config/db');
const Document = require('../models/Document');
const Image = require('../models/Image');
const Embedding = require('../models/Embedding'); // tu wrapper actual sobre la colección embeddings
const embeddingService = require('./embeddingService');

class VectorSearchService {
  constructor() {
    this.db = null;
    this.embeddingsColl = null;
    this.initialized = false;
    // Nombre por defecto del índice vectorial que creaste en Atlas
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

  // --------- Helper: build filters (simple) ----------
  _buildMatch(filters = {}) {
    const match = {};
    if (filters.referenceCollection) match.referenceCollection = filters.referenceCollection;
    if (filters.tipo) match.tipo = filters.tipo;
    if (filters.modelo) match.modelo = filters.modelo;
    if (filters.referenceId) match.referenceId = filters.referenceId;
    if (filters.fechaDesde) match.fecha = match.fecha || {};
    if (filters.fechaDesde) match.fecha.$gte = new Date(filters.fechaDesde);
    if (filters.fechaHasta) match.fecha = match.fecha || {};
    if (filters.fechaHasta) match.fecha.$lte = new Date(filters.fechaHasta);
    // metadata.* assumed already stored in embeddings docs
    if (filters.metadata && typeof filters.metadata === 'object') {
      for (const [k, v] of Object.entries(filters.metadata)) {
        match[`metadata.${k}`] = v;
      }
    }
    return match;
  }

  // --------- searchByText: genera embedding y usa $vectorSearch (knnBeta) ----------
  async searchByText(query, options = {}) {
    await this.initialize();
    if (!query || typeof query !== 'string') throw new Error('query debe ser string');

    const limit = options.limit || this.defaultTopK;
    const candidateK = options.candidateLimit || Math.max(limit * 10, 50);
    const filters = options.filters || {};
    const vectorIndexName = options.vectorIndexName || this.defaultTextIndex;

    // 1) generar embedding para query
    const { embedding: queryEmbedding, tiempo_ms } = await embeddingService.generateTextEmbedding(query);

    // 2) pipeline $vectorSearch (knnBeta)
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

    pipeline.push(
      {
        $project: {
          embedding: 0,
          referenceId: 1,
          referenceCollection: 1,
          modelo: 1,
          tipo: 1,
          fecha: 1,
          score: { $meta: 'vectorScore' }
        }
      },
      { $limit: candidateK }
    );

    const candidates = await this.embeddingsColl.aggregate(pipeline).toArray();

    // 3) top-K final (resolver referencias)
    const top = candidates.slice(0, limit);
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
        score: c.score ?? null,
        embedding_score: c.score ?? null,
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

  // --------- hybridSearch: usa texto + knn en should (compound) ----------
  async hybridSearch(query, options = {}) {
    await this.initialize();
    if (!query || typeof query !== 'string') throw new Error('query debe ser string');

    const limit = options.limit || this.defaultTopK;
    const candidateK = options.candidateLimit || Math.max(limit * 10, 100);
    const filters = options.filters || {};
    const vectorIndexName = options.vectorIndexName || this.defaultTextIndex;

    // generar embedding
    const { embedding: queryEmbedding, tiempo_ms } = await embeddingService.generateTextEmbedding(query);

    // compound search: texto sobre metadata + knnBeta
    const must = [];
    // example: allow text match over some metadata fields if present
    must.push({
      text: {
        query,
        path: ['modelo', 'tipo', 'referenceCollection']
      }
    });

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
      { $project: { embedding: 0, referenceId: 1, referenceCollection: 1, modelo: 1, tipo: 1, fecha: 1, score: { $meta: 'vectorScore' } } },
      { $limit: candidateK }
    );

    const candidates = await this.embeddingsColl.aggregate(pipeline).toArray();
    const top = candidates.slice(0, limit);

    const results = [];
    for (const c of top) {
      let referenced = null;
      try {
        if (c.referenceCollection === 'documents') referenced = await Document.findById(c.referenceId);
        else if (c.referenceCollection === 'images') referenced = await Image.findById(c.referenceId);
      } catch (err) { referenced = null; }

      results.push({
        score: c.score ?? null,
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
      timings: { embed_ms: tiempo_ms }
    };
  }

  // --------- multimodalSearch: maneja text->image o image->image ----------
  async multimodalSearch(queryOrImageUrl, options = {}) {
    await this.initialize();
    const tipo = (options.tipo || 'text-to-image'); // text-to-image | image-to-image | text-to-text
    const limit = options.limit || this.defaultTopK;
    const vectorIndexName = options.vectorIndexName || (tipo.startsWith('image') ? this.defaultImageIndex : this.defaultTextIndex);

    if (tipo === 'text-to-image' || tipo === 'text-to-text') {
      // generar embedding de texto y buscar (si text-to-image, index debe ser de imágenes)
      const { embedding: emb } = await embeddingService.generateTextEmbedding(queryOrImageUrl);
      const results = await this.searchByEmbedding(emb, { limit, vectorIndexName, filters: options.filters });
      return results;
    } else if (tipo === 'image-to-image') {
      // si el usuario pasó una URL, intentamos generar embedding de imagen (placeholder)
      const { embedding: emb } = await embeddingService.generateImageEmbedding(queryOrImageUrl);
      const results = await this.searchByEmbedding(emb, { limit, vectorIndexName, filters: options.filters });
      return results;
    } else {
      throw new Error('Tipo multimodal no soportado');
    }
  }

  // --------- searchByEmbedding: buscar por vector directamente ----------
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

    pipeline.push({ $project: { embedding: 0, referenceId: 1, referenceCollection: 1, modelo: 1, tipo: 1, fecha: 1, score: { $meta: 'vectorScore' } } }, { $limit: candidateK });

    const candidates = await this.embeddingsColl.aggregate(pipeline).toArray();
    const top = candidates.slice(0, limit);

    const results = [];
    for (const c of top) {
      let referenced = null;
      try {
        if (c.referenceCollection === 'documents') referenced = await Document.findById(c.referenceId);
        else if (c.referenceCollection === 'images') referenced = await Image.findById(c.referenceId);
      } catch (err) { referenced = null; }

      results.push({
        score: c.score ?? null,
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

  // --------- searchSimilarDocuments: busca embeddings del documentId y hace knn ----------
  async searchSimilarDocuments(documentId, options = {}) {
    await this.initialize();
    if (!documentId) throw new Error('documentId requerido');

    // 1) buscar embedding asociado al documento
    const embDoc = await this.embeddingsColl.findOne({ referenceId: documentId, referenceCollection: 'documents', tipo: 'text' });
    if (!embDoc) return { success: false, results: [], error: 'No embedding encontrado para el documentId' };

    const inputEmbedding = embDoc.embedding;
    // 2) hacer searchByEmbedding pero excluir el mismo documento
    const resultsObj = await this.searchByEmbedding(inputEmbedding, options);
    const filtered = (resultsObj.results || []).filter(r => String(r.referenceId) !== String(documentId));
    return { success: true, results: filtered };
  }
}

module.exports = new VectorSearchService();
