const { connectDB } = require('../src/config/db');
const Document = require('../src/models/Document');
const Embedding = require('../src/models/Embedding');
const embeddingService = require('../src/services/embeddingService');

const SAMPLE_DOCUMENTS = [
  {
    title: 'Ibuprofeno: Uso y Precauciones',
    content: 'El ibuprofeno es un antiinflamatorio no esteroideo (AINE) utilizado para aliviar el dolor, reducir la inflamación y bajar la fiebre. Se usa comúnmente para tratar dolores de cabeza, dolor dental, cólicos menstruales, dolores musculares y artritis. La dosis usual para adultos es de 200-400mg cada 4-6 horas, sin exceder 1200mg diarios sin supervisión médica. Efectos secundarios comunes incluyen malestar estomacal, náuseas y acidez. Precauciones: No debe tomarse con el estómago vacío. Puede aumentar el riesgo de sangrado gastrointestinal, especialmente en personas mayores o con antecedentes de úlceras. No debe combinarse con aspirina u otros AINEs. Contraindicado en personas con insuficiencia renal grave, insuficiencia cardíaca severa o alergia a AINEs.',
    language: 'es',
    ingest_ts: new Date('2024-01-15'),
    tags: ['antiinflamatorio', 'analgésico', 'AINE', 'dolor'],
    metadata: {
      autor: 'Dr. García Martínez',
      fuente: 'Manual de Farmacología Clínica',
      version: '2024.1'
    }
  },
  {
    title: 'Paracetamol: Analgésico y Antipirético',
    content: 'El paracetamol (acetaminofén) es un analgésico y antipirético ampliamente utilizado para tratar dolor leve a moderado y reducir la fiebre. A diferencia de los AINEs, no tiene propiedades antiinflamatorias significativas. Es considerado seguro y efectivo cuando se usa correctamente. Dosis: Adultos 500-1000mg cada 4-6 horas, máximo 4000mg/día. Niños: según peso 10-15mg/kg cada 4-6 horas.',
    language: 'es',
    ingest_ts: new Date('2024-02-10'),
    tags: ['analgésico', 'antipirético', 'dolor', 'fiebre'],
    metadata: {
      autor: 'Dra. López Sánchez',
      fuente: 'Guía de Medicamentos Esenciales',
      version: '2024.1'
    }
  },
  {
    title: 'Amoxicilina: Antibiótico de amplio espectro',
    content: 'La amoxicilina es un antibiótico de amplio espectro del grupo de las penicilinas. Se utiliza para tratar infecciones bacterianas como faringitis, otitis, sinusitis, bronquitis, neumonía, infecciones urinarias y de la piel. Dosis típica: 250-500mg cada 8h o 500-875mg cada 12h. Completar todo el curso del antibiótico.',
    language: 'es',
    ingest_ts: new Date('2024-01-20'),
    tags: ['antibiótico', 'penicilina', 'infección', 'bacteria'],
    metadata: {
      autor: 'Dr. Rodríguez Pérez',
      fuente: 'Protocolos de Antimicrobianos',
      version: '2024.1'
    }
  },
  {
    title: 'Hipertensión: Medicamentos Antihipertensivos',
    content: 'Medicamentos incluyen inhibidores de la ECA, bloqueadores de receptores de angiotensina II, diuréticos tiazídicos, bloqueadores de canales de calcio y betabloqueadores. Cada clase tiene sus indicaciones y efectos secundarios. Monitoreo de presión arterial y combinación de fármacos según necesidad.',
    language: 'es',
    ingest_ts: new Date('2024-03-05'),
    tags: ['hipertensión', 'presión arterial', 'cardiovascular', 'tratamiento'],
    metadata: {
      autor: 'Dra. Fernández Castro',
      fuente: 'Guías Clínicas de Cardiología',
      version: '2024.1'
    }
  },
  {
    title: 'Diabetes Tipo 2: Metformina',
    content: 'La metformina es el medicamento de primera línea para diabetes tipo 2. Reduce la producción de glucosa hepática, mejora la sensibilidad a la insulina y disminuye la absorción intestinal. Dosis: iniciar con 500mg 1-2 veces al día, aumentando gradualmente a 1000-2000mg/día. Monitoreo de función renal y vitamina B12 recomendado.',
    language: 'es',
    ingest_ts: new Date('2024-02-20'),
    tags: ['diabetes', 'metformina', 'glucosa', 'endocrinología'],
    metadata: {
      autor: 'Dr. Martínez Gómez',
      fuente: 'Protocolos de Endocrinología',
      version: '2024.1'
    }
  },
  {
    title: 'Ansiolíticos: Benzodiacepinas',
    content: 'Las benzodiacepinas se usan para tratar ansiedad, insomnio y convulsiones. Incluyen alprazolam, lorazepam, diazepam y clonazepam. Potencian GABA, produciendo efectos sedantes y ansiolíticos. Riesgo de dependencia, abstenerse abruptamente tras uso prolongado. Contraindicadas con alcohol y depresores del SNC.',
    language: 'es',
    ingest_ts: new Date('2024-03-15'),
    tags: ['ansiolítico', 'benzodiacepinas', 'ansiedad', 'psiquiatría'],
    metadata: {
      autor: 'Dra. Ruiz Moreno',
      fuente: 'Manual de Psicofarmacología',
      version: '2024.1'
    }
  },
  {
    title: 'Anticoagulantes: Warfarina y NOACs',
    content: 'Previenen la formación de coágulos. Warfarina requiere monitoreo de INR. Nuevos anticoagulantes orales (NOACs) como dabigatrán, rivaroxabán, apixabán, edoxabán no requieren monitoreo frecuente. Riesgo principal: hemorragia. Precauciones con procedimientos invasivos.',
    language: 'es',
    ingest_ts: new Date('2024-02-28'),
    tags: ['anticoagulante', 'warfarina', 'coágulo', 'hematología'],
    metadata: {
      autor: 'Dr. Torres Jiménez',
      fuente: 'Protocolos de Hematología',
      version: '2024.1'
    }
  },
  {
    title: 'Estatinas: Control del Colesterol',
    content: 'Las estatinas reducen colesterol LDL y previenen enfermedades cardiovasculares. Incluyen atorvastatina, simvastatina, rosuvastatina y pravastatina. Dosis según objetivo terapéutico, generalmente por la noche. Monitoreo de perfil lipídico y enzimas hepáticas recomendado.',
    language: 'es',
    ingest_ts: new Date('2024-03-10'),
    tags: ['estatina', 'colesterol', 'cardiovascular', 'prevención'],
    metadata: {
      autor: 'Dra. Navarro Silva',
      fuente: 'Guías de Lípidos',
      version: '2024.1'
    }
  }
];

async function ingestDocuments() {
  try {
    console.log('📥 Iniciando ingesta de documentos...\n');
    await connectDB();
    await embeddingService.initialize();

    let ingested = 0;
    let failed = 0;

    for (const docData of SAMPLE_DOCUMENTS) {
      try {
        const document = await Document.create(docData);
        console.log(`📝 Documento creado: "${docData.title}" ID: ${document._id}`);

        const textToEmbed = `${docData.title}. ${docData.content}`;
        const { embedding, tiempo_ms } = await embeddingService.generateTextEmbedding(textToEmbed);

        await Embedding.create({
          tipo: 'text',
          embedding,
          referenceId: document._id,
          referenceCollection: 'documents',
          modelo: 'all-MiniLM-L6-v2'
        });

        console.log(`   🧮 Embedding generado (${embedding.length} dims) en ${tiempo_ms}ms`);
        ingested++;
      } catch (error) {
        console.error(`❌ Error procesando "${docData.title}":`, error.message);
        failed++;
      }
    }

    console.log(`\n📊 Documentos ingeridos: ${ingested}, fallidos: ${failed}`);
  } catch (error) {
    console.error('❌ Error general en ingesta de documentos:', error);
  } finally {
    process.exit(0);
  }
}

ingestDocuments();
