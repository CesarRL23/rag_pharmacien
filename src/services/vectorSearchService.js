// src/services/vectorSearchService.js
const { getDB } = require("../config/db");
const Document = require("../models/Document");
const Image = require("../models/Image");
const embeddingService = require("./embeddingService");

class VectorSearchService {
  constructor() {
    this.db = null;
    this.embeddingsColl = null;
    this.initialized = false;
    this.defaultTextIndex = "vector_index_embeddings_text_384";
    this.defaultImageIndex = "vector_index_embeddings_img_512";
    this.defaultTopK = 5;
  }

  async initialize() {
    if (this.initialized) return;
    this.db = getDB();
    this.embeddingsColl = this.db.collection("embeddings");
    this.initialized = true;
  }

  _buildMatch(filters = {}) {
    const match = {};
    if (filters.referenceCollection)
      match.referenceCollection = filters.referenceCollection;
    if (filters.tipo) match.tipo = filters.tipo;
    if (filters.modelo) match.modelo = filters.modelo;
    if (filters.referenceId) match.referenceId = filters.referenceId;
    if (filters.fechaDesde || filters.fechaHasta) {
      match.fecha = {};
      if (filters.fechaDesde) match.fecha.$gte = new Date(filters.fechaDesde);
      if (filters.fechaHasta) match.fecha.$lte = new Date(filters.fechaHasta);
    }
    if (filters.metadata && typeof filters.metadata === "object") {
      for (const [k, v] of Object.entries(filters.metadata)) {
        match[`metadata.${k}`] = v;
      }
    }
    return match;
  }

  // ---------- Helper: fetch referenced doc ----------
  async _resolveReference(refCollection, refId) {
    try {
      if (refCollection === "documents") return await Document.findById(refId);
      if (refCollection === "images") return await Image.findById(refId);
      return null;
    } catch (e) {
      return null;
    }
  }

  // ---------- searchByText: generate embedding, knnBeta, compute cos locally ----------
  async searchByText(query, options = {}) {
    await this.initialize();
    if (!query || typeof query !== "string")
      throw new Error("query debe ser string");

    const limit = options.limit || this.defaultTopK;
    const candidateK = options.candidateLimit || Math.max(limit * 10, 50);
    const filters = options.filters || {};
    const vectorIndexName = options.vectorIndexName || this.defaultTextIndex;

    const { embedding: queryEmbedding, tiempo_ms } =
      await embeddingService.generateTextEmbedding(query);

    console.log(`🔎 Vector Search - Query: "${query}"`);
    console.log(`📊 Embedding generado: dimensión ${queryEmbedding.length}`);
    console.log(`🏷️  Índice: ${vectorIndexName}, k=${candidateK}`);

    const pipeline = [
      {
        $search: {
          index: vectorIndexName,
          knnBeta: {
            vector: queryEmbedding,
            path: "embedding",
            k: candidateK,
          },
        },
      },
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
          embedding: 1,
        },
      },
      { $limit: candidateK }
    );

    let candidates = [];
    try {
      candidates = await this.embeddingsColl.aggregate(pipeline).toArray();
      console.log(
        `✅ Candidatos encontrados (via $search): ${candidates.length}`
      );
    } catch (err) {
      console.warn(
        `⚠️  $search falló (${err.message}). Aplicando fallback local.`
      );
      // Fallback: get documents that match filters and compute cosine locally
      const fallbackDocs = await this.embeddingsColl.find(match).toArray();
      console.log(
        `📄 Fallback: ${fallbackDocs.length} documentos recuperados para similitud local.`
      );
      candidates = fallbackDocs;
    }

    // Si $search devolvió 0 candidatos (sin error), aplicar fallback local también
    if (
      (!candidates || candidates.length === 0) &&
      (!err || typeof err === "undefined")
    ) {
      try {
        const fallbackDocs = await this.embeddingsColl.find(match).toArray();
        console.log(
          `📄 Fallback (no candidatos): ${fallbackDocs.length} documentos recuperados para similitud local.`
        );
        candidates = fallbackDocs;
      } catch (e) {
        console.warn("⚠️ Error ejecutando fallback local:", e.message);
      }
    }

    if (!candidates || candidates.length === 0) {
      console.warn(`⚠️  Sin resultados para: "${query}"`);
      return {
        query,
        success: true,
        results: [],
        timings: { embed_ms: tiempo_ms },
      };
    }

    const scored = candidates.map((c) => {
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
      const referenced = await this._resolveReference(
        c.referenceCollection,
        c.referenceId
      );
      results.push({
        score: c.score,
        referenceId: c.referenceId,
        referenceCollection: c.referenceCollection,
        modelo: c.modelo,
        tipo: c.tipo,
        fecha: c.fecha,
        document: referenced,
      });
    }

    return {
      query,
      success: true,
      results,
      timings: {
        embed_ms: tiempo_ms,
      },
    };
  }

  // ---------- hybridSearch: same idea but with compound search ----------
  async hybridSearch(query, options = {}) {
    await this.initialize();
    if (!query || typeof query !== "string")
      throw new Error("query debe ser string");

    const limit = options.limit || this.defaultTopK;
    const candidateK = options.candidateLimit || Math.max(limit * 10, 100);
    const filters = options.filters || {};
    const vectorIndexName = options.vectorIndexName || this.defaultTextIndex;

    const { embedding: queryEmbedding, tiempo_ms } =
      await embeddingService.generateTextEmbedding(query);

    const must = [
      {
        text: {
          query,
          path: ["modelo", "tipo", "referenceCollection"],
        },
      },
    ];

    const should = [
      {
        knnBeta: {
          vector: queryEmbedding,
          path: "embedding",
          k: candidateK,
        },
      },
    ];

    const pipeline = [
      {
        $search: {
          index: vectorIndexName,
          compound: {
            must,
            should,
          },
        },
      },
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
          embedding: 1,
        },
      },
      { $limit: candidateK }
    );

    const candidates = await this.embeddingsColl.aggregate(pipeline).toArray();
    if (!candidates || candidates.length === 0) {
      return {
        query,
        success: true,
        results: [],
        timings: { embed_ms: tiempo_ms },
      };
    }

    const scored = candidates.map((c) => {
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
      const referenced = await this._resolveReference(
        c.referenceCollection,
        c.referenceId
      );
      results.push({
        score: c.score,
        referenceId: c.referenceId,
        referenceCollection: c.referenceCollection,
        modelo: c.modelo,
        tipo: c.tipo,
        fecha: c.fecha,
        document: referenced,
      });
    }

    return { query, success: true, results, timings: { embed_ms: tiempo_ms } };
  }

  // ---------- multimodalSearch - CORREGIDO ----------
  async multimodalSearch(queryOrImageUrl, options = {}) {
    await this.initialize();
    const tipo = options.tipo || "text-to-image";
    const limit = options.limit || this.defaultTopK;

    // 🔥 CORRECCIÓN CRÍTICA: Definir filtros según el tipo de búsqueda
    let filters = options.filters || {};
    let vectorIndexName = options.vectorIndexName;

    console.log(`🔍 Búsqueda multimodal tipo: ${tipo}`);

    if (tipo === "text-to-image") {
      // ✅ Buscar IMÁGENES usando texto
      console.log("   📝 Generando embedding de TEXTO para buscar IMÁGENES...");

      filters = {
        ...filters,
        referenceCollection: "images", // 🔥 FILTRAR SOLO IMÁGENES
        tipo: "image",
      };

      vectorIndexName = vectorIndexName || this.defaultImageIndex;

      // Usar embedding del encoder de texto de CLIP para que las dimensiones
      // coincidan con los embeddings de imagen (CLIP)
      let embObj;
      try {
        embObj = await embeddingService.generateClipTextEmbedding(queryOrImageUrl);
      } catch (e) {
        console.warn('⚠️ No se pudo generar embedding CLIP-text, usando embedding de texto genérico:', e.message);
        embObj = await embeddingService.generateTextEmbedding(queryOrImageUrl);
      }
      const { embedding: emb, tiempo_ms } = embObj;

      console.log(`   ✅ Embedding de texto generado (${emb.length} dims)`);
      console.log(`   🔎 Buscando en colección: images`);

      return this.searchByEmbedding(emb, {
        limit,
        vectorIndexName,
        filters,
        tiempo_ms,
        originalQuery: queryOrImageUrl,
      });
    } else if (tipo === "image-to-image") {
      // ✅ Buscar IMÁGENES usando imagen
      console.log(
        "   🖼️ Generando embedding de IMAGEN para buscar IMÁGENES..."
      );

      filters = {
        ...filters,
        referenceCollection: "images",
        tipo: "image",
      };

      vectorIndexName = vectorIndexName || this.defaultImageIndex;

      const { embedding: emb, tiempo_ms } =
        await embeddingService.generateImageEmbedding(queryOrImageUrl);

      console.log(`   ✅ Embedding de imagen generado (${emb.length} dims)`);
      console.log(`   🔎 Buscando en colección: images`);

      return this.searchByEmbedding(emb, {
        limit,
        vectorIndexName,
        filters,
        tiempo_ms,
      });
    } else if (tipo === "text-to-text") {
      // ✅ Buscar DOCUMENTOS usando texto
      console.log(
        "   📝 Generando embedding de TEXTO para buscar DOCUMENTOS..."
      );

      filters = {
        ...filters,
        referenceCollection: "documents",
        tipo: "text",
      };

      vectorIndexName = vectorIndexName || this.defaultTextIndex;

      const { embedding: emb, tiempo_ms } =
        await embeddingService.generateTextEmbedding(queryOrImageUrl);

      return this.searchByEmbedding(emb, {
        limit,
        vectorIndexName,
        filters,
        tiempo_ms,
        originalQuery: queryOrImageUrl,
      });
    } else {
      throw new Error(`Tipo multimodal no soportado: ${tipo}`);
    }
  }

  // ---------- searchByEmbedding ----------
  async searchByEmbedding(inputEmbedding, options = {}) {
    await this.initialize();
    if (!Array.isArray(inputEmbedding))
      throw new Error("inputEmbedding debe ser un array");

    const limit = options.limit || this.defaultTopK;
    const candidateK = options.candidateLimit || Math.max(limit * 10, 100);
    const filters = options.filters || {};
    let vectorIndexName = options.vectorIndexName || this.defaultTextIndex;
    const tiempo_embed = options.tiempo_ms || 0;

    // Intentar ejecutar la agregación $search con varios nombres de índice si el primero falla.
    const indexCandidates = [];
    // Priorizar el índice recibido en opciones
    if (vectorIndexName) indexCandidates.push(vectorIndexName);
    // Añadir índices por defecto (texto/imagen) como fallback
    if (!indexCandidates.includes(this.defaultImageIndex))
      indexCandidates.push(this.defaultImageIndex);
    if (!indexCandidates.includes("vector_index_embeddings"))
      indexCandidates.push("vector_index_embeddings");

    const match = this._buildMatch(filters);
    if (Object.keys(match).length > 0) {
      console.log(`   🔧 Aplicando filtros:`, JSON.stringify(match));
    }

    let lastError = null;
    let candidates = [];
    let searchTime = 0;
    // Probar cada índice candidato hasta obtener resultados o agotar la lista
    for (const idxName of indexCandidates) {
      try {
        vectorIndexName = idxName; // para logs
        const pipeline = [
          {
            $search: {
              index: idxName,
              knnBeta: {
                vector: inputEmbedding,
                path: "embedding",
                k: candidateK,
              },
            },
          },
        ];

        if (Object.keys(match).length > 0) pipeline.push({ $match: match });

        pipeline.push(
          {
            $project: {
              referenceId: 1,
              referenceCollection: 1,
              modelo: 1,
              tipo: 1,
              fecha: 1,
              embedding: 1,
            },
          },
          { $limit: candidateK }
        );

        console.log(`   🔎 Ejecutando $search con índice: ${idxName}`);
        const searchStart = Date.now();
        candidates = await this.embeddingsColl.aggregate(pipeline).toArray();
        searchTime = Date.now() - searchStart;
        console.log(
          `   📊 Candidatos encontrados con índice '${idxName}': ${candidates.length} en ${searchTime}ms`
        );

        // Si obtuvimos candidatos, salimos del loop
        break;
      } catch (error) {
        lastError = error;
        console.warn(
          `   ⚠️  Error ejecutando $search con índice '${idxName}': ${error.message}`
        );
        // continuar con el siguiente índice
      }
    }

    if ((!candidates || candidates.length === 0) && lastError) {
      // Si hubo un error en todos los intentos, devolver el último error para debugging
      console.error(
        "   ❌ $search falló en todos los índices intentados. Último error:",
        lastError.message
      );
    }

    // Si no hay candidatos desde $search, usar fallback local
    if (!candidates || candidates.length === 0) {
      console.warn(
        "   ⚠️  No se obtuvieron candidatos desde $search. Aplicando fallback local."
      );
      const fallbackDocs = await this.embeddingsColl.find(match).toArray();
      console.log(
        `   📄 Fallback local: ${fallbackDocs.length} documentos recuperados.`
      );
      candidates = fallbackDocs;
      // actualizar searchTime para reportes simples
      // (no cambia mucho, ya que la operación fue rápida)
    }

    if (!candidates || candidates.length === 0) {
      return {
        success: true,
        results: [],
        total: 0,
        timings: {
          embed_ms: tiempo_embed,
          search_ms: searchTime,
          total_ms: tiempo_embed + searchTime,
        },
      };
    }

    if (!candidates || candidates.length === 0) {
      return {
        success: true,
        results: [],
        total: 0,
        timings: {
          embed_ms: tiempo_embed,
          search_ms: searchTime,
          total_ms: tiempo_embed + searchTime,
        },
      };
    }

    // Antes de puntuar, validar que las dimensiones del embedding de consulta
    // y de los candidatos coincidan. Si no coinciden, y se proporcionó
    // `originalQuery` en options, intentar regenerar un embedding de texto
    // usando el encoder de texto de CLIP para alinear dimensiones.
    let queryEmbedding = inputEmbedding;
    const candidateDim = (candidates[0] && candidates[0].embedding && candidates[0].embedding.length) || null;

    if (candidateDim && queryEmbedding.length !== candidateDim) {
      console.warn(`   ⚠️ Dimensiones no coinciden (query: ${queryEmbedding.length}, candidatos: ${candidateDim})`);
      if (options && options.originalQuery) {
        try {
          console.log('   🔁 Intentando regenerar embedding de texto con CLIP-text...');
          const clipEmbObj = await embeddingService.generateClipTextEmbedding(options.originalQuery);
          if (clipEmbObj && Array.isArray(clipEmbObj.embedding) && clipEmbObj.embedding.length === candidateDim) {
            queryEmbedding = clipEmbObj.embedding;
            console.log(`   ✅ Regenerado CLIP-text embedding (${queryEmbedding.length} dims)`);
          } else {
            console.warn('   ⚠️ CLIP-text regresó embedding con dimensiones inesperadas o inválidas.');
          }
        } catch (e) {
          console.warn('   ⚠️ No se pudo generar embedding CLIP-text en scoring:', e.message);
        }
      } else {
        console.warn('   ⚠️ No se proporcionó `originalQuery`; no es posible regenerar CLIP-text embedding.');
      }
    }

    const scored = candidates.map((c) => {
      let sim = 0;
      try {
        if (queryEmbedding.length === (c.embedding && c.embedding.length)) {
          sim = embeddingService.cosineSimilarity(queryEmbedding, c.embedding);
        } else {
          // Intentar calcular similitud truncando al menor tamaño común
          console.log('   🔧 Dimensiones aún no coinciden: usando truncamiento para calcular similitud');
          sim = embeddingService.cosineSimilarity(queryEmbedding, c.embedding, { allowTruncate: true });
        }
      } catch (e) {
        console.warn('   ⚠️ Error calculando similitud:', e.message);
        sim = 0;
      }
      return { ...c, score: sim };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit);

    const results = [];
    for (const c of top) {
      const referenced = await this._resolveReference(
        c.referenceCollection,
        c.referenceId
      );
      results.push({
        score: c.score,
        referenceId: c.referenceId,
        referenceCollection: c.referenceCollection,
        modelo: c.modelo,
        tipo: c.tipo,
        fecha: c.fecha,
        document: referenced,
      });
    }

    console.log(`   ✅ Resultados finales: ${results.length}`);
    if (results.length > 0) {
      console.log(`   🏆 Mejor score: ${results[0].score.toFixed(4)}`);
    }

    return {
      success: true,
      results,
      total: results.length,
      timings: {
        embed_ms: tiempo_embed,
        search_ms: searchTime,
        total_ms: tiempo_embed + searchTime,
      },
    };
  }

  // ---------- searchSimilarDocuments ----------
  async searchSimilarDocuments(documentId, options = {}) {
    await this.initialize();
    if (!documentId) throw new Error("documentId requerido");

    const embDoc = await this.embeddingsColl.findOne({
      referenceId: documentId,
      referenceCollection: "documents",
      tipo: "text",
    });

    if (!embDoc) {
      return {
        success: false,
        results: [],
        error: "No embedding encontrado para el documentId",
      };
    }

    const inputEmbedding = embDoc.embedding;
    const resultsObj = await this.searchByEmbedding(inputEmbedding, options);
    const filtered = (resultsObj.results || []).filter(
      (r) => String(r.referenceId) !== String(documentId)
    );

    return { success: true, results: filtered };
  }
}

module.exports = new VectorSearchService();
