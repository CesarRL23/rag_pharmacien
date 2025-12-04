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
  },  
  {
  title: "Vitaminas Hidrosolubles: Funciones y Ejemplos",
  content: "Las vitaminas hidrosolubles incluyen la vitamina C y las del complejo B. Se disuelven en agua y no se almacenan en grandes cantidades en el organismo, por lo que requieren ingesta regular. Participan en metabolismo energético, síntesis de neurotransmisores y fortalecimiento del sistema inmune.",
  language: "es",
  ingest_ts: new Date("2024-03-02"),
  tags: ["vitaminas", "nutrición", "salud"],
  metadata: {
    autor: "Dra. Rivas Ospina",
    fuente: "Manual de Bioquímica Clínica",
    version: "2024.2"
  }
},
{
  title: "Efectos del Sedentarismo en la Salud Cardiovascular",
  content: "El sedentarismo se asocia con mayor riesgo de hipertensión, obesidad, diabetes y enfermedades coronarias. La OMS recomienda al menos 150 minutos de actividad física moderada semanal. Incluso caminatas diarias cortas pueden mejorar la capacidad cardiorrespiratoria.",
  language: "es",
  ingest_ts: new Date("2024-03-10"),
  tags: ["salud", "cardiovascular", "sedentarismo"],
  metadata: {
    autor: "Dr. Hernán López",
    fuente: "Guía de Actividad Física OMS",
    version: "2023.1"
  }
},
{
  title: "Inteligencia Artificial y Diagnóstico Clínico",
  content: "La inteligencia artificial se utiliza para analizar imágenes médicas, predecir enfermedades y optimizar tratamientos. Modelos como las redes neuronales convolucionales permiten detectar tumores, fracturas y anomalías con alta precisión.",
  language: "es",
  ingest_ts: new Date("2024-01-18"),
  tags: ["inteligencia artificial", "diagnóstico", "tecnología"],
  metadata: {
    autor: "Ing. Mariana Duarte",
    fuente: "Revista Digital Health",
    version: "2024.1"
  }
},
{
  title: "Historia del Microscopio Moderno",
  content: "El microscopio evolucionó desde lentes rudimentarias en el siglo XVI hasta equipos electrónicos capaces de visualizar átomos. Su desarrollo permitió avances cruciales en microbiología, histología y genética.",
  language: "es",
  ingest_ts: new Date("2024-02-11"),
  tags: ["historia", "ciencia", "microscopio"],
  metadata: {
    autor: "Prof. Elena Castaño",
    fuente: "Enciclopedia de Ciencias Naturales",
    version: "2022.4"
  }
},
{
  title: "Qué es el Metabolismo Basal",
  content: "El metabolismo basal representa la energía mínima necesaria para mantener funciones vitales como circulación, respiración y actividad celular en reposo. Varía según edad, masa muscular y genética.",
  language: "es",
  ingest_ts: new Date("2024-02-20"),
  tags: ["metabolismo", "energía", "fisiología"],
  metadata: {
    autor: "Dra. Silvia Mendoza",
    fuente: "Fisiología Humana Contemporánea",
    version: "2023.2"
  }
},
{
  title: "Antibióticos Macrólidos: Usos y Precauciones",
  content: "Los macrólidos como azitromicina y claritromicina se emplean contra infecciones respiratorias y de tejidos blandos. Pueden causar alteraciones gastrointestinales y deben evitarse en combinación con ciertos medicamentos cardiovasculares.",
  language: "es",
  ingest_ts: new Date("2024-03-01"),
  tags: ["antibióticos", "medicina", "infecciones"],
  metadata: {
    autor: "Dr. Luis Montoya",
    fuente: "Guía de Antimicrobianos",
    version: "2024.1"
  }
},
{
  title: "Beneficios del Sueño Profundo",
  content: "El sueño profundo favorece la consolidación de memoria, reparación muscular y regulación hormonal. Dormir menos de 6 horas regularmente incrementa el riesgo de enfermedades metabólicas y trastornos del estado de ánimo.",
  language: "es",
  ingest_ts: new Date("2024-01-22"),
  tags: ["sueño", "neurociencia", "salud"],
  metadata: {
    autor: "Dra. Karla Peña",
    fuente: "Instituto del Sueño",
    version: "2023.3"
  }
},
{
  title: "Sistemas de Energía Solar Residencial",
  content: "Los paneles solares fotovoltaicos transforman luz en electricidad. Su eficiencia depende de la radiación disponible, la orientación y el tipo de célula. Los hogares pueden reducir hasta 70% el consumo eléctrico convencional.",
  language: "es",
  ingest_ts: new Date("2024-02-15"),
  tags: ["energía", "solar", "tecnología"],
  metadata: {
    autor: "Ing. Raúl Martínez",
    fuente: "Manual de Energías Renovables",
    version: "2023.1"
  }
},
{
  title: "Psicología del Estrés Crónico",
  content: "El estrés sostenido activa el eje hipotálamo-hipófisis-adrenal liberando cortisol. A largo plazo puede generar ansiedad, problemas inmunológicos, hipertensión y dificultades cognitivas.",
  language: "es",
  ingest_ts: new Date("2024-03-08"),
  tags: ["psicología", "estrés", "salud mental"],
  metadata: {
    autor: "Psic. Laura Ramírez",
    fuente: "Fundamentos de Psicobiología",
    version: "2024.1"
  }
},
{
  title: "Fotosíntesis: Proceso Fundamental",
  content: "Las plantas convierten dióxido de carbono y agua en glucosa y oxígeno mediante energía solar. Ocurre en los cloroplastos y es esencial para la vida terrestre.",
  language: "es",
  ingest_ts: new Date("2024-01-27"),
  tags: ["biología", "fotosíntesis", "ciencia"],
  metadata: {
    autor: "Dr. Miguel Contreras",
    fuente: "Biología General",
    version: "2022.3"
  }
},
{
  title: "Radioterapia en Tratamientos Oncológicos",
  content: "La radioterapia utiliza radiación ionizante para destruir células cancerígenas. Los avances en radioterapia guiada por imágenes permiten mayor precisión y reducción de daños en tejidos sanos.",
  language: "es",
  ingest_ts: new Date("2024-02-09"),
  tags: ["oncología", "radioterapia", "cáncer"],
  metadata: {
    autor: "Dra. Camila Barrera",
    fuente: "Manual de Oncología Clínica",
    version: "2024.1"
  }
},
{
  title: "El Papel del Higado en la Detoxificación",
  content: "El hígado metaboliza fármacos, hormonas y toxinas. Sus enzimas del citocromo P450 transforman compuestos liposolubles en sustancias eliminables por orina o bilis.",
  language: "es",
  ingest_ts: new Date("2024-03-12"),
  tags: ["hígado", "fisiología", "metabolismo"],
  metadata: {
    autor: "Dra. Luisa Parra",
    fuente: "Bioquímica Médica",
    version: "2023.2"
  }
},
{
  title: "Impacto del Cambio Climático en la Salud",
  content: "El aumento de temperaturas incrementa enfermedades transmitidas por mosquitos, golpes de calor y problemas respiratorios. También afecta la disponibilidad de agua y alimentos.",
  language: "es",
  ingest_ts: new Date("2024-02-05"),
  tags: ["cambio climático", "salud pública", "ambiente"],
  metadata: {
    autor: "Dr. Esteban Ríos",
    fuente: "Reporte Mundial de Salud Ambiental",
    version: "2023.1"
  }
},
{
  title: "Nanotecnología en Medicina Moderna",
  content: "Las nanopartículas permiten dirigir fármacos con precisión, mejorar diagnósticos y crear biomateriales avanzados. Su uso requiere estrictos controles toxicológicos.",
  language: "es",
  ingest_ts: new Date("2024-01-30"),
  tags: ["nanotecnología", "medicina", "innovación"],
  metadata: {
    autor: "Ing. Paola Sánchez",
    fuente: "Nanomedicine Journal",
    version: "2024.2"
  }
},
{
  title: "Bases del Sistema Inmunológico",
  content: "El sistema inmune se divide en inmunidad innata y adaptativa. Las células T y B reconocen antígenos y generan memoria inmunológica. La barrera cutánea es la primera línea de defensa.",
  language: "es",
  ingest_ts: new Date("2024-03-14"),
  tags: ["inmunología", "biología", "salud"],
  metadata: {
    autor: "Dr. Ricardo Sandoval",
    fuente: "Inmunología Médica",
    version: "2023.1"
  }
},
{
  title: "Historia del ADN y Descubrimiento de la Doble Hélice",
  content: "En 1953 Watson y Crick propusieron la estructura de doble hélice del ADN basándose en datos de difracción de rayos X obtenidos por Rosalind Franklin. Este hallazgo revolucionó la genética.",
  language: "es",
  ingest_ts: new Date("2024-01-10"),
  tags: ["ADN", "genética", "ciencia"],
  metadata: {
    autor: "Prof. Daniela Gómez",
    fuente: "Historia de la Genética Moderna",
    version: "2023.1"
  }
},
{
  title: "Robótica en Cirugías de Alta Precisión",
  content: "Los robots quirúrgicos permiten movimientos más precisos, visión ampliada y menor tiempo de recuperación. Se usan en urología, ginecología y cirugía cardiotorácica.",
  language: "es",
  ingest_ts: new Date("2024-03-07"),
  tags: ["robótica", "cirugía", "tecnología"],
  metadata: {
    autor: "Dr. Julián Herrera",
    fuente: "Revista de Cirugía Robótica",
    version: "2024.2"
  }
},
{
  title: "La Importancia de la Higiene Bucal",
  content: "Cepillarse tres veces al día, usar hilo dental y realizar limpiezas profesionales reduce riesgo de caries, gingivitis y periodontitis. La salud oral está vinculada a enfermedades cardiovasculares y diabetes.",
  language: "es",
  ingest_ts: new Date("2024-02-18"),
  tags: ["salud oral", "higiene", "odontología"],
  metadata: {
    autor: "Dr. Pablo Téllez",
    fuente: "Guía de Odontología Preventiva",
    version: "2023.2"
  }
},
{
  title: "Efectos de la Deshidratación en el Rendimiento",
  content: "Perder más del 2% del peso corporal por falta de líquidos afecta la concentración, fuerza muscular y termorregulación. La hidratación adecuada es esencial en climas cálidos o actividad física intensa.",
  language: "es",
  ingest_ts: new Date("2024-03-03"),
  tags: ["hidratación", "rendimiento", "salud"],
  metadata: {
    autor: "Dra. Sofía Morales",
    fuente: "Fisiología del Ejercicio",
    version: "2024.1"
  }
},
{
  title: "Introducción a los Circuitos Eléctricos",
  content: "Los circuitos eléctricos permiten el flujo controlado de corriente a través de componentes como resistencias, condensadores y transistores. Son la base de toda la electrónica moderna.",
  language: "es",
  ingest_ts: new Date("2024-02-08"),
  tags: ["electrónica", "circuitos", "tecnología"],
  metadata: {
    autor: "Ing. Jorge Salcedo",
    fuente: "Electrónica Básica 1",
    version: "2022.5"
  }
},
{
  title: "Fisiología del Sistema Respiratorio",
  content: "Los pulmones permiten el intercambio de gases: oxígeno entra a la sangre y dióxido de carbono se elimina. La ventilación depende de la presión intrapulmonar y la acción del diafragma.",
  language: "es",
  ingest_ts: new Date("2024-03-11"),
  tags: ["respiratorio", "fisiología", "salud"],
  metadata: {
    autor: "Dr. Ignacio Torres",
    fuente: "Fisiología Respiratoria Moderna",
    version: "2023.1"
  }
},
{
  title: "Qué es el Índice de Masa Corporal (IMC)",
  content: "El IMC se calcula dividiendo el peso entre la altura al cuadrado. Valores entre 18.5 y 24.9 se consideran normales. No mide composición corporal, por lo que puede ser engañoso en atletas.",
  language: "es",
  ingest_ts: new Date("2024-01-29"),
  tags: ["IMC", "salud", "nutrición"],
  metadata: {
    autor: "Dra. Ángela Bermúdez",
    fuente: "Nutrición y Salud Pública",
    version: "2024.2"
  }
},
{
  title: "Deforestación y Pérdida de Biodiversidad",
  content: "La deforestación reduce hábitats naturales, aumentando la vulnerabilidad de especies. Contribuye al calentamiento global y alteraciones en el ciclo del agua.",
  language: "es",
  ingest_ts: new Date("2024-02-25"),
  tags: ["ambiente", "deforestación", "biodiversidad"],
  metadata: {
    autor: "Ec. Alejandro Ríos",
    fuente: "Informe Ambiental Global",
    version: "2023.3"
  }
},
{
  title: "La Evolución del Smartphone",
  content: "Desde los primeros dispositivos con pantallas monocromáticas hasta los modelos actuales con inteligencia artificial, el smartphone ha transformado la comunicación, fotografía y entretenimiento.",
  language: "es",
  ingest_ts: new Date("2024-01-15"),
  tags: ["tecnología", "smartphones", "historia"],
  metadata: {
    autor: "Ing. Carla Suárez",
    fuente: "Historia de la Computación Móvil",
    version: "2023.1"
  }
},
{
  title: "Introducción a la Geotermia",
  content: "La energía geotérmica proviene del calor interno de la Tierra. Se utiliza para calefacción, generación eléctrica y procesos industriales. Es renovable y de baja emisión.",
  language: "es",
  ingest_ts: new Date("2024-02-16"),
  tags: ["energía", "geotermia", "renovables"],
  metadata: {
    autor: "Ing. Mateo Castaño",
    fuente: "Energías Renovables Hoy",
    version: "2023.2"
  }
},
{
  title: "Cómo Funciona la Memoria Humana",
  content: "La memoria se divide en sensorial, a corto plazo y a largo plazo. Depende de conexiones neuronales reforzadas por repetición y emoción. El hipocampo es clave en la consolidación.",
  language: "es",
  ingest_ts: new Date("2024-03-04"),
  tags: ["memoria", "neurociencia", "cognición"],
  metadata: {
    autor: "Dra. Natalia Herrera",
    fuente: "Neurociencia Cognitiva",
    version: "2024.2"
  }
},
{
  title: "Impacto del Ruido en la Audición",
  content: "La exposición prolongada a sonidos superiores a 85 dB puede causar daño irreversible en células ciliadas del oído interno. El uso de protección auditiva es indispensable en entornos industriales.",
  language: "es",
  ingest_ts: new Date("2024-02-19"),
  tags: ["audición", "ruido", "salud ocupacional"],
  metadata: {
    autor: "Dr. Lucas Medina",
    fuente: "Otorrinolaringología Clínica",
    version: "2023.1"
  }
},
{
  title: "Causas del Calentamiento Global",
  content: "El aumento de gases de efecto invernadero debido a la actividad humana atrapa calor en la atmósfera. El CO2 y el metano son los principales responsables. Los océanos absorben gran parte del exceso térmico.",
  language: "es",
  ingest_ts: new Date("2024-01-21"),
  tags: ["clima", "calentamiento global", "ambiente"],
  metadata: {
    autor: "Clim. Verónica Silva",
    fuente: "Reporte IPCC",
    version: "2023.4"
  }
},
{
  title: "Introducción a la Programación Orientada a Objetos",
  content: "La POO organiza el código en clases y objetos que modelan entidades reales. Sus pilares son encapsulamiento, herencia, polimorfismo y abstracción.",
  language: "es",
  ingest_ts: new Date("2024-03-06"),
  tags: ["programación", "POO", "software"],
  metadata: {
    autor: "Ing. Felipe Duarte",
    fuente: "Fundamentos de Programación",
    version: "2024.1"
  }
},
{
  title: "Electricidad Estática: Conceptos Básicos",
  content: "La electricidad estática surge del desequilibrio de cargas eléctricas. Se manifiesta como chispas, adhesión de objetos o pequeñas descargas que sentimos al tocar superficies metálicas.",
  language: "es",
  ingest_ts: new Date("2024-01-31"),
  tags: ["electricidad", "física", "ciencia"],
  metadata: {
    autor: "Prof. Raúl Ceballos",
    fuente: "Física General 1",
    version: "2023.2"
  }
},
{
  title: "Cómo Afecta la Altitud a la Respiración",
  content: "A mayor altitud disminuye la presión parcial de oxígeno, causando hipoxia. El cuerpo compensa aumentando la ventilación y la producción de glóbulos rojos.",
  language: "es",
  ingest_ts: new Date("2024-02-13"),
  tags: ["altitud", "respiración", "fisiología"],
  metadata: {
    autor: "Dr. Alberto Rincón",
    fuente: "Medicina del Deporte en Altura",
    version: "2023.1"
  }
},
{
  title: "Proceso de Digestión Humana",
  content: "La digestión comienza en la boca con la acción de la amilasa salival. El estómago realiza la digestión química mediante ácido clorhídrico y pepsina. En el intestino delgado se absorben nutrientes esenciales mediante vellosidades intestinales.",
  language: "es",
  ingest_ts: new Date("2024-03-09"),
  tags: ["digestión", "fisiología", "nutrición"],
  metadata: {
    autor: "Dra. Marcela Fernández",
    fuente: "Fisiología Digestiva",
    version: "2023.2"
  }
},
{
  title: "Redes Neuronales Artificiales: Introducción",
  content: "Las redes neuronales artificiales están inspiradas en el cerebro humano. Utilizan capas de neuronas interconectadas para aprender patrones y realizar predicciones en tareas como clasificación y regresión.",
  language: "es",
  ingest_ts: new Date("2024-03-02"),
  tags: ["inteligencia artificial", "machine learning", "redes neuronales"],
  metadata: {
    autor: "Ing. Andrés Pardo",
    fuente: "Deep Learning Fundamentals",
    version: "2024.1"
  }
},
{
  title: "Fisiología del Músculo Esquelético",
  content: "El músculo esquelético está formado por fibras contráctiles que responden a impulsos nerviosos. La contracción depende del deslizamiento de actina y miosina regulado por calcio intracelular.",
  language: "es",
  ingest_ts: new Date("2024-02-22"),
  tags: ["músculo", "fisiología", "biología"],
  metadata: {
    autor: "Dr. Sebastián Urrego",
    fuente: "Fisiología del Movimiento",
    version: "2023.3"
  }
},
{
  title: "El Sistema Solar: Estructura General",
  content: "Nuestro sistema solar incluye ocho planetas, cinturones de asteroides, cometas y la estrella central: el Sol. Se formó hace aproximadamente 4.6 mil millones de años a partir de una nube molecular.",
  language: "es",
  ingest_ts: new Date("2024-01-26"),
  tags: ["astronomía", "espacio", "ciencia"],
  metadata: {
    autor: "Dr. Esteban Cardona",
    fuente: "Enciclopedia Astronómica",
    version: "2022.8"
  }
},
{
  title: "Mecanismos de Acción de los Antivirales",
  content: "Los antivirales interfieren con la replicación viral inhibiendo enzimas como la polimerasa o impidiendo la entrada del virus a la célula. Ejemplos: aciclovir, oseltamivir y remdesivir.",
  language: "es",
  ingest_ts: new Date("2024-03-14"),
  tags: ["antivirales", "medicina", "virología"],
  metadata: {
    autor: "Dra. Helena Giraldo",
    fuente: "Farmacología Antiviral",
    version: "2024.1"
  }
},
{
  title: "Diferencias entre ADN y ARN",
  content: "El ADN contiene la información genética y tiene doble cadena; el ARN es monocatenario y participa en síntesis de proteínas. El azúcar del ARN es ribosa y el del ADN desoxirribosa.",
  language: "es",
  ingest_ts: new Date("2024-01-19"),
  tags: ["ADN", "ARN", "genética"],
  metadata: {
    autor: "Prof. Camila Torres",
    fuente: "Genética para Principiantes",
    version: "2023.1"
  }
},
{
  title: "Importancia del Agua en la Salud",
  content: "El agua representa más del 60% del peso corporal y participa en regulación térmica, transporte de nutrientes y eliminación de toxinas. Beber insuficiente agua causa fatiga, dolor de cabeza y estreñimiento.",
  language: "es",
  ingest_ts: new Date("2024-02-02"),
  tags: ["agua", "salud", "nutrición"],
  metadata: {
    autor: "Dra. Sara Méndez",
    fuente: "Hidratación y Bienestar",
    version: "2024.2"
  }
},
{
  title: "Introducción a los Ecosistemas",
  content: "Los ecosistemas son comunidades de organismos que interactúan con el ambiente físico. Pueden ser acuáticos, terrestres o mixtos. La biodiversidad es clave para su estabilidad.",
  language: "es",
  ingest_ts: new Date("2024-03-05"),
  tags: ["ecosistemas", "ambiente", "biodiversidad"],
  metadata: {
    autor: "Ec. Andrés Peña",
    fuente: "Ecología Básica",
    version: "2023.4"
  }
},
{
  title: "La Ley de Ohm Explicada",
  content: "La Ley de Ohm establece que la corriente es igual al voltaje dividido entre la resistencia. Se expresa como I = V / R. Es fundamental en el diseño de circuitos eléctricos.",
  language: "es",
  ingest_ts: new Date("2024-02-28"),
  tags: ["física", "electricidad", "ley de ohm"],
  metadata: {
    autor: "Ing. Fabián Roldán",
    fuente: "Física Eléctrica 1",
    version: "2022.6"
  }
},
{
  title: "Sistema Endocrino: Glándulas y Hormonas",
  content: "El sistema endocrino regula procesos como metabolismo, crecimiento y reproducción. Las glándulas principales incluyen tiroides, hipófisis, suprarrenales y páncreas.",
  language: "es",
  ingest_ts: new Date("2024-03-01"),
  tags: ["endocrino", "hormonas", "fisiología"],
  metadata: {
    autor: "Dra. Bianca López",
    fuente: "Endocrinología Moderna",
    version: "2023.1"
  }
},
{
  title: "Biomecánica del Movimiento Humano",
  content: "La biomecánica estudia fuerzas internas y externas que afectan al cuerpo. Se usa en fisioterapia, medicina deportiva y diseño de prótesis.",
  language: "es",
  ingest_ts: new Date("2024-01-23"),
  tags: ["biomecánica", "movimiento", "salud"],
  metadata: {
    autor: "Dr. Mateo Orozco",
    fuente: "Biomecánica Aplicada",
    version: "2024.1"
  }
},
{
  title: "Qué es la Energía Eólica",
  content: "La energía eólica se obtiene mediante aerogeneradores que convierten la energía cinética del viento en electricidad. Es renovable y con baja huella de carbono.",
  language: "es",
  ingest_ts: new Date("2024-02-14"),
  tags: ["energía eólica", "renovables", "ingeniería"],
  metadata: {
    autor: "Ing. Tania Campo",
    fuente: "Energías Renovables Hoy",
    version: "2023.4"
  }
},
{
  title: "Estructura del Átomo",
  content: "El átomo está compuesto por protones, neutrones y electrones. El núcleo contiene protones y neutrones, mientras que los electrones orbitan a su alrededor en niveles energéticos.",
  language: "es",
  ingest_ts: new Date("2024-01-17"),
  tags: ["átomo", "química", "ciencia"],
  metadata: {
    autor: "Prof. Hernán Vera",
    fuente: "Química General 1",
    version: "2023.3"
  }
},
{
  title: "Cómo Funciona un Motor de Combustión",
  content: "Los motores de combustión interna convierten energía química del combustible en energía mecánica. Operan mediante ciclos de admisión, compresión, combustión y escape.",
  language: "es",
  ingest_ts: new Date("2024-02-21"),
  tags: ["motores", "ingeniería", "mecánica"],
  metadata: {
    autor: "Ing. César Andrade",
    fuente: "Motores de Combustión",
    version: "2022.7"
  }
},
{
  title: "Introducción al Cálculo Diferencial",
  content: "El cálculo diferencial estudia cómo cambian las funciones. La derivada representa la tasa de cambio instantánea y la pendiente de la recta tangente en un punto.",
  language: "es",
  ingest_ts: new Date("2024-01-25"),
  tags: ["cálculo", "matemáticas", "derivadas"],
  metadata: {
    autor: "Prof. Juliana Álvarez",
    fuente: "Cálculo 1",
    version: "2024.1"
  }
},
{
  title: "Importancia de los Probióticos",
  content: "Los probióticos son microorganismos que benefician la salud intestinal. Mejoran la digestión, fortalecen el sistema inmune y pueden prevenir diarrea asociada a antibióticos.",
  language: "es",
  ingest_ts: new Date("2024-02-27"),
  tags: ["probióticos", "intestino", "nutrición"],
  metadata: {
    autor: "Dra. Lina Acosta",
    fuente: "Guía de Microbiota",
    version: "2023.4"
  }
},
{
  title: "La Capa de Ozono y su Recuperación",
  content: "La capa de ozono protege de radiación UV. Tras la prohibición de CFCs mediante el Protocolo de Montreal, la capa muestra signos de recuperación aunque persisten riesgos.",
  language: "es",
  ingest_ts: new Date("2024-03-06"),
  tags: ["ozono", "medio ambiente", "atmósfera"],
  metadata: {
    autor: "Clim. Ricardo Molina",
    fuente: "Reporte Ambiental Global",
    version: "2024.1"
  }
},
{
  title: "Diferencia entre Masa y Peso",
  content: "La masa es la cantidad de materia de un objeto y se mide en kilogramos. El peso es la fuerza que ejerce la gravedad sobre esa masa. Depende de la aceleración gravitacional.",
  language: "es",
  ingest_ts: new Date("2024-01-30"),
  tags: ["física", "masa", "peso"],
  metadata: {
    autor: "Prof. Camilo Restrepo",
    fuente: "Física Mecánica 1",
    version: "2022.9"
  }
},
{
  title: "Cómo Funciona una Red Wi-Fi",
  content: "Una red Wi-Fi utiliza ondas de radio para transmitir datos. Los routers distribuyen señales a dispositivos cercanos mediante bandas de 2.4GHz y 5GHz.",
  language: "es",
  ingest_ts: new Date("2024-02-03"),
  tags: ["wifi", "redes", "comunicación"],
  metadata: {
    autor: "Ing. Valeria Suaza",
    fuente: "Redes Inalámbricas Básicas",
    version: "2024.1"
  }
},
{
  title: "Sistema Urinario: Funciones Principales",
  content: "El sistema urinario filtra desechos nitrogenados, regula el equilibrio hídrico y controla electrolitos. Los riñones son los órganos principales en este proceso.",
  language: "es",
  ingest_ts: new Date("2024-02-24"),
  tags: ["urinario", "riñones", "fisiología"],
  metadata: {
    autor: "Dra. Verónica Pardo",
    fuente: "Fisiología Renal Moderna",
    version: "2023.2"
  }
},
{
  title: "Qué es un Polinomio",
  content: "Un polinomio es una expresión algebraica formada por variables y coeficientes con operaciones de suma, resta y multiplicación. Su grado depende del exponente mayor.",
  language: "es",
  ingest_ts: new Date("2024-01-28"),
  tags: ["matemáticas", "polinomios", "algebra"],
  metadata: {
    autor: "Prof. Carlos Zambrano",
    fuente: "Álgebra Fundamental",
    version: "2022.3"
  }
},
{
  title: "Efectos de la Radiación UV",
  content: "La radiación ultravioleta puede causar daño en el ADN, envejecimiento prematuro y cáncer de piel. El uso de protector solar reduce significativamente estos riesgos.",
  language: "es",
  ingest_ts: new Date("2024-03-10"),
  tags: ["radiación", "UV", "salud"],
  metadata: {
    autor: "Dra. Karina Betancur",
    fuente: "Dermatología Preventiva",
    version: "2023.4"
  }
},
{
  title: "Cómo Funciona el Cerebelo",
  content: "El cerebelo coordina el movimiento voluntario, mantiene el equilibrio y ajusta la postura. Recibe información del oído interno, músculos y corteza cerebral.",
  language: "es",
  ingest_ts: new Date("2024-02-17"),
  tags: ["cerebelo", "neurociencia", "cerebro"],
  metadata: {
    autor: "Dr. Manuel Ibáñez",
    fuente: "Neuroanatomía Funcional",
    version: "2023.1"
  }
},
{
  title: "Energía Hidroeléctrica: Ventajas y Desventajas",
  content: "Las hidroeléctricas generan electricidad mediante el movimiento del agua. Son renovables, pero pueden afectar ecosistemas fluviales y desplazar comunidades.",
  language: "es",
  ingest_ts: new Date("2024-02-06"),
  tags: ["hidroeléctrica", "energía", "ingeniería"],
  metadata: {
    autor: "Ing. Sofía Lebrón",
    fuente: "Energía y Ambiente",
    version: "2023.2"
  }
},
{
  title: "Bases de la Genética Mendeliana",
  content: "Gregor Mendel estableció leyes sobre la herencia mediante cruces de plantas de guisantes. Sus leyes explican dominancia, recesividad y segregación independiente.",
  language: "es",
  ingest_ts: new Date("2024-02-11"),
  tags: ["genética", "mendel", "biología"],
  metadata: {
    autor: "Prof. Lucía Correa",
    fuente: "Genética Fundamental",
    version: "2024.1"
  }
},
{
  title: "Sistema Linfático: Función y Componentes",
  content: "El sistema linfático transporta linfa, elimina toxinas y participa en la respuesta inmunológica. Incluye ganglios linfáticos, bazo y vasos linfáticos.",
  language: "es",
  ingest_ts: new Date("2024-01-24"),
  tags: ["linfático", "inmunidad", "fisiología"],
  metadata: {
    autor: "Dr. Simón Arango",
    fuente: "Anatomía Clínica General",
    version: "2023.1"
  }
},
{
  title: "Introducción a los Algoritmos",
  content: "Un algoritmo es un conjunto de pasos lógicos que resuelven un problema. Se representan mediante pseudocódigo o diagramas de flujo.",
  language: "es",
  ingest_ts: new Date("2024-01-12"),
  tags: ["algoritmos", "programación", "software"],
  metadata: {
    autor: "Ing. Natalia Restrepo",
    fuente: "Fundamentos de Algoritmia",
    version: "2024.1"
  }
},
{
  title: "Efectos del Café en el Sistema Nervioso",
  content: "La cafeína actúa como estimulante bloqueando receptores de adenosina, lo que aumenta el estado de alerta. El consumo excesivo puede causar ansiedad y taquicardia.",
  language: "es",
  ingest_ts: new Date("2024-03-13"),
  tags: ["café", "cafeína", "neurociencia"],
  metadata: {
    autor: "Dra. Melisa Patiño",
    fuente: "Neurofarmacología Básica",
    version: "2023.2"
  }
  
},
{
  title: "Qué es la Inteligencia Emocional",
  content: "La inteligencia emocional consiste en reconocer, comprender y gestionar las emociones propias y ajenas. Es clave para el liderazgo, la resolución de conflictos y la estabilidad mental.",
  language: "es",
  ingest_ts: new Date("2024-02-18"),
  tags: ["psicología", "emociones", "inteligencia emocional"],
  metadata: {
    autor: "Psic. Diana Moreno",
    fuente: "Manual de Psicología Moderna",
    version: "2023.3"
  }
},
{
  title: "Bases del Aprendizaje Automático",
  content: "El aprendizaje automático permite a los sistemas mejorar su rendimiento mediante datos. Sus categorías principales son supervisado, no supervisado y por refuerzo.",
  language: "es",
  ingest_ts: new Date("2024-03-04"),
  tags: ["machine learning", "IA", "algoritmos"],
  metadata: {
    autor: "Ing. Samuel Herrera",
    fuente: "Machine Learning Fundamentals",
    version: "2024.1"
  }
},
{
  title: "Causas de la Fatiga Muscular",
  content: "La fatiga muscular ocurre cuando disminuye la capacidad del músculo para generar fuerza. Se relaciona con acumulación de ácido láctico, deshidratación y agotamiento energético.",
  language: "es",
  ingest_ts: new Date("2024-03-12"),
  tags: ["fatiga", "músculos", "fisiología"],
  metadata: {
    autor: "Dr. Sergio Luján",
    fuente: "Fisiología del Ejercicio",
    version: "2023.2"
  }
},
{
  title: "Fundamentos de la Termodinámica",
  content: "La termodinámica estudia la energía, el calor y el trabajo. Sus leyes explican cómo fluye la energía en sistemas naturales y tecnológicos.",
  language: "es",
  ingest_ts: new Date("2024-01-16"),
  tags: ["física", "termodinámica", "energía"],
  metadata: {
    autor: "Prof. Martín Ocampo",
    fuente: "Física Universitaria",
    version: "2023.1"
  }
},
{
  title: "Concepto de Fotosíntesis Química",
  content: "La fotosíntesis química implica la conversión de luz solar en energía química almacenada en enlaces moleculares. Es esencial para la vida en la Tierra.",
  language: "es",
  ingest_ts: new Date("2024-02-08"),
  tags: ["fotosíntesis", "biología", "bioquímica"],
  metadata: {
    autor: "Dr. Fabio Cárdenas",
    fuente: "Bioquímica Vegetal",
    version: "2024.1"
  }
},
{
  title: "Principios del Derecho Penal",
  content: "El derecho penal regula las conductas punibles y establece sanciones. Sus principios fundamentales son legalidad, culpabilidad, proporcionalidad y humanidad.",
  language: "es",
  ingest_ts: new Date("2024-03-10"),
  tags: ["derecho", "leyes", "penal"],
  metadata: {
    autor: "Abg. Natalia Arrieta",
    fuente: "Código Penal Comentado",
    version: "2023.4"
  }
},
{
  title: "Estrategias de Lectura Crítica",
  content: "La lectura crítica implica analizar el contenido, evaluar argumentos, identificar sesgos y comparar fuentes. Es clave para la investigación académica.",
  language: "es",
  ingest_ts: new Date("2024-02-15"),
  tags: ["lectura", "crítico", "educación"],
  metadata: {
    autor: "Prof. César Roldán",
    fuente: "Guía de Comprensión Lectora",
    version: "2023.2"
  }
},
{
  title: "Impacto del Alcohol en el Hígado",
  content: "El consumo excesivo de alcohol puede causar hígado graso, hepatitis alcohólica y cirrosis. El hígado metaboliza el etanol produciendo compuestos tóxicos.",
  language: "es",
  ingest_ts: new Date("2024-03-06"),
  tags: ["alcohol", "hígado", "salud"],
  metadata: {
    autor: "Dra. Helena Vargas",
    fuente: "Hepatología Clínica",
    version: "2024.1"
  }
},
{
  title: "Qué son los Polos Magnéticos",
  content: "Los polos norte y sur de un imán representan regiones donde la fuerza magnética es más intensa. Polos iguales se repelen y polos opuestos se atraen.",
  language: "es",
  ingest_ts: new Date("2024-01-14"),
  tags: ["magnetismo", "física", "ciencia"],
  metadata: {
    autor: "Prof. Miguel Castro",
    fuente: "Magnetismo Básico",
    version: "2023.1"
  }
},
{
  title: "Principios del Acondicionamiento Físico",
  content: "El acondicionamiento físico incluye resistencia, fuerza, flexibilidad y coordinación. Su práctica regular mejora la salud cardiovascular y metabólica.",
  language: "es",
  ingest_ts: new Date("2024-01-31"),
  tags: ["ejercicio", "salud", "fitness"],
  metadata: {
    autor: "Lic. Deporte Adrián Suárez",
    fuente: "Entrenamiento Deportivo",
    version: "2023.1"
  }
},
{
  title: "Definición de Demografía",
  content: "La demografía estudia poblaciones humanas: natalidad, mortalidad, migración y estructura por edades. Es fundamental para políticas públicas y planeación urbana.",
  language: "es",
  ingest_ts: new Date("2024-02-20"),
  tags: ["demografía", "población", "sociedad"],
  metadata: {
    autor: "Soc. Laura Hurtado",
    fuente: "Manual de Estudios Demográficos",
    version: "2022.4"
  }
},
{
  title: "Conceptos Básicos de Economía",
  content: "La economía analiza cómo se asignan recursos para producir bienes y servicios. Sus ramas principales son microeconomía y macroeconomía.",
  language: "es",
  ingest_ts: new Date("2024-02-11"),
  tags: ["economía", "mercados", "microeconomía"],
  metadata: {
    autor: "Eco. Julián Valdés",
    fuente: "Fundamentos de Economía 1",
    version: "2023.2"
  }
},
{
  title: "Qué es la Fotosíntesis Bacteriana",
  content: "Algunas bacterias realizan fotosíntesis anoxigénica sin producir oxígeno. Utilizan pigmentos especiales como bacterioclorofilas.",
  language: "es",
  ingest_ts: new Date("2024-03-09"),
  tags: ["bacterias", "fotosíntesis", "microbiología"],
  metadata: {
    autor: "Dr. Mateo Mora",
    fuente: "Microbiología Avanzada",
    version: "2024.1"
  }
},
{
  title: "La Importancia de la Lectura Temprana",
  content: "La exposición temprana a la lectura mejora el desarrollo cognitivo, el lenguaje y la capacidad de concentración en niños.",
  language: "es",
  ingest_ts: new Date("2024-02-09"),
  tags: ["lectura", "educación", "infancia"],
  metadata: {
    autor: "Prof. Marisol Echeverry",
    fuente: "Pedagogía Infantil",
    version: "2023.3"
  }
},
{
  title: "Sistema Reproductor Femenino: Bases",
  content: "Incluye ovarios, trompas de Falopio, útero y vagina. Regulado por hormonas como estrógeno y progesterona.",
  language: "es",
  ingest_ts: new Date("2024-01-29"),
  tags: ["reproductor", "mujer", "fisiología"],
  metadata: {
    autor: "Dra. Ana Torres",
    fuente: "Ginecología Básica",
    version: "2023.1"
  }
},
{
  title: "Ciberseguridad: Ataques Comunes",
  content: "Los ataques más frecuentes incluyen phishing, malware, ransomware y ataques de fuerza bruta. La educación digital es clave para prevenirlos.",
  language: "es",
  ingest_ts: new Date("2024-03-01"),
  tags: ["ciberseguridad", "malware", "informática"],
  metadata: {
    autor: "Ing. Alan Gómez",
    fuente: "Seguridad Informática Profesional",
    version: "2024.1"
  }
},
{
  title: "Qué es la Homeostasis",
  content: "La homeostasis mantiene condiciones internas estables como temperatura, pH y niveles de glucosa. Depende de mecanismos de retroalimentación.",
  language: "es",
  ingest_ts: new Date("2024-02-25"),
  tags: ["homeostasis", "fisiología", "biología"],
  metadata: {
    autor: "Dra. Lina Bonilla",
    fuente: "Fisiología Humana",
    version: "2022.5"
  }
},
{
  title: "Tipos de Energía Renovable",
  content: "Las energías renovables incluyen solar, eólica, hidroeléctrica, geotérmica y biomasa. Son sostenibles y reducen gases contaminantes.",
  language: "es",
  ingest_ts: new Date("2024-01-18"),
  tags: ["energía", "renovable", "sostenibilidad"],
  metadata: {
    autor: "Ing. Oscar Cárdenas",
    fuente: "Energías Limpias",
    version: "2023.4"
  }
},
{
  title: "Filosofía del Método Científico",
  content: "El método científico implica observación, hipótesis, experimentación y análisis. Su objetivo es obtener conocimiento verificable.",
  language: "es",
  ingest_ts: new Date("2024-03-05"),
  tags: ["ciencia", "método científico", "filosofía"],
  metadata: {
    autor: "Prof. Elena Barrios",
    fuente: "Epistemología Moderna",
    version: "2023.1"
  }
},
{
  title: "La Fotosíntesis y la Vida Marina",
  content: "El fitoplancton realiza fotosíntesis y produce gran parte del oxígeno del planeta. Es esencial para las cadenas tróficas marinas.",
  language: "es",
  ingest_ts: new Date("2024-02-06"),
  tags: ["mar", "fitoplancton", "fotosíntesis"],
  metadata: {
    autor: "Dr. Alex Rincón",
    fuente: "Biología Marina",
    version: "2024.1"
  }
},
{
  title: "Qué es el Big Data",
  content: "Big Data se refiere al manejo de grandes volúmenes de datos que requieren tecnologías especializadas para almacenamiento y análisis.",
  language: "es",
  ingest_ts: new Date("2024-03-13"),
  tags: ["big data", "informática", "tecnología"],
  metadata: {
    autor: "Ing. Paola Bermúdez",
    fuente: "Introducción al Big Data",
    version: "2023.4"
  }
},
{
  title: "Neuronas y Sinapsis",
  content: "Las neuronas se comunican mediante sinapsis que transmiten señales químicas o eléctricas. Son la base del sistema nervioso.",
  language: "es",
  ingest_ts: new Date("2024-01-20"),
  tags: ["neuronas", "sinapsis", "neurociencia"],
  metadata: {
    autor: "Dr. Esteban Velásquez",
    fuente: "Neurobiología Básica",
    version: "2023.2"
  }
},
{
  title: "Qué es una Variable Aleatoria",
  content: "Es una función que asigna un valor numérico a cada resultado de un experimento aleatorio. Pueden ser discretas o continuas.",
  language: "es",
  ingest_ts: new Date("2024-02-23"),
  tags: ["probabilidad", "estadística", "matemáticas"],
  metadata: {
    autor: "Prof. Mario Sánchez",
    fuente: "Estadística 1",
    version: "2023.4"
  }
},
{
  title: "Importancia del Control de Plagas",
  content: "El control de plagas evita daños a cultivos, alimentos y salud humana. Métodos incluyen control biológico, químico y mecánico.",
  language: "es",
  ingest_ts: new Date("2024-02-14"),
  tags: ["plagas", "agricultura", "ambiente"],
  metadata: {
    autor: "Agro. Daniela Montoya",
    fuente: "Guía Agronómica",
    version: "2024.1"
  }
},
{
  title: "Cómo Funciona el Sistema Muscular",
  content: "El sistema muscular permite movimiento, estabilidad y generación de calor. Está dividido en músculos esqueléticos, cardíacos y lisos.",
  language: "es",
  ingest_ts: new Date("2024-03-03"),
  tags: ["músculos", "fisiología", "cuerpo humano"],
  metadata: {
    autor: "Dr. Federico Zapata",
    fuente: "Anatomía y Fisiología Humana",
    version: "2023.1"
  }
},
{
  title: "Impacto de los Videojuegos en la Cognición",
  content: "Los videojuegos pueden mejorar atención, memoria de trabajo y coordinación. Sin embargo, el exceso puede afectar el sueño y las relaciones sociales.",
  language: "es",
  ingest_ts: new Date("2024-01-27"),
  tags: ["videojuegos", "cognición", "psicología"],
  metadata: {
    autor: "Psic. Andrés Molina",
    fuente: "Psicología Digital",
    version: "2023.2"
  }
},
{
  title: "Qué es el pH",
  content: "El pH mide la acidez o alcalinidad de una sustancia. Valores menores a 7 indican acidez, mayores a 7 alcalinidad.",
  language: "es",
  ingest_ts: new Date("2024-01-11"),
  tags: ["química", "ph", "ciencia"],
  metadata: {
    autor: "Prof. Luisa Zapata",
    fuente: "Química General",
    version: "2023.1"
  }
},
{
  title: "Definición de Fuerza en Física",
  content: "La fuerza es una interacción que modifica el estado de movimiento de un objeto. Se mide en newtons.",
  language: "es",
  ingest_ts: new Date("2024-02-04"),
  tags: ["fuerza", "física", "movimiento"],
  metadata: {
    autor: "Prof. Juan González",
    fuente: "Física Mecánica",
    version: "2023.1"
  }
},
{
  title: "Desarrollo del Lenguaje en la Infancia",
  content: "Los niños adquieren lenguaje mediante interacción social. El desarrollo incluye balbuceo, primeras palabras y frases complejas.",
  language: "es",
  ingest_ts: new Date("2024-03-08"),
  tags: ["lenguaje", "infancia", "desarrollo"],
  metadata: {
    autor: "Psic. Andrea Pineda",
    fuente: "Psicolingüística Infantil",
    version: "2024.1"
  }
},
{
  title: "Toxinas Alimentarias Comunes",
  content: "Las toxinas más frecuentes provienen de bacterias como Salmonella y E. coli. El manejo adecuado de alimentos previene intoxicaciones.",
  language: "es",
  ingest_ts: new Date("2024-02-07"),
  tags: ["alimentos", "toxinas", "salud pública"],
  metadata: {
    autor: "Nut. Carolina Cifuentes",
    fuente: "Higiene Alimentaria",
    version: "2023.4"
  }
},
{
  title: "Fundamentos de la Electricidad",
  content: "La electricidad es el movimiento de electrones a través de un conductor. Es fundamental para casi todas las tecnologías modernas.",
  language: "es",
  ingest_ts: new Date("2024-01-13"),
  tags: ["electricidad", "electrones", "física"],
  metadata: {
    autor: "Ing. Oscar López",
    fuente: "Electricidad Básica",
    version: "2022.8"
  }
},
{
  title: "Química del Agua",
  content: "El agua es un compuesto polar con capacidad para disolver muchas sustancias. Su estructura permite puentes de hidrógeno.",
  language: "es",
  ingest_ts: new Date("2024-02-01"),
  tags: ["agua", "química", "ciencia"],
  metadata: {
    autor: "Prof. Alejandra Ruiz",
    fuente: "Química Inorgánica",
    version: "2024.1"
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
