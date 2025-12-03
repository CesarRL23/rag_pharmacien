const express = require('express');
const router = express.Router();

// ejemplo mínimo
router.get('/', (req, res) => res.json({ success: true, mensaje: "Search funciona!" }));

module.exports = router;
