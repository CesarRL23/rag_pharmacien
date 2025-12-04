#!/usr/bin/env node
/**
 * Script: check-text-embeddings.js
 * Diagnostica embeddings de tipo 'text' en la colección 'embeddings'
 */

require("dotenv").config();

const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB_NAME || "rag_pharmacien";

if (!MONGO_URI) {
  console.error("❌ Error: MONGO_URI no definido en .env");
  process.exit(1);
}

async function checkTextEmbeddings() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log("✅ MongoDB conectado correctamente");

    const db = client.db(DB_NAME);
    const embeddingsColl = db.collection("embeddings");

    // Contar embeddings de tipo 'text'
    const count = await embeddingsColl.countDocuments({ tipo: "text" });
    console.log(`📊 Embeddings tipo=text: ${count}`);

    if (count === 0) {
      console.warn(
        "⚠️  No hay embeddings de tipo text. Necesitas ingerir documentos primero."
      );
      console.warn("   Ejecuta: node scripts/ingest-documents.js");
      return;
    }

    // Muestrear los primeros 10
    const samples = await embeddingsColl
      .find({ tipo: "text" })
      .limit(10)
      .toArray();

    samples.forEach((doc, idx) => {
      const dims =
        doc.embedding && doc.embedding.length ? doc.embedding.length : "N/A";
      const hasNonZero =
        doc.embedding && doc.embedding.some((v) => Math.abs(v) > 0.01);
      const sampleVals = doc.embedding
        ? doc.embedding.slice(0, 5).map((v) => v.toFixed(5))
        : [];

      console.log(`\n[${idx}] _id: ${doc._id}`);
      console.log(`    referenceId: ${doc.referenceId}`);
      console.log(`    referenceCollection: ${doc.referenceCollection}`);
      console.log(`    tipo: ${doc.tipo}`);
      console.log(`    dims: ${dims}`);
      console.log(`    sample vals: [${sampleVals.join(", ")}]`);
      console.log(`    anyNonZero: ${hasNonZero}`);
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.close();
  }
}

checkTextEmbeddings();
