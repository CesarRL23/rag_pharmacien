const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Colores para terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(colors[color], ...args, colors.reset);
}

function separator() {
  console.log('\n' + '═'.repeat(80) + '\n');
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// EJEMPLO 1: Búsqueda Semántica Simple
async function ejemplo1() {
  separator();
  log('cyan', '📌 EJEMPLO 1: BÚSQUEDA SEMÁNTICA SIMPLE');
  log('blue', 'Descripción: Búsqueda vectorial pura sobre medicamentos para dolor\n');

  const request = {
    query: 'medicamentos para el dolor de cabeza',
    limit: 5
  };

  log('yellow', 'Request:', JSON.stringify(request, null, 2));

  try {
    const response = await axios.post(`${BASE_URL}/api/search`, request);
    
    log('green', '\n✅ Respuesta exitosa\n');
    console.log('Resultados encontrados:', response.data.results.length);
    console.log('Tiempo de búsqueda:', response.data.metadata.total_time_ms, 'ms');
    console.log('\nTop 3 resultados:');
    
    response.data.results.slice(0, 3).forEach((result, idx) => {
      console.log(`\n${idx + 1}. ${result.document.titulo}`);
      console.log(`   Score: ${result.score.toFixed(4)}`);
      console.log(`   Tipo: ${result.document.tipo}`);
      console.log(`   Extracto: ${result.document.contenido.substring(0, 150)}...`);
    });

    return { success: true, data: response.data };
  } catch (error) {
    log('red', '❌ Error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

// EJEMPLO 2: Búsqueda Híbrida con Filtros
async function ejemplo2() {
  separator();
  log('cyan', '📌 EJEMPLO 2: BÚSQUEDA HÍBRIDA CON FILTROS');
  log('blue', 'Descripción: Combina búsqueda vectorial + filtros de metadatos\n');

  const request = {
    query: 'antibióticos efectivos para infecciones',
    filters: {
      tipo: 'medicamento',
      idioma: 'es'
    },
    hybrid: true,
    limit: 5
  };

  log('yellow', 'Request:', JSON.stringify(request, null, 2));

  try {
    const response = await axios.post(`${BASE_URL}/api/search`, request);
    
    log('green', '\n✅ Respuesta exitosa\n');
    console.log('Resultados encontrados:', response.data.results.length);
    console.log('Tiempo total:', response.data.metadata.total_time_ms, 'ms');
    console.log('Pesos aplicados:', response.data.metadata.weights);
    console.log('\nResultados:');
    
    response.data.results.forEach((result, idx) => {
      console.log(`\n${idx + 1}. ${result.document.titulo}`);
      console.log(`   Score combinado: ${result.score.toFixed(4)}`);
      if (result.breakdown) {
        console.log(`   - Vector score: ${result.breakdown.vector.toFixed(4)}`);
        console.log(`   - Text score: ${result.breakdown.text.toFixed(4)}`);
      }
      console.log(`   Tags: ${result.document.tags.join(', ')}`);
    });

    return { success: true, data: response.data };
  } catch (error) {
    log('red', '❌ Error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

// EJEMPLO 3: RAG - Pregunta Compleja
async function ejemplo3() {
  separator();
  log('cyan', '📌 EJEMPLO 3: RAG - PREGUNTA COMPLEJA');
  log('blue', 'Descripción: Pipeline RAG completo con generación usando LLM\n');

  const request = {
    pregunta: '¿Qué precauciones debo tener al tomar ibuprofeno con otros medicamentos?',
    max_contexto: 3,
    temperature: 0.7
  };

  log('yellow', 'Request:', JSON.stringify(request, null, 2));

  try {
    const response = await axios.post(`${BASE_URL}/api/rag`, request);
    
    if (response.data.success) {
      log('green', '\n✅ Respuesta RAG generada\n');
      console.log('PREGUNTA:', response.data.pregunta);
      console.log('\nRESPUESTA:');
      console.log(response.data.respuesta);
      console.log('\n📚 FUENTES CONSULTADAS:');
      response.data.fuentes.forEach((fuente, idx) => {
        console.log(`${idx + 1}. ${fuente.titulo} (score: ${fuente.score.toFixed(4)})`);
      });
      console.log('\n📊 METADATA:');
      console.log('- Modelo:', response.data.metadata.modelo);
      console.log('- Tokens usados:', response.data.metadata.tokens_usados);
      console.log('- Tiempo de búsqueda:', response.data.metadata.tiempo_busqueda_ms, 'ms');
      console.log('- Tiempo LLM:', response.data.metadata.tiempo_llm_ms, 'ms');
      console.log('- Tiempo total:', response.data.metadata.tiempo_total_ms, 'ms');
    } else {
      log('red', '❌ Error en RAG:', response.data.error);
    }

    return { success: response.data.success, data: response.data };
  } catch (error) {
    log('red', '❌ Error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

// EJEMPLO 4: Búsqueda Multimodal
async function ejemplo4() {
  separator();
  log('cyan', '📌 EJEMPLO 4: BÚSQUEDA MULTIMODAL (TEXTO → IMÁGENES)');
  log('blue', 'Descripción: Buscar imágenes usando descripción de texto\n');

  const request = {
    query: 'pastillas para la presión arterial',
    tipo: 'text-to-image',
    limit: 5
  };

  log('yellow', 'Request:', JSON.stringify(request, null, 2));

  try {
    const response = await axios.post(`${BASE_URL}/api/search/multimodal`, request);
    
    log('green', '\n✅ Búsqueda multimodal completada\n');
    console.log('Tipo de búsqueda:', response.data.query_type);
    console.log('Resultados:', response.data.results.length);
    
    if (response.data.results.length > 0) {
      console.log('\nImágenes encontradas:');
      response.data.results.slice(0, 3).forEach((result, idx) => {
        console.log(`\n${idx + 1}. Score: ${result.score.toFixed(4)}`);
        console.log(`   Referencia: ${result.referenceId}`);
      });
    } else {
      console.log('\nℹ️  No se encontraron imágenes. Asegúrate de haber ejecutado el script de ingesta de imágenes.');
    }

    return { success: true, data: response.data };
  } catch (error) {
    log('red', '❌ Error:', error.response?.data || error.message);
    if (error.response?.data?.error?.includes('CLIP')) {
      log('yellow', '\n⚠️  NOTA: La búsqueda multimodal requiere implementación completa de CLIP.');
      log('yellow', 'Este es un ejemplo placeholder. Para producción, integrar servicio CLIP real.');
    }
    return { success: false, error: error.message };
  }
}

// EJEMPLO 5: RAG Contextualizado
async function ejemplo5() {
  separator();
  log('cyan', '📌 EJEMPLO 5: RAG CONTEXTUALIZADO');
  log('blue', 'Descripción: RAG con contexto adicional del paciente\n');

  const request = {
    pregunta: '¿Qué medicamento me recomiendas?',
    contexto_adicional: 'Paciente de 65 años con hipertensión que toma aspirina diaria',
    max_contexto: 5,
    filters: {
      tipo: 'medicamento'
    }
  };

  log('yellow', 'Request:', JSON.stringify(request, null, 2));

  try {
    const response = await axios.post(`${BASE_URL}/api/rag`, request);
    
    if (response.data.success) {
      log('green', '\n✅ Respuesta RAG contextualizada generada\n');
      console.log('PREGUNTA:', response.data.pregunta);
      console.log('\nCONTEXTO PACIENTE:', request.contexto_adicional);
      console.log('\nRESPUESTA:');
      console.log(response.data.respuesta);
      console.log('\n📚 DOCUMENTOS CONSULTADOS:', response.data.contexto_usado);
      response.data.fuentes.forEach((fuente, idx) => {
        console.log(`${idx + 1}. ${fuente.titulo}`);
      });
      console.log('\n⏱️  TIEMPOS:');
      console.log('- Total:', response.data.metadata.tiempo_total_ms, 'ms');
    } else {
      log('red', '❌ Error en RAG:', response.data.error);
    }

    return { success: response.data.success, data: response.data };
  } catch (error) {
    log('red', '❌ Error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

// Ejecutar todos los ejemplos
async function runAllExamples() {
  console.log('\n');
  log('green', '╔════════════════════════════════════════════════════════════════════════════╗');
  log('green', '║                    DEMO: 5 EJEMPLOS SISTEMA RAG MONGODB                    ║');
  log('green', '╚════════════════════════════════════════════════════════════════════════════╝');
  
  // Verificar que el servidor esté corriendo
  try {
    await axios.get(`${BASE_URL}/health`);
    log('green', '\n✅ Servidor corriendo en', BASE_URL);
  } catch (error) {
    log('red', '\n❌ Error: El servidor no está corriendo en', BASE_URL);
    log('yellow', 'Por favor, inicia el servidor con: npm start\n');
    process.exit(1);
  }

  const results = {
    ejemplo1: null,
    ejemplo2: null,
    ejemplo3: null,
    ejemplo4: null,
    ejemplo5: null
  };

  // Ejecutar ejemplos con delay entre ellos
  results.ejemplo1 = await ejemplo1();
  await sleep(1000);
  
  results.ejemplo2 = await ejemplo2();
  await sleep(1000);
  
  results.ejemplo3 = await ejemplo3();
  await sleep(1000);
  
  results.ejemplo4 = await ejemplo4();
  await sleep(1000);
  
  results.ejemplo5 = await ejemplo5();

  // Resumen final
  separator();
  log('cyan', '📊 RESUMEN DE EJECUCIÓN');
  console.log('');
  
  const ejemplos = [
    { name: 'Búsqueda Semántica Simple', result: results.ejemplo1 },
    { name: 'Búsqueda Híbrida con Filtros', result: results.ejemplo2 },
    { name: 'RAG - Pregunta Compleja', result: results.ejemplo3 },
    { name: 'Búsqueda Multimodal', result: results.ejemplo4 },
    { name: 'RAG Contextualizado', result: results.ejemplo5 }
  ];

  ejemplos.forEach((ej, idx) => {
    const status = ej.result.success ? '✅' : '❌';
    console.log(`${status} Ejemplo ${idx + 1}: ${ej.name}`);
  });

  const exitosos = ejemplos.filter(e => e.result.success).length;
  console.log('');
  log('green', `Total exitosos: ${exitosos}/${ejemplos.length}`);
  
  separator();
}

// Ejecutar
runAllExamples()
  .then(() => {
    log('green', '✨ Demo completada\n');
    process.exit(0);
  })
  .catch(error => {
    log('red', '❌ Error ejecutando demo:', error);
    process.exit(1);
  });