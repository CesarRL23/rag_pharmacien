const { connectDB, getDB } = require("../src/config/db");

async function diagnose() {
  try {
    console.log("🔍 Iniciando diagnóstico de base de datos...\n");

    // Conectar primero
    console.log("🔗 Conectando a MongoDB...");
    await connectDB();
    console.log("✅ Conectado\n");

    const db = getDB();

    // 1. Verificar colecciones
    console.log("📋 COLECCIONES EN LA BD:");
    const collections = await db.listCollections().toArray();
    collections.forEach((c) => console.log(`   - ${c.name}`));

    // 2. Contar documentos en cada colección
    console.log("\n📊 CONTEO DE DOCUMENTOS:");
    const documents = await db.collection("documents").countDocuments();
    const images = await db.collection("images").countDocuments();
    const embeddings = await db.collection("embeddings").countDocuments();
    console.log(`   - documents: ${documents}`);
    console.log(`   - images: ${images}`);
    console.log(`   - embeddings: ${embeddings}`);

    // 3. Ver índices en embeddings
    console.log('\n🏷️  ÍNDICES EN COLECCIÓN "embeddings":');
    const indexes = await db.collection("embeddings").listIndexes().toArray();
    if (indexes.length === 0) {
      console.log("   ⚠️  NO HAY ÍNDICES");
    } else {
      indexes.forEach((idx, i) => {
        console.log(`   [${i}] ${idx.name}`);
        if (idx.key) console.log(`       Campos: ${JSON.stringify(idx.key)}`);
      });
    }

    // 4. Ver primeros documentos embeddings
    if (embeddings > 0) {
      console.log("\n📝 PRIMEROS 3 DOCUMENTOS EN embeddings:");
      const sample = await db
        .collection("embeddings")
        .find()
        .limit(3)
        .toArray();
      sample.forEach((doc, i) => {
        console.log(`   [${i}] ID: ${doc._id}`);
        console.log(`       referenceId: ${doc.referenceId}`);
        console.log(`       referenceCollection: ${doc.referenceCollection}`);
        console.log(`       tipo: ${doc.tipo}`);
        console.log(
          `       embedding dims: ${Array.isArray(doc.embedding) ? doc.embedding.length : "N/A"}`
        );
      });
    }

    // 5. Ver primeros documentos documents
    if (documents > 0) {
      console.log("\n📄 PRIMEROS 2 DOCUMENTOS EN documents:");
      const sample = await db.collection("documents").find().limit(2).toArray();
      sample.forEach((doc, i) => {
        console.log(`   [${i}] ID: ${doc._id}`);
        console.log(`       title: ${doc.title || "N/A"}`);
        console.log(`       tipo: ${doc.tipo || "N/A"}`);
      });
    }

    console.log("\n✅ Diagnóstico completado\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

diagnose();
