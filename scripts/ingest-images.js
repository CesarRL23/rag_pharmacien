const fs = require('fs');
const path = require('path');
const Image = require('../src/models/Image');
const Embedding = require('../src/models/Embedding');
const Document = require('../src/models/Document');
const { connectDB } = require('../src/config/db');
const embeddingService = require('../src/services/embeddingService');

async function ingestImages() {
  try {
    console.log('📥 Iniciando ingesta de imágenes...\n');
    await connectDB();
    await embeddingService.initialize();

    const filePath = path.join(__dirname, '../data/sample-images.json');
    const images = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    let ingested = 0;
    let failed = 0;

    for (const img of images) {
      try {
        const savedImage = await Image.create(img);

        // Asociar con documento si existe
        if (img.documentTitle) {
          const docs = await Document.findMany({ titulo: img.documentTitle });
          if (docs.length > 0) {
            const doc = docs[0];
            await Document.update(doc._id, {
              imageIds: [...(doc.imageIds || []), savedImage._id]
            });
          }
        }

        // Generar embedding de imagen
        const { embedding, tiempo_ms } = await embeddingService.generateImageEmbedding(savedImage.url);

        await Embedding.create({
          tipo: 'image',
          embedding,
          referenceId: savedImage._id,
          referenceCollection: 'images',
          modelo: 'clip-vit-base-patch32',
          fecha: new Date()
        });

        console.log(`✅ Imagen "${savedImage.titulo}" ingerida con embedding (${embedding.length} dims en ${tiempo_ms}ms)`);
        ingested++;
      } catch (error) {
        console.error(`❌ Error procesando imagen "${img.titulo || img.url}":`, error.message);
        failed++;
      }
    }

    console.log(`\n📊 Total de imágenes ingeridas: ${ingested}, fallidas: ${failed}`);
  } catch (error) {
    console.error('❌ Error general en ingesta de imágenes:', error);
  } finally {
    process.exit(0);
  }
}

ingestImages();
