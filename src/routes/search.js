// src/routes/search.js
const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// POST /api/search  -> router.post('/')
router.post('/', searchController.search.bind(searchController));

// POST /api/search/multimodal
router.post('/multimodal', searchController.multimodalSearch.bind(searchController));

// GET /api/search/similar/:id
router.get('/similar/:id', searchController.getSimilar.bind(searchController));

// GET /api/search/document/:id  (obtener documento completo)
router.get('/document/:id', searchController.getDocument.bind(searchController));

// GET /api/search/list?tipo=... (listar documentos)
router.get('/list', searchController.listDocuments.bind(searchController));

// small health route for this router
router.get('/health', (req, res) => res.json({ status: 'ok', service: 'search-router' }));

module.exports = router;
