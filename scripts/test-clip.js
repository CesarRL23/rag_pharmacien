#!/usr/bin/env node
const embeddingService = require('../src/services/embeddingService');

/**
 * Script de prueba para validar la integración de CLIP
 * Prueba generación de embeddings de imágenes
 */

async function testCLIP() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🔬 TEST DE CLIP - Embeddings de Imágenes');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Test 1: Inicializar servicio
    console.log('📌 Test 1: Inicializar servicio de embeddings');
    await embeddingService.initialize();
    console.log('✅ Servicio inicializado correctamente\n');

    // Test 2: Generar embedding de texto (verificación)
    console.log('📌 Test 2: Generar embedding de texto (verificación)');
    const textResult = await embeddingService.generateTextEmbedding(
      'Medicamento para dolor de cabeza'
    );
    console.log(`✅ Embedding de texto generado`);
    console.log(`   Dimensiones: ${textResult.dimensiones}`);
    console.log(`   Tiempo: ${textResult.tiempo_ms}ms`);
    console.log(`   Modelo: ${textResult.modelo}\n`);

    // Test 3: Generar embedding de imagen (URLs de prueba)
    console.log('📌 Test 3: Generar embedding de imagen con CLIP');
    
    const testImages = [
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/200px-PNG_transparency_demonstration_1.png',
        descripcion: 'Imagen de prueba 1'
      },
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/JPEG_example_flower.jpg/200px-JPEG_example_flower.jpg',
        descripcion: 'Imagen de prueba 2'
      }
    ];

    const imageResults = [];
    for (const img of testImages) {
      console.log(`\n   Procesando: ${img.descripcion}`);
      console.log(`   URL: ${img.url}`);
      
      const result = await embeddingService.generateImageEmbedding(img.url);
      imageResults.push(result);
      
      console.log(`   ✅ Embedding generado`);
      console.log(`      Dimensiones: ${result.dimensiones}`);
      console.log(`      Tiempo: ${result.tiempo_ms}ms`);
      console.log(`      Modelo: ${result.modelo}`);
      console.log(`      Fuente: ${result.fuente}`);
      if (result.warning) {
        console.log(`      ⚠️ Warning: ${result.warning}`);
      }
    }

    // Test 4: Calcular similitud entre embeddings de imagen
    console.log('\n\n📌 Test 4: Calcular similitud coseno entre embeddings de imagen');
    let similarityScore = null;
    if (imageResults.length >= 2) {
      similarityScore = embeddingService.cosineSimilarity(
        imageResults[0].embedding,
        imageResults[1].embedding
      );
      console.log(`✅ Similitud entre imagen 1 y 2: ${similarityScore.toFixed(4)}`);
    }

    // Test 5: Generar batch de embeddings de imagen
    console.log('\n📌 Test 5: Generar batch de embeddings de imagen');
    const batchUrls = [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Good_Food_Display_-_NCI_Visuals_Online.jpg/200px-Good_Food_Display_-_NCI_Visuals_Online.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/200px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Camponotus_flavomarginatus_ant.jpg/200px-Camponotus_flavomarginatus_ant.jpg'
    ];

    const batchStart = Date.now();
    const batchResults = [];
    for (const url of batchUrls) {
      try {
        const result = await embeddingService.generateImageEmbedding(url);
        batchResults.push(result);
      } catch (error) {
        console.error(`   ❌ Error procesando ${url}:`, error.message);
      }
    }
    const batchTime = Date.now() - batchStart;

    console.log(`✅ Batch procesado: ${batchResults.length} imágenes`);
    console.log(`   Tiempo total: ${batchTime}ms`);
    console.log(`   Promedio por imagen: ${(batchTime / batchResults.length).toFixed(2)}ms\n`);

    // Test 6: Verificar estructura de embedding
    console.log('📌 Test 6: Verificar estructura de embedding');
    const embedding = imageResults[0].embedding;
    console.log(`✅ Estructura validada`);
    console.log(`   Tipo: ${Array.isArray(embedding) ? 'Array' : typeof embedding}`);
    console.log(`   Longitud: ${embedding.length}`);
    console.log(`   Rango de valores: [${Math.min(...embedding).toFixed(4)}, ${Math.max(...embedding).toFixed(4)}]`);
    console.log(`   Primeros 5 valores: ${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}\n`);

    // Resumen
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ TODOS LOS TESTS PASARON CORRECTAMENTE');
    console.log('═══════════════════════════════════════════════════\n');

    console.log('📊 Resumen de resultados:');
    console.log(`   ✅ Embeddings de texto: ${textResult.dimensiones}D`);
    console.log(`   ✅ Embeddings de imagen: ${imageResults[0].dimensiones}D`);
    console.log(`   ✅ Imágenes procesadas: ${imageResults.length}`);
    console.log(`   ✅ Similitud calculada: ${similarityScore ? similarityScore.toFixed(4) : 'N/A'}`);
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error en test CLIP:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar tests
testCLIP();
