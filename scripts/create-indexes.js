const { connectDB, closeDB } = require('../src/config/db');
const Document = require('../src/models/Document');
const Embedding = require('../src/models/Embedding');
const Image = require('../src/models/Image');

async function createIndexes() {
  try {
    console.log('🔧 Iniciando creación de índices...\n');

    const db = await connectDB();

    // 1. Crear colecciones con validación de schema
    console.log('📋 Creando colecciones con validación...');

    // Documents
    try {
      await db.createCollection('documents', {
        validator: Document.getValidationSchema()
      });
      console.log('✅ Colección "documents" creada');
    } catch (error) {
      if (error.code === 48) {
        console.log('ℹ️  Colección "documents" ya existe');
      } else {
        throw error;
      }
    }

    // Embeddings
    try {
      await db.createCollection('embeddings', {
        validator: Embedding.getValidationSchema()
      });
      console.log('✅ Colección "embeddings" creada');
    } catch (error) {
      if (error.code === 48) {
        console.log('ℹ️  Colección "embeddings" ya existe');
      } else {
        throw error;
      }
    }

    // Images
    try {
      await db.createCollection('images', {
        validator: Image.getValidationSchema()
      });
      console.log('✅ Colección "images" creada');
    } catch (error) {
      if (error.code === 48) {
        console.log('ℹ️  Colección "images" ya existe');
      } else {
        throw error;
      }
    }

    console.log('');

    // 2. Crear índices en documents
    console.log('📑 Creando índices en "documents"...');
    const docsCollection = db.collection('documents');

    // Índice de texto completo
    await docsCollection.createIndex(
      { titulo: 'text', contenido: 'text' },
      { name: 'text_search_index' }
    );
    console.log('✅ Índice de texto completo creado');

    // Índice compuesto fecha-idioma
    await docsCollection.createIndex(
      { fecha: 1, idioma: 1 },
      { name: 'fecha_idioma_index' }
    );
    console.log('✅ Índice compuesto (fecha, idioma) creado');

    // Índice por tipo
    await docsCollection.createIndex(
      { tipo: 1 },
      { name: 'tipo_index' }
    );
    console.log('✅ Índice de tipo creado');

    // Índice por tags
    await docsCollection.createIndex(
      { tags: 1 },
      { name: 'tags_index' }
    );
    console.log('✅ Índice de tags creado');

    console.log('');

    // 3. Crear índices en embeddings
    console.log('📑 Creando índices en "embeddings"...');
    const embeddingsCollection = db.collection('embeddings');

    // Índice por referencia
    await embeddingsCollection.createIndex(
      { referenceId: 1, referenceCollection: 1 },
      { name: 'reference_index', unique: true }
    );
    console.log('✅ Índice de referencia creado');

    // Índice por tipo
    await embeddingsCollection.createIndex(
      { tipo: 1 },
      { name: 'tipo_index' }
    );
    console.log('✅ Índice de tipo creado');

    console.log('');

    // 4. Instrucciones para Vector Search Index
    console.log('📌 IMPORTANTE: Índice Vectorial');
    console.log('═══════════════════════════════════════════════════════');
    console.log('⚠️  El índice vectorial debe crearse manualmente en MongoDB Atlas:');
    console.log('');
    console.log('1. Ve a MongoDB Atlas → Database → Browse Collections');
    console.log('2. Selecciona la base de datos:', process.env.MONGO_DB_NAME);
    console.log('3. Ve a la pestaña "Search Indexes"');
    console.log('4. Crea un nuevo "Atlas Vector Search Index" con esta configuración:');
    console.log('');
    console.log('Nombre del índice: vector_index_embeddings');
    console.log('Colección: embeddings');
    console.log('');
    console.log('Definición JSON:');
    console.log(JSON.stringify({
      fields: [
        {
          type: 'vector',
          path: 'embedding',
          numDimensions: 384,
          similarity: 'cosine'
        },
        {
          type: 'filter',
          path: 'tipo'
        }
      ]
    }, null, 2));
    console.log('');
    console.log('5. Guarda y espera a que el índice se construya (~2-5 minutos)');
    console.log('═══════════════════════════════════════════════════════');

    console.log('');
    console.log('✅ Índices creados exitosamente');
    console.log('');

    // Listar todos los índices
    const allIndexes = {
      documents: await docsCollection.indexes(),
      embeddings: await embeddingsCollection.indexes()
    };

    console.log('📊 Resumen de índices creados:');
    console.log('Documents:', allIndexes.documents.map(i => i.name).join(', '));
    console.log('Embeddings:', allIndexes.embeddings.map(i => i.name).join(', '));

  } catch (error) {
    console.error('❌ Error creando índices:', error);
    throw error;
  } finally {
    await closeDB();
  }
}

// Ejecutar
createIndexes()
  .then(() => {
    console.log('\n✨ Proceso completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });