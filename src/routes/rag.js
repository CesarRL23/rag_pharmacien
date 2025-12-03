const express = require('express');
const router = express.Router();
const ragController = require('../controllers/ragController');

// POST /api/rag - Query RAG principal
router.post('/', ragController.query.bind(ragController));

// POST /api/rag/conversational - RAG conversacional con historial
router.post('/conversational', ragController.conversational.bind(ragController));

// POST /api/rag/batch - Procesar múltiples preguntas
router.post('/batch', ragController.batch.bind(ragController));

// GET /api/rag/health - Health check del servicio RAG
router.get('/health', ragController.healthCheck.bind(ragController));

module.exports = router;