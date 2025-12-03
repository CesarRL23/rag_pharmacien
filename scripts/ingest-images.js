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
    await embeddingService.initializeCLIP();

    const filePath = path.join(__dirname, '../data/sample-images.json');
    const images = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    let ingested = 0;
    let failed = 0;

    for (const img of images) {
      try {
        console.log(`\n🔄 Procesando: "${img.titulo}"`);
        console.log(`   URL: ${img.url}`);

        // Guardar la imagen en la base de datos
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

        console.log('   🧠 Generando embedding real con CLIP...');
        
        // Pasar la URL o base64 directamente al servicio
        // El servicio manejará internamente si es URL o base64
        const { embedding, tiempo_ms } = await embeddingService.generateImageEmbedding(img.url);

        // Validar que el embedding sea real (no todos ceros)
        const isRealEmbedding = embedding.some(val => Math.abs(val) > 0.01);
        
        if (!isRealEmbedding) {
          throw new Error('Se generó un embedding inválido (todos valores cercanos a cero)');
        }

        await Embedding.create({
          tipo: 'image',
          embedding,
          referenceId: savedImage._id,
          referenceCollection: 'images',
          modelo: 'clip-vit-base-patch32',
          fecha: new Date()
        });

        console.log(`   ✅ Imagen "${savedImage.titulo}" ingerida`);
        console.log(`      - Embedding: ${embedding.length} dimensiones`);
        console.log(`      - Tiempo: ${tiempo_ms}ms`);
        console.log(`      - Muestra: [${embedding.slice(0, 3).map(v => v.toFixed(4)).join(', ')}...]`);
        
        ingested++;
      } catch (error) {
        console.error(`   ❌ Error procesando imagen "${img.titulo || img.url}":`, error.message);
        console.error(`      Stack: ${error.stack}`);
        failed++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 RESUMEN DE INGESTA:`);
    console.log(`   ✅ Exitosas: ${ingested}`);
    console.log(`   ❌ Fallidas: ${failed}`);
    console.log(`   📈 Total: ${ingested + failed}`);
    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    console.error('❌ Error general en ingesta de imágenes:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

ingestImages();