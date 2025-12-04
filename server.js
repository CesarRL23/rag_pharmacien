const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const { connectDB } = require("./src/config/db");
const searchRoutes = require("./src/routes/search");
const ragRoutes = require("./src/routes/rag");
const embeddingService = require("./src/services/embeddingService");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("dev"));

// Logging personalizado
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.log(
        `⚠️  Respuesta lenta: ${req.method} ${req.path} - ${duration}ms`
      );
    }
  });
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "RAG MongoDB System",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Routes
app.use("/api/search", searchRoutes);
app.use("/api/rag", ragRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint no encontrado",
    path: req.path,
    method: req.method,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("❌ Error no manejado:", err);

  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Error interno del servidor",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// Iniciar servidor
const startServer = async () => {
  try {
    // Conectar a MongoDB
    await connectDB();

    // Inicializar modelos de embeddings (especialmente CLIP) al inicio
    try {
      console.log(
        "🔄 Inicializando servicios de embeddings (CLIP/text) en background..."
      );
      // inicializar modelo de texto ligero y CLIP (imagen + texto cuando esté disponible)
      await embeddingService.initialize();
      await embeddingService.initializeCLIP();
      console.log("✅ Servicios de embeddings inicializados");
    } catch (e) {
      console.warn(
        "⚠️ No se pudo inicializar completamente embeddingService en startup:",
        e.message
      );
      console.warn(
        "   Se intentará inicializar bajo demanda en las primeras peticiones."
      );
    }

    // Iniciar servidor HTTP
    app.listen(PORT, () => {
      console.log("");
      console.log("═══════════════════════════════════════════════");
      console.log("🚀 Sistema RAG MongoDB iniciado correctamente");
      console.log("═══════════════════════════════════════════════");
      console.log(`📡 Servidor: http://localhost:${PORT}`);
      console.log(`🗄️  Base de datos: ${process.env.MONGO_DB_NAME}`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || "development"}`);
      console.log("");
      console.log("📚 Endpoints disponibles:");
      console.log("   POST /api/search - Búsqueda vectorial/híbrida");
      console.log("   POST /api/search/multimodal - Búsqueda multimodal");
      console.log("   GET  /api/search/similar/:id - Documentos similares");
      console.log("   POST /api/rag - Query RAG con LLM");
      console.log("   POST /api/rag/conversational - RAG conversacional");
      console.log("   GET  /health - Health check");
      console.log("═══════════════════════════════════════════════");
      console.log("");
    });
  } catch (error) {
    console.error("❌ Error iniciando servidor:", error);
    process.exit(1);
  }
};

// Manejo de errores no capturados
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

// Iniciar
startServer();

module.exports = app;
