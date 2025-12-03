const Document = require('../src/models/Document');
const Image = require('../src/models/Image');
const Embedding = require('../src/models/Embedding');
const { connectDB } = require('../src/config/db');
const embeddingService = require('../src/services/embeddingService');

const SAMPLE_HYBRID = [
  // Tus documentos con array "images"
];

async function ingestHybrid() {
  try {
    console.log('📥 Iniciando ingesta híbrida de documentos + imágenes...');
    await connectDB();
    await embeddingService.initialize();

    let docIngested = 0;
    let docFailed = 0;
    let imgIngested = 0;
    let imgFailed = 0;

    for (const docData of SAMPLE_HYBRID) {
      try {
        const { images, ...docFields } = docData;
        const document = await Document.create(docFields);
        const imageIds = [];

        for (const imgData of images || []) {
          try {
            const image = await Image.create(imgData);
            imageIds.push(image._id);

            const { embedding, tiempo_ms } = await embeddingService.generateImageEmbedding(imgData.url);
            await Embedding.create({
              tipo: 'image',
              embedding,
              referenceId: image._id,
              referenceCollection: 'images',
              modelo: 'clip-vit-base-patch32',
              fecha: new Date()
            });

            console.log(`   🖼 Imagen "${imgData.titulo || imgData.url}" procesada (${embedding.length} dims en ${tiempo_ms}ms)`);
            imgIngested++;
          } catch (imgErr) {
            console.error(`❌ Error procesando imagen "${imgData.titulo || imgData.url}":`, imgErr.message);
            imgFailed++;
          }
        }

        if (imageIds.length) await Document.update(document._id, { imageIds });

        const { embedding: textEmbedding, tiempo_ms: textTime } = await embeddingService.generateTextEmbedding(
          `${document.title}. ${document.content}`
        );
        await Embedding.create({
          tipo: 'text',
          embedding: textEmbedding,
          referenceId: document._id,
          referenceCollection: 'documents',
          modelo: 'all-MiniLM-L6-v2',
          fecha: new Date()
        });

        console.log(`✅ Documento híbrido "${document.title}" procesado (${textEmbedding.length} dims en ${textTime}ms)`);
        docIngested++;
      } catch (docErr) {
        console.error(`❌ Error procesando documento "${docData.title}":`, docErr.message);
        docFailed++;
      }
    }

    console.log(`\n📊 Ingesta completada: Documentos: ${docIngested} ✅ / ${docFailed} ❌ | Imágenes: ${imgIngested} ✅ / ${imgFailed} ❌`);
  } catch (error) {
    console.error('❌ Error general en ingesta híbrida:', error);
  } finally {
    process.exit(0);
  }
}

ingestHybrid();