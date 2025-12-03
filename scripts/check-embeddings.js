const { connectDB, closeDB, getDB } = require('../src/config/db');

async function checkEmbeddings() {
  try {
    const db = await connectDB();
    const embeddingsColl = db.collection('embeddings');

    const total = await embeddingsColl.countDocuments();
    const imagesCount = await embeddingsColl.countDocuments({ referenceCollection: 'images' });
    const docsCount = await embeddingsColl.countDocuments({ referenceCollection: 'documents' });

    console.log('📊 Embeddings - resumen:');
    console.log(`   Total embeddings: ${total}`);
    console.log(`   Embeddings (images): ${imagesCount}`);
    console.log(`   Embeddings (documents): ${docsCount}`);

    const sample = await embeddingsColl.find({ referenceCollection: 'images' }).limit(5).toArray();
    if (!sample || sample.length === 0) {
      console.log('\n⚠️  No se encontraron embeddings para images en la colección "embeddings"');
    } else {
      console.log('\n🔎 Ejemplo de embeddings (images):');
      for (const s of sample) {
        console.log(`   - _id: ${s._id} | referenceId: ${s.referenceId} | tipo: ${s.tipo} | modelo: ${s.modelo} | embedding_len: ${Array.isArray(s.embedding) ? s.embedding.length : 'N/A'}`);
      }
    }

    // Mostrar índices normales de la colección embeddings
    const indexes = await embeddingsColl.indexes();
    console.log('\n🧾 Índices (colección embeddings):');
    indexes.forEach(i => console.log(`   - ${i.name}: ${JSON.stringify(i.key)}`));

  } catch (error) {
    console.error('❌ Error comprobando embeddings:', error);
  } finally {
    await closeDB();
    process.exit(0);
  }
}

checkEmbeddings();
