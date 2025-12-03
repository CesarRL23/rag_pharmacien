const vectorSearchService = require('../services/vectorSearchService');
const Document = require('../models/Document');

class SearchController {
  async search(req, res) {
    try {
      const { query, filters = {}, limit = 10, hybrid = false } = req.body;

      if (!query || typeof query !== 'string' || query.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Se requiere un query válido'
        });
      }

      console.log(`🔍 Búsqueda: "${query}" | Híbrido: ${hybrid}`);

      let results;

      if (hybrid) {
        // Búsqueda híbrida (vector + texto)
        results = await vectorSearchService.hybridSearch(query, {
          limit,
          filters
        });
      } else {
        // Búsqueda vectorial pura
        results = await vectorSearchService.searchByText(query, {
          limit,
          filters
        });
      }

      return res.json({
        success: true,
        query,
        filters,
        ...results
      });
    } catch (error) {
      console.error('Error en búsqueda:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async multimodalSearch(req, res) {
    try {
      const { query, tipo = 'text-to-image', limit = 10 } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere un query'
        });
      }

      console.log(`🖼️  Búsqueda multimodal: "${query}" | Tipo: ${tipo}`);

      const results = await vectorSearchService.multimodalSearch(query, {
        tipo,
        limit
      });

      return res.json({
        success: true,
        query,
        tipo,
        ...results
      });
    } catch (error) {
      console.error('Error en búsqueda multimodal:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getSimilar(req, res) {
    try {
      const { documentId } = req.params;
      const { limit = 5 } = req.query;

      if (!documentId) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere un documentId'
        });
      }

      console.log(`🔗 Buscando similares a: ${documentId}`);

      const results = await vectorSearchService.searchSimilarDocuments(
        documentId,
        { limit: parseInt(limit) }
      );

      return res.json({
        success: true,
        ...results
      });
    } catch (error) {
      console.error('Error buscando similares:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getDocument(req, res) {
    try {
      const { id } = req.params;

      const document = await Document.findById(id);

      if (!document) {
        return res.status(404).json({
          success: false,
          error: 'Documento no encontrado'
        });
      }

      return res.json({
        success: true,
        document
      });
    } catch (error) {
      console.error('Error obteniendo documento:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async listDocuments(req, res) {
    try {
      const { tipo, idioma, limit = 20, skip = 0 } = req.query;

      const filters = {};
      if (tipo) filters.tipo = tipo;
      if (idioma) filters.idioma = idioma;

      const documents = await Document.findMany(filters, {
        limit: parseInt(limit),
        skip: parseInt(skip)
      });

      const total = await Document.count(filters);

      return res.json({
        success: true,
        documents,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: skip + documents.length < total
        }
      });
    } catch (error) {
      console.error('Error listando documentos:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new SearchController();