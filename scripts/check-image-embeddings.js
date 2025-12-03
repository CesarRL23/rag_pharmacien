const { connectDB, getDB } = require('../src/config/db');

async function run() {
  try {
    await connectDB();
    const db = getDB();
    const coll = db.collection('embeddings');

    const total = await coll.countDocuments({ tipo: 'image' });
    console.log(`📊 Embeddings tipo=image: ${total}`);

    const sample = await coll.find({ tipo: 'image' }).limit(10).toArray();
    if (sample.length === 0) {
      console.log('⚠️ No se encontraron embeddings de imágenes');
      process.exit(0);
    }

    sample.forEach((doc, i) => {
      const emb = doc.embedding || [];
      const dims = Array.isArray(emb) ? emb.length : 'N/A';
      const first = Array.isArray(emb) && emb.length > 0 ? emb.slice(0,5).map(v => Number(v).toFixed(5)).join(', ') : 'N/A';
      const anyNonZero = Array.isArray(emb) ? emb.some(v => Math.abs(v) > 1e-4) : false;
      console.log(`\n[${i}] _id: ${doc._id}`);
      console.log(`    referenceId: ${doc.referenceId}`);
      console.log(`    referenceCollection: ${doc.referenceCollection}`);
      console.log(`    tipo: ${doc.tipo}`);
      console.log(`    dims: ${dims}`);
      console.log(`    sample vals: [${first}]`);
      console.log(`    anyNonZero: ${anyNonZero}`);
    });

    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

run();
