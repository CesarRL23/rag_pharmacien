// src/services/vectorSearchService.js
const Document = require('../models/Document');
const Image = require('../models/Image');
const Embedding = require('../models/Embedding');
const embeddingService = require('./embeddingService');

/**
 * VectorSearchService
 * - searchByText(query, options)
 * - searchByEmbedding(embedding, options)
 *
 * options (comunes):
 *   - limit: número de resultados finales (topK). default 5
 *   - candidateLimit: cuántos embeddings candidatos traer para calcular similitud (limit internal). default 500
 *   - filters: objeto con filtros aplicables (language, tipo, referenceCollection, dateFrom, dateTo, metadata.*)
 *   - type: 'text' | 'image' | 'all' (qué tipo de embeddings buscar)
 */
class VectorSearchService {
  constructor() {
    // valores por defecto
    this.defaultTopK = 5;
    this.defaultCandidateLimit = 500;
  }

  // Convierte filtros de alto nivel a query para la colección embeddings
  buildEmbeddingQuery(filters = {}, tipoAllowed = []) {
    const q = {};

    // Si el usuario pasa tipo(s) explícitos para embeddings (text|image)
    if (filters.tipo) {
      q.tipo = filters.tipo;
    } else if (tipoAllowed.length === 1) {
      q.tipo = tipoAllowed[0];
    } // si tipoAllowed vacío, no forzamos

    // Filtrado por referencia a collection (documents/images)
    if (filters.referenceCollection) q.referenceCollection = filters.referenceCollection;

    // Filtrado por fecha en el documento referenciado (no siempre aplicable)
    // Para filtrar por fecha/idioma a nivel de embedding, asumimos que esos campos
    // también están en el documento de embedding metadata, si no, se requieren joins.
    if (filters.dateFrom || filters.dateTo) {
      q.fecha = {};
      if (filters.dateFrom) q.fecha.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) q.fecha.$lte = new Date(filters.dateTo);
    }

    // Filtrado por metadata (si guardas metadata en embeddings)
    if (filters.metadata && typeof filters.metadata === 'object') {
      for (const [k, v] of Object.entries(filters.metadata)) {
        q[`metadata.${k}`] = v;
      }
    }

    // NOTA: filtros como language/tipoDocumento que estén en documents deberían usar $lookup
    // o filtrarse después de resolver los referenceIds. Aquí priorizamos filtros sobre embeddings.
    return q;
  }

  // Busca por texto (genera embedding de la query)
  async searchByText(query, options = {}) {
    if (!query || typeof query !== 'string') throw new Error('query debe ser un string');

    const topK = options.limit || this.defaultTopK;
    const candidateLimit = options.candidateLimit || this.defaultCandidateLimit;
    const filters = options.filters || {};
    const type = options.type || 'text'; // 'text'|'image'|'all'

    const start = Date.now();
    // 1) generar embedding de query
    const genStart = Date.now();
    const { embedding: queryEmbedding } = await embeddingService.generateTextEmbedding(query);
    const genMs = Date.now() - genStart;

    // 2) construir query para embeddings
    const tipoAllowed = type === 'all' ? [] : [type];
    const embQuery = this.buildEmbeddingQuery(filters, tipoAllowed);

    // 3) traer candidatos desde collection embeddings
    // pedimos candidateLimit para luego rankear localmente
    const candidates = await Embedding.findMany(embQuery, { limit: candidateLimit });

    // 4) calcular similitud contra cada candidato
    const scored = [];
    for (const cand of candidates) {
      if (!Array.isArray(cand.embedding) || cand.embedding.length === 0) continue;
      let sim = 0;
      try {
        sim = embeddingService.cosineSimilarity(queryEmbedding, cand.embedding);
      } catch (err) {
        // ignora vectores con dimensión no coincidente
        continue;
      }
      scored.push({
        similarity: sim,
        embeddingDoc: cand
      });
    }

    // 5) ordenar y limitar topK
    scored.sort((a, b) => b.similarity - a.similarity);
    const top = scored.slice(0, topK);

    // 6) resolver documentos/imagenes referenciados
    const results = [];
    for (const s of top) {
      const e = s.embeddingDoc;
      let referenced = null;
      try {
        if (e.referenceCollection === 'documents') {
          referenced = await Document.findById(e.referenceId);
        } else if (e.referenceCollection === 'images') {
          referenced = await Image.findById(e.referenceId);
        } else {
          // fallback: intentar documents primero
          referenced = await Document.findById(e.referenceId) || await Image.findById(e.referenceId);
        }
      } catch (err) {
        referenced = null;
      }

      results.push({
        score: s.similarity,
        embedding_score: s.similarity,
        referenceId: e.referenceId,
        referenceCollection: e.referenceCollection,
        embeddingDoc: {
          _id: e._id,
          modelo: e.modelo,
          tipo: e.tipo,
          fecha: e.fecha
        },
        document: referenced
      });
    }

    const totalMs = Date.now() - start;

    return {
      query,
      success: true,
      results,
      timings: {
        embed_ms: genMs,
        total_ms: totalMs
      }
    };
  }

  // Buscar usando un embedding ya existente (por ejemplo imagen -> búsqueda de imágenes similares)
  async searchByEmbedding(inputEmbedding, options = {}) {
    if (!Array.isArray(inputEmbedding)) throw new Error('inputEmbedding debe ser un array de numbers');

    const topK = options.limit || this.defaultTopK;
    const candidateLimit = options.candidateLimit || this.defaultCandidateLimit;
    const filters = options.filters || {};
    const type = options.type || 'all'; // buscar entre 'image'|'text'|'all'

    const start = Date.now();

    const tipoAllowed = type === 'all' ? [] : [type];
    const embQuery = this.buildEmbeddingQuery(filters, tipoAllowed);

    const candidates = await Embedding.findMany(embQuery, { limit: candidateLimit });

    const scored = [];
    for (const cand of candidates) {
      if (!Array.isArray(cand.embedding) || cand.embedding.length === 0) continue;
      try {
        const sim = embeddingService.cosineSimilarity(inputEmbedding, cand.embedding);
        scored.push({ similarity: sim, embeddingDoc: cand });
      } catch (err) {
        continue;
      }
    }

    scored.sort((a, b) => b.similarity - a.similarity);
    const top = scored.slice(0, topK);

    const results = [];
    for (const s of top) {
      const e = s.embeddingDoc;
      let referenced = null;
      try {
        if (e.referenceCollection === 'documents') {
          referenced = await Document.findById(e.referenceId);
        } else if (e.referenceCollection === 'images') {
          referenced = await Image.findById(e.referenceId);
        }
      } catch (err) {
        referenced = null;
      }

      results.push({
        score: s.similarity,
        embedding_score: s.similarity,
        referenceId: e.referenceId,
        referenceCollection: e.referenceCollection,
        embeddingDoc: {
          _id: e._id,
          modelo: e.modelo,
          tipo: e.tipo,
          fecha: e.fecha
        },
        document: referenced
      });
    }

    const totalMs = Date.now() - start;
    return {
      success: true,
      results,
      timings: { total_ms: totalMs }
    };
  }
}

module.exports = new VectorSearchService();
