const Groq = require('groq-sdk');
const vectorSearchService = require('./vectorSearchService');
require('dotenv').config();

class RAGService {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
    this.model = 'llama-3.1-70b-versatile';
    this.maxTokens = parseInt(process.env.RAG_MAX_TOKENS) || 2000;
  }

  async query(pregunta, options = {}) {
    const {
      maxContexto = parseInt(process.env.RAG_MAX_CONTEXT_DOCS) || 5,
      contextoAdicional = '',
      filters = {},
      temperature = 0.7
    } = options;

    try {
      const startTime = Date.now();
      const timings = {};
   
      // ETAPA 1: Generar embedding y buscar contexto relevante
      console.log('🔍 Paso 1: Buscando contexto relevante...');
      const searchStart = Date.now();
      
      const searchResults = await vectorSearchService.searchByText(pregunta, {
        limit: maxContexto,
        filters,
        vectorIndexName: 'vector_index_medicamentos'
      });

      timings.search_ms = Date.now() - searchStart;
      console.log(`✅ Encontrados ${searchResults.results.length} documentos en ${timings.search_ms}ms`);

      if (searchResults.results.length === 0) {
        return {
          success: false,
          error: 'No se encontró contexto relevante para responder la pregunta',
          pregunta
        };
      }

      // ETAPA 2: Extraer y formatear contexto
      const contexto = searchResults.results.map((r, idx) => {
        const doc = r.document;
        return `[Documento ${idx + 1}]
Título: ${doc.titulo}
Tipo: ${doc.tipo}
Contenido: ${doc.contenido}
---`;
      }).join('\n\n');

      // ETAPA 3: Construir prompt con contexto
      const prompt = this.buildPrompt(pregunta, contexto, contextoAdicional);

      // ETAPA 4: Generar respuesta con Groq/Llama
      console.log('🤖 Paso 2: Generando respuesta con LLM...');
      const llmStart = Date.now();

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: this.model,
        temperature: temperature,
        max_tokens: this.maxTokens,
        top_p: 1,
        stream: false
      });

      timings.llm_ms = Date.now() - llmStart;
      timings.total_ms = Date.now() - startTime;

      const respuesta = completion.choices[0]?.message?.content || 'No se pudo generar una respuesta.';

      console.log(`✅ Respuesta generada en ${timings.llm_ms}ms`);

      // ETAPA 5: Post-procesamiento y metadata
      const fuentes = searchResults.results.map(r => ({
        _id: r.document._id,
        titulo: r.document.titulo,
        tipo: r.document.tipo,
        score: r.score,
        fecha: r.document.fecha
      }));

      return {
        success: true,
        respuesta,
        pregunta,
        contexto_usado: searchResults.results.length,
        fuentes,
        metadata: {
          modelo: this.model,
          tokens_usados: completion.usage?.total_tokens || 0,
          tokens_prompt: completion.usage?.prompt_tokens || 0,
          tokens_respuesta: completion.usage?.completion_tokens || 0,
          temperatura: temperature,
          tiempo_busqueda_ms: timings.search_ms,
          tiempo_llm_ms: timings.llm_ms,
          tiempo_total_ms: timings.total_ms
        }
      };
    } catch (error) {
      console.error('❌ Error en pipeline RAG:', error);
      
      return {
        success: false,
        error: error.message,
        pregunta,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  buildPrompt(pregunta, contexto, contextoAdicional) {
    let prompt = `Basándote ÚNICAMENTE en el siguiente contexto, responde la pregunta del usuario.

CONTEXTO:
${contexto}
`;

    if (contextoAdicional) {
      prompt += `\nCONTEXTO ADICIONAL DEL USUARIO:
${contextoAdicional}
`;
    }

    prompt += `\nPREGUNTA:
${pregunta}

INSTRUCCIONES:
- Responde de manera clara y precisa
- Usa SOLO información del contexto proporcionado
- Si el contexto no contiene información suficiente, indícalo claramente
- Cita los documentos relevantes cuando sea apropiado (ej: "Según el Documento 1...")
- Mantén un tono profesional y educativo
- Si la pregunta requiere contexto adicional que no está disponible, menciona qué información adicional sería útil

RESPUESTA:`;

    return prompt;
  }

  getSystemPrompt() {
    return `Eres un asistente médico especializado en farmacología y procedimientos médicos.

Tu función es responder preguntas basándote EXCLUSIVAMENTE en el contexto proporcionado. 

Características de tus respuestas:
- Precisas y basadas en evidencia
- Estructuradas y fáciles de entender
- Incluyen referencias a los documentos fuente
- Indican claramente si la información es insuficiente
- No inventes información que no esté en el contexto
- Usa lenguaje profesional pero accesible

Si no tienes información suficiente en el contexto para responder completamente, indícalo claramente y sugiere qué información adicional sería necesaria.`;
  }

  async conversationalRAG(mensajes, options = {}) {
    // Pipeline RAG conversacional que mantiene historial
    // Útil para seguir preguntas relacionadas
    
    const ultimoMensaje = mensajes[mensajes.length - 1];
    
    if (ultimoMensaje.role !== 'user') {
      throw new Error('El último mensaje debe ser del usuario');
    }

    // Construir contexto de conversación previa
    const historialContexto = mensajes
      .slice(0, -1)
      .map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
      .join('\n');

    // Realizar búsqueda RAG con contexto conversacional
    return await this.query(ultimoMensaje.content, {
      ...options,
      contextoAdicional: `Conversación previa:\n${historialContexto}`
    });
  }

  async batchQuery(preguntas, options = {}) {
    // Procesar múltiples preguntas en batch
    const resultados = [];

    for (const pregunta of preguntas) {
      const resultado = await this.query(pregunta, options);
      resultados.push(resultado);
    }

    return {
      resultados,
      total: preguntas.length,
      exitosos: resultados.filter(r => r.success).length,
      fallidos: resultados.filter(r => !r.success).length
    };
  }
}

module.exports = new RAGService();