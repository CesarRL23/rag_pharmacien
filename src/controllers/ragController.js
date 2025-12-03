const ragService = require('../services/ragService');

const ragController = {
  query: async (req, res) => {
    try {
      const { pregunta, contextoAdicional = '', filters = {}, temperature = 0.7, maxContexto = 5 } = req.body;

      if (!pregunta || typeof pregunta !== 'string' || pregunta.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Se requiere una pregunta válida'
        });
      }

      console.log(`🤖 Query RAG: "${pregunta}"`);

      const resultado = await ragService.query(pregunta, {
        contextoAdicional,
        filters,
        temperature,
        maxContexto: parseInt(maxContexto) || 5
      });

      return res.json(resultado);
    } catch (error) {
      console.error('❌ Error en RAG query:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  conversational: async (req, res) => {
    try {
      const { mensajes = [], temperature = 0.7 } = req.body;

      if (!Array.isArray(mensajes) || mensajes.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere un array de mensajes válido'
        });
      }

      console.log(`💬 RAG Conversacional: ${mensajes.length} mensajes`);

      const resultado = await ragService.conversationalRAG(mensajes, { temperature });

      return res.json(resultado);
    } catch (error) {
      console.error('❌ Error en RAG conversacional:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  batch: async (req, res) => {
    try {
      const { preguntas = [], temperature = 0.7 } = req.body;

      if (!Array.isArray(preguntas) || preguntas.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere un array de preguntas válido'
        });
      }

      console.log(`📦 Batch RAG: ${preguntas.length} preguntas`);

      const resultado = await ragService.batchQuery(preguntas, { temperature });

      return res.json(resultado);
    } catch (error) {
      console.error('❌ Error en batch RAG:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  healthCheck: (req, res) => {
    res.json({
      status: 'ok',
      servicio: 'RAG Controller',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = ragController;
