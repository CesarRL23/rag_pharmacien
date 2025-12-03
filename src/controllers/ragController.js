// src/controllers/ragController.js
const ragController = {
  query: async (req, res) => {
    // Aquí va la lógica RAG real
    res.json({ success: true, mensaje: "Funciona query RAG!" });
  },

  conversational: async (req, res) => {
    res.json({ success: true, mensaje: "Funciona RAG conversacional!" });
  },

  batch: async (req, res) => {
    res.json({ success: true, mensaje: "Funciona batch RAG!" });
  },

  healthCheck: (req, res) => {
    res.json({
      status: "ok",
      servicio: "RAG Controller",
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = ragController;
