import { 
  ProcessItem, 
  QualityControl, 
  AcceptanceCriterion, 
  AutonomyLevelItem, 
  DocumentItem 
} from '../types';

export const PROCESSES: ProcessItem[] = [
  {
    id: 'proc-corte-perfileria',
    slug: 'corte-perfileria',
    code: 'INF-CYP-01',
    name: 'Perfilería y Corte',
    iconName: 'Scissors',
    department: 'Extrusión, Almacén de Perfiles y Tronzadoras',
    description: 'Recepción, inspección dimensional, rectitud de perfiles extruidos y dimensionado de alta precisión en tronzadoras de doble cabezal (45° y 90°).',
    activeVersion: 'v3.0',
    effectiveDate: '2026-02-15',
    owner: 'Ing. Carlos Mendoza & Ing. Mateo Gómez - Calidad Alco',
    approvedBy: 'Dirección de Operaciones Alco',
    status: 'vigente',
    infographicTitle: 'Infografía Estándar Corte y Perfilería de Aluminio',
    infographicSummary: 'Control de aleación AA6063-T5, rectitud (flecha máx 1mm/m), tolerancia longitudinal de corte (± 0.5 mm) e inclinación de inglete (± 0.2°).',
    keyAspects: [
      'Tolerancia dimensional de corte: ± 0.5 mm',
      'Ángulos e inclinación de inglete: 45.0° ± 0.2° y 90.0° ± 0.2°',
      'Espesor de pared según catálogo y rectitud (flecha máx 1.0 mm/m)',
      'Desbarbado de extremos y lubricación constante en corte'
    ]
  },
  {
    id: 'proc-pintura',
    slug: 'pintura',
    code: 'INF-PNT-04',
    name: 'Pintura',
    iconName: 'Palette',
    department: 'Pintura Electrostática en Polvo',
    description: 'Tratamiento de superficie, pretratamiento químico fosfatizado y recubrimiento termoendurecible.',
    activeVersion: 'v2.1',
    effectiveDate: '2026-02-01',
    owner: 'Ing. Sofia Restrepo - Laboratorio Pintura',
    approvedBy: 'Gerencia de Calidad Alco',
    status: 'vigente',
    infographicTitle: 'Infografía Estándar Pintura Electrostática',
    infographicSummary: 'Control de espesor (60 a 80 micras), prueba de adherencia trampa de cinta (ASTM D3359 5B), curado en horno a 200°C y brillo.',
    keyAspects: [
      'Espesor de película seca: 60 - 80 µm (Medidor electromagnético)',
      'Adherencia 100% (corte en cuadrícula ASTM D3359 sin desprendimiento)',
      'Polimerización completa en horno (180°C - 200°C durante 20 min)',
      'Ausencia de grumos, cáscara de naranja severa o puntos de aguja'
    ]
  },
  {
    id: 'proc-troquelado',
    slug: 'troquelado',
    code: 'INF-TRQ-02',
    name: 'Troquelados y Mecanizado',
    iconName: 'Grid',
    department: 'Troquelado y Punzonado',
    description: 'Ejecución de desahogos de agua, pestañas de enganche, orificios de fijación y calados estructurales.',
    activeVersion: 'v2.0',
    effectiveDate: '2025-09-20',
    owner: 'Téc. Roberto Silva - Calidad Mecanizado',
    approvedBy: 'Dirección Técnica Alco',
    status: 'vigente',
    infographicTitle: 'Infografía Estándar Troquelado y Desahogos',
    infographicSummary: 'Alineación de matrices, lubricación de punzón, evacuación de viruta y posición correcta de desagües de drenaje.',
    keyAspects: [
      'Desahogos de agua sin obstrucción de viruta (25x5 mm)',
      'Cero deformación en caras visibles del perfil',
      'Distancia de calados a extremos según plano',
      'Verificación de holguras punzón-matriz'
    ]
  },
  {
    id: 'proc-empaques-felpas',
    slug: 'empaques-felpas',
    code: 'INF-EMP-05',
    name: 'Felpa y Empaques',
    iconName: 'Maximize2',
    department: 'Inserción de Sellos y Hermeticidad',
    description: 'Instalación de felpas de polipropileno con aleta central y empaques de EPDM para sellado acústico y térmico.',
    activeVersion: 'v1.2',
    effectiveDate: '2025-10-05',
    owner: 'Téc. Fernando Ruiz - Ensamble y Sellos',
    approvedBy: 'Coordinación de Calidad Alco',
    status: 'vigente',
    infographicTitle: 'Infografía Inserción de Empaques EPDM y Felpas',
    infographicSummary: 'Continuidad del empaque en esquinas, estiramiento máximo del 2%, alineación de felpa con aleta hidrorepelente.',
    keyAspects: [
      'Empaque EPDM sin elongación excesiva (< 2%)',
      'Esquinas cortadas a 45° o continuas sin luz de separación',
      'Felpa con fin-seal (aleta plástica impenetrable al aire/agua)',
      'Fijación firme en canal sin salirse bajo tracción manual'
    ]
  },
  {
    id: 'proc-vidrio-crudo-templado',
    slug: 'vidrio-crudo-templado',
    code: 'INF-VDT-03',
    name: 'Vidrio Crudo y Templado',
    iconName: 'Flame',
    department: 'Mesa de Corte de Vidrio, Cantos y Horno de Templado',
    description: 'Sección donde se realiza el corte de vidrio crudo y, dependiendo de si se requiere templado o laminado, se envía a la línea de templado/mecanizado de bordes; en caso contrario, se patina hacia ensamble o despachos según corresponda.',
    activeVersion: 'v2.0',
    effectiveDate: '2026-02-20',
    owner: 'Ing. Diana Henao - Calidad Vidrio y Térmicos',
    approvedBy: 'Gerencia de Planta Alco',
    status: 'vigente',
    infographicTitle: 'Infografía Estándar Corte de Vidrio Crudo y Proceso de Templado',
    infographicSummary: 'Tolerancia de corte en vidrio crudo (± 1.0 mm), pulido/arrisado de cantos obligatorio antes de templado, prueba de fragmentación en templado y ruteo de pátina.',
    keyAspects: [
      'Tolerancia de corte en vidrio crudo: ± 1.0 mm y descuadre ≤ 1.5 mm',
      'Arrisado y pulido de cantos obligatorio antes del ingreso al horno de templado',
      'Prueba de fragmentación en vidrio templado (mín. 40 fragmentos en 50x50 mm)',
      'Pátina y enrutamiento directo a Ensamble o Despachos para vidrio crudo no procesado'
    ]
  },
  {
    id: 'proc-ensamble',
    slug: 'ensamble',
    code: 'INF-ENS-06',
    name: 'Ensamble',
    iconName: 'Box',
    department: 'Líneas de Armado de Ventanas y Fachadas',
    description: 'Unión de marquetaría mediante escuadras de torque, sellado estructural de silicona y montaje de rodamientos/accesorios.',
    activeVersion: 'v3.1',
    effectiveDate: '2026-03-01',
    owner: 'Ing. Alejandro Morales - Jefe Ensamble',
    approvedBy: 'Gerencia General Alco',
    status: 'vigente',
    infographicTitle: 'Infografía Control de Ensamble y Cierre',
    infographicSummary: 'Verificación de escuadreo en diagonales (diferencia max 1.5mm), ajuste de cierre cremona, torque de tornillería y cordón de silicona.',
    keyAspects: [
      'Diferencia máxima entre diagonales: ≤ 1.5 mm',
      'Encuentro de ingletes cerrado sin luz visible (> 0.2 mm es rechazo)',
      'Suavidad de rodamiento y alineación de pestillos de seguridad',
      'Cordón de silicona continuo y repasado con espátula'
    ]
  },
  {
    id: 'proc-alistamiento',
    slug: 'alistamiento',
    code: 'INF-ALS-07',
    name: 'Alistamiento',
    iconName: 'ClipboardCheck',
    department: 'Alistamiento, Empaque y Embalaje de Producto',
    description: 'Área encargada del empaque, protección, embalaje de producto terminado y gestión de material suelto (herrajes, tornillería, remates, accesorios) para asegurar la calidad integral y entregas a satisfacción al cliente final.',
    activeVersion: 'v2.0',
    effectiveDate: '2026-02-18',
    owner: 'Coord. Nelson Parra - Alistamiento y Logística',
    approvedBy: 'Dirección de Operaciones Alco',
    status: 'vigente',
    infographicTitle: 'Infografía Estándar de Alistamiento, Empaque y Material Suelto',
    infographicSummary: 'Verificación del 100% del kit de material suelto según lista de empaque, empaque vinipel en marcos armados con esquineros rígidos, bolsas de accesorios herméticas y rotulado QR de obra.',
    keyAspects: [
      'Verificación de kit completo de material suelto (herrajes, accesorios, tornillos)',
      'Protección de perfiles con película vinipel termoencogible (mínimo 3 vueltas)',
      'Esquineros de cartón o espuma prensada en los 4 vértices del producto',
      'Etiqueta QR legible con identificación de cliente, obra y cantidad de sueltos'
    ]
  },
  {
    id: 'proc-despachos',
    slug: 'despachos',
    code: 'INF-DSP-08',
    name: 'Despachos',
    iconName: 'PackageCheck',
    department: 'Almacén de Producto Terminado',
    description: 'Cargue, etiquetado QR por ítem/obra y verificación de lista de embarque de módulos listos.',
    activeVersion: 'v2.0',
    effectiveDate: '2025-12-10',
    owner: 'Coord. Nelson Parra - Logística y Despachos',
    approvedBy: 'Dirección Logística Alco',
    status: 'vigente',
    infographicTitle: 'Infografía Protección y Empaque para Despacho',
    infographicSummary: 'Capa protectora azul de baja adhesión en perfiles visibles, esquineros de cartón en marcos armados, etiqueta de obra legible.',
    keyAspects: [
      'Mínimo 3 vueltas de vinipel termoencogible en atados',
      'Esquineros de cartón prensado en las 4 esquinas de marcos armados',
      'Rótulo de despacho con código de orden, cliente, destino y peso',
      'Checklist de herrajes y accesorios empaquetados por separado'
    ]
  },
  {
    id: 'proc-transporte',
    slug: 'transporte',
    code: 'INF-TRN-09',
    name: 'Transporte',
    iconName: 'Truck',
    department: 'Flotas y Transporte Terrestre',
    description: 'Aparejamiento, amarre seguro con carracas de tela, separación de atados mediante tacos de madera y estibado para traslado.',
    activeVersion: 'v1.1',
    effectiveDate: '2025-08-14',
    owner: 'Ing. Claudia Vargas - Seguridad y Logística',
    approvedBy: 'Gerencia de Operaciones Alco',
    status: 'vigente',
    infographicTitle: 'Infografía Aseguramiento de Carga en Vehículo',
    infographicSummary: 'Cintas de amarre de 2" con protección para no deformar perfiles, tacos de separación de pino seco, inclinación segura de fachadas.',
    keyAspects: [
      'Prohibido el contacto directo de perfiles pintados con metales del camión',
      'Separadores de goma o madera entre atados cada 1.2 metros',
      'Tensión de trinquete/carraca controlada para evitar doblado de marcos',
      'Lona impermeabilizada completa para trayectos intermunicipales'
    ]
  }
];

export const QUALITY_CONTROLS: Record<string, QualityControl[]> = {
  'corte-perfileria': [
    {
      id: 'qc-cyp-01',
      processId: 'proc-corte-perfileria',
      code: 'CC-CYP-01',
      title: 'Tolerancia Longitudinal de Corte',
      description: 'Verificación de medida final del perfil cortado con flexómetro calibrado o medidor digital de tronzadora.',
      criticalLevel: 'crítico',
      inspectionFrequency: 'Primeras 2 piezas del lote y 1 de cada 10 piezas',
      standardValue: 'Medida según orden de producción',
      tolerance: '± 0.5 mm'
    },
    {
      id: 'qc-cyp-02',
      processId: 'proc-corte-perfileria',
      code: 'CC-CYP-02',
      title: 'Ángulo e Inclinación de Inglete',
      description: 'Medición del ángulo de corte a 45° o 90° con escuadra digital de precisión.',
      criticalLevel: 'crítico',
      inspectionFrequency: 'Cada cambio de referencia o reajuste de cabezal',
      standardValue: '45.0° / 90.0°',
      tolerance: '± 0.2°'
    },
    {
      id: 'qc-cyp-03',
      processId: 'proc-corte-perfileria',
      code: 'CC-CYP-03',
      title: 'Espesor de Pared y Rectitud (Flecha)',
      description: 'Verificación de espesores de pared según catálogo y flecha longitudinal sobre mesa de granito.',
      criticalLevel: 'alto',
      inspectionFrequency: '1 barra por paquete de materia prima',
      standardValue: 'Según catálogo / 0.0 mm flecha',
      tolerance: 'Espesor ±0.10 mm / Flecha máx 1.0 mm/m'
    }
  ],
  troquelado: [
    {
      id: 'qc-trq-01',
      processId: 'proc-troquelado',
      code: 'CC-TRQ-01',
      title: 'Ubicación y Limpieza de Desahogos de Agua',
      description: 'Inspección de las troqueladas de drenaje para evacuación de agua de lluvias.',
      criticalLevel: 'crítico',
      inspectionFrequency: '100% de los perfiles inferiores troquelados',
      standardValue: 'Perforación limpia de 25x5 mm según matriz',
      tolerance: 'Sin viruta adherida, rebaba < 0.1mm'
    }
  ],
  'vidrio-crudo-templado': [
    {
      id: 'qc-vdt-01',
      processId: 'proc-vidrio-crudo-templado',
      code: 'CC-VDT-01',
      title: 'Tolerancia Dimensional y Escuadreo de Vidrio Crudo',
      description: 'Medición de alto, ancho y diferencia entre diagonales en la mesa automatizada de corte de vidrio.',
      criticalLevel: 'crítico',
      inspectionFrequency: '1 de cada 5 piezas cortadas en mesa',
      standardValue: 'Medida nominal del plano de despiece',
      tolerance: 'Longitud ±1.0 mm / Diagonales ≤ 1.5 mm'
    },
    {
      id: 'qc-vdt-02',
      processId: 'proc-vidrio-crudo-templado',
      code: 'CC-VDT-02',
      title: 'Arrisado y Pulido de Cantos pre-Horno',
      description: 'Inspección del arrisado de cantos para eliminar microrrayas y bordesfilosos antes de ingresar al horno de templado.',
      criticalLevel: 'crítico',
      inspectionFrequency: '100% de las piezas destinadas a templar',
      standardValue: 'Canto arrisado matado a 45° continuo',
      tolerance: 'Cero desportilladuras > 1.0 mm'
    },
    {
      id: 'qc-vdt-03',
      processId: 'proc-vidrio-crudo-templado',
      code: 'CC-VDT-03',
      title: 'Ensayo de Fragmentación Vidrio Templado',
      description: 'Prueba de impacto y rotura en probeta de control para verificar tensiones térmicas del horno.',
      criticalLevel: 'crítico',
      inspectionFrequency: '1 probeta por cada lote de templado',
      standardValue: 'Grano fino sin aristas filosas',
      tolerance: 'Mínimo 40 fragmentos en un área de 50x50 mm'
    },
    {
      id: 'qc-vdt-04',
      processId: 'proc-vidrio-crudo-templado',
      code: 'CC-VDT-04',
      title: 'Verificación de Pátina para Vidrio Crudo Simple',
      description: 'Validación de hoja de ruta: si el vidrio es crudo no procesado, patina directo a ensamble o despachos.',
      criticalLevel: 'medio',
      inspectionFrequency: '100% de coches de transporte de vidrio',
      standardValue: 'Ruteo correcto marcado en coche',
      tolerance: 'Etiqueta de destino correcta'
    }
  ],
  pintura: [
    {
      id: 'qc-pnt-01',
      processId: 'proc-pintura',
      code: 'CC-PNT-01',
      title: 'Espesor de Película Seca de Pintura',
      description: 'Medición de micras de pintura en caras visibles del perfil extruido.',
      criticalLevel: 'crítico',
      inspectionFrequency: '5 puntos de medición por barra, 3 barras por rack',
      standardValue: '70 µm',
      tolerance: 'Rango aceptable: 60 a 80 µm'
    },
    {
      id: 'qc-pnt-02',
      processId: 'proc-pintura',
      code: 'CC-PNT-02',
      title: 'Adherencia de la Pintura (Cross-Hatch Test)',
      description: 'Ensayos destructivo de rejilla en probeta testigo con cinta adhesiva normalizada ASTM D3359.',
      criticalLevel: 'crítico',
      inspectionFrequency: '1 probeta por cada lote de horneado',
      standardValue: 'Clasificación 5B (100% adherida)',
      tolerance: 'Cero desprendimiento de retícula'
    }
  ],
  'empaques-felpas': [
    {
      id: 'qc-emp-01',
      processId: 'proc-empaques-felpas',
      code: 'CC-EMP-01',
      title: 'Asentamiento y Continuidad del Empaque EPDM',
      description: 'Verificación de la correcta inserción manual o neumática del empaque en el canal del perfil.',
      criticalLevel: 'alto',
      inspectionFrequency: '100% del perímetro montado',
      standardValue: 'Fijación continua sin ondas',
      tolerance: 'Elongación max 2.0%'
    }
  ],
  ensamble: [
    {
      id: 'qc-ens-01',
      processId: 'proc-ensamble',
      code: 'CC-ENS-01',
      title: 'Diferencia de Diagonales en Marco Armado',
      description: 'Medición cruzada entre vértices opuestos para garantizar el escuadreo perfecto del marco.',
      criticalLevel: 'crítico',
      inspectionFrequency: '100% de los marcos armados',
      standardValue: 'Diagonales idénticas (0.0 mm dif)',
      tolerance: 'Diferencia máxima permitida: ≤ 1.5 mm'
    },
    {
      id: 'qc-ens-02',
      processId: 'proc-ensamble',
      code: 'CC-ENS-02',
      title: 'Encuentro de Ingletes y Estanqueidad',
      description: 'Inspección del sellado interno y acople de esquinas a 45° con escuadra de unión.',
      criticalLevel: 'crítico',
      inspectionFrequency: '100% de las 4 esquinas',
      standardValue: 'Cierre total hermético sin luz',
      tolerance: 'Separación máxima < 0.2 mm'
    }
  ],
  alistamiento: [
    {
      id: 'qc-als-01',
      processId: 'proc-alistamiento',
      code: 'CC-ALS-01',
      title: 'Completitud de Kit de Material Suelto y Herrajes',
      description: 'Verificación física contra la lista de empaque (picking list) de todos los herrajes, tornillería, remates y accesorios sueltos.',
      criticalLevel: 'crítico',
      inspectionFrequency: '100% de paquetes de sueltos alistados',
      standardValue: '100% de piezas requeridas en empaque hermético',
      tolerance: 'Cero faltantes o piezas cambiadas'
    },
    {
      id: 'qc-als-02',
      processId: 'proc-alistamiento',
      code: 'CC-ALS-02',
      title: 'Empaque de Protección y Esquineros en Marcos',
      description: 'Inspección del vinipel termoencogible y montaje de esquineros de cartón prensado en las 4 esquinas.',
      criticalLevel: 'alto',
      inspectionFrequency: '100% de marcos alistados',
      standardValue: 'Marco cubierto con mínimo 3 vueltas de vinipel',
      tolerance: 'Cero zonas expuestas a fricción'
    },
    {
      id: 'qc-als-03',
      processId: 'proc-alistamiento',
      code: 'CC-ALS-03',
      title: 'Rotulado y Trazabilidad QR de Alistamiento',
      description: 'Comprobación de legibilidad del rótulo con código QR impreso adjunto al empaque.',
      criticalLevel: 'crítico',
      inspectionFrequency: '100% de paquetes etiquetados',
      standardValue: 'Código QR escaneable con datos de obra',
      tolerance: 'Legibilidad 100%'
    }
  ],
  despachos: [
    {
      id: 'qc-dsp-01',
      processId: 'proc-despachos',
      code: 'CC-DSP-01',
      title: 'Protección con Película y Esquinas de Cartón',
      description: 'Verificación del empaque exterior con película azul protectora y esquineros rígidos.',
      criticalLevel: 'alto',
      inspectionFrequency: '100% de paquetes y marcos despachados',
      standardValue: 'Cubrimiento completo sin zonas expuestas',
      tolerance: 'Mínimo 3 capas de vinipel en extremos'
    }
  ],
  transporte: [
    {
      id: 'qc-trn-01',
      processId: 'proc-transporte',
      code: 'CC-TRN-01',
      title: 'Aseguramiento y Separación en Camión',
      description: 'Revisión del trincado con bandas textiles y separadores de madera entre estibas.',
      criticalLevel: 'crítico',
      inspectionFrequency: '100% de camiones cargados antes de salir',
      standardValue: 'Carga inmóvil, cero metal-metal',
      tolerance: 'Amarre firme sin deformar perfiles'
    }
  ]
};

export const ACCEPTANCE_CRITERIA: Record<string, AcceptanceCriterion[]> = {
  'corte-perfileria': [
    {
      id: 'ac-cyp-01',
      processId: 'proc-corte-perfileria',
      controlId: 'qc-cyp-01',
      parameter: 'Longitud de corte de perfil',
      acceptance: 'Desviación máxima entre -0.5 mm y +0.5 mm respecto al plano de despiece de orden.',
      rejection: 'Cualquier pieza con longitud fuera del rango de ±0.5 mm.',
      requiredAction: 'Si es más larga (+0.8 mm), re-cortar en tronzadora. Si es corta (-0.8 mm), rechazar pieza y cortar nueva barra.'
    },
    {
      id: 'ac-cyp-02',
      processId: 'proc-corte-perfileria',
      controlId: 'qc-cyp-02',
      parameter: 'Ángulo e inglete',
      acceptance: 'Ángulo entre 44.8° y 45.2° o 89.8° y 90.2°.',
      rejection: 'Desviación angular > 0.2° (genera luz abierta al ensamblar el marco).',
      requiredAction: 'Detener tronzadora, limpiar tope micrométrico de disco y recalibrar goniómetro de cabezal.'
    },
    {
      id: 'ac-cyp-03',
      processId: 'proc-corte-perfileria',
      controlId: 'qc-cyp-03',
      parameter: 'Espesor y rectitud (flecha)',
      acceptance: 'Espesor según catálogo (±0.10 mm) y flecha longitudinal ≤ 1.0 mm por metro lineal.',
      rejection: 'Espesor fuera de norma o flecha > 1.0 mm/m.',
      requiredAction: 'Inmovilizar barra defectuosa y notificar a Calidad Extrusión.'
    }
  ],
  troquelado: [
    {
      id: 'ac-trq-01',
      processId: 'proc-troquelado',
      controlId: 'qc-trq-01',
      parameter: 'Calado desahogo de agua',
      acceptance: 'Troquel limpio, simétrico, sin deformación en la pared externa visible del marco.',
      rejection: 'Desahogo taponado por viruta, rasgado de pared o matriz desplazada > 1 mm de la cota.',
      requiredAction: 'Limpiar matriz con aire comprimido. Si hay rebaba excesiva, afilar punzón inmediatamente.'
    }
  ],
  'vidrio-crudo-templado': [
    {
      id: 'ac-vdt-01',
      processId: 'proc-vidrio-crudo-templado',
      controlId: 'qc-vdt-01',
      parameter: 'Dimensiones de vidrio crudo',
      acceptance: 'Medida cortada dentro de ±1.0 mm y descuadre entre diagonales ≤ 1.5 mm.',
      rejection: 'Vidrio fuera de tolerancia o con cachos/desportilladuras en bordes cortados.',
      requiredAction: 'Refilar en mesa automatizada o descartar pieza si falta medida.'
    },
    {
      id: 'ac-vdt-02',
      processId: 'proc-vidrio-crudo-templado',
      controlId: 'qc-vdt-02',
      parameter: 'Arrisado de cantos pre-templado',
      acceptance: 'Canto totalmente matado sin bordes vivos ni astillamientos antes de entrar al horno.',
      rejection: 'Borde filoso o astillado no procesado (provoca explosión del vidrio dentro del horno).',
      requiredAction: 'Devolver a la lavadora-arrisadora para reprocesar arrisado.'
    },
    {
      id: 'ac-vdt-03',
      processId: 'proc-vidrio-crudo-templado',
      controlId: 'qc-vdt-03',
      parameter: 'Fragmentación en templado',
      acceptance: 'Rotura en partículas pequeñas sin bordes cortantes (mín. 40 fragmentos en 50x50 mm).',
      rejection: 'Fragmentos grandes en forma de lanza o cantidad menor a 40 partículas.',
      requiredAction: 'Detener el horno de templado, ajustar rampa de calentamiento y flujo de aire de enfriamiento (quench).'
    },
    {
      id: 'ac-vdt-04',
      processId: 'proc-vidrio-crudo-templado',
      controlId: 'qc-vdt-04',
      parameter: 'Flujo de pátina de vidrio crudo simple',
      acceptance: 'Ruteo directo identificado para vidrio crudo no procesado hacia ensamble o despachos.',
      rejection: 'Envío erróneo de vidrio crudo simple al horno de templado.',
      requiredAction: 'Re-etiquetar coche de transporte e instruir al operador de logística de vidrio.'
    }
  ],
  pintura: [
    {
      id: 'ac-pnt-01',
      processId: 'proc-pintura',
      controlId: 'qc-pnt-01',
      parameter: 'Espesor de pintura',
      acceptance: 'Capa continua con espesor seco entre 60 µm y 80 µm en caras vistas.',
      rejection: 'Espesor < 60 µm (riesgo de decoloración) o > 100 µm (riesgo de descascarado).',
      requiredAction: 'Si es <60 µm, reprisar en cabina. Si es >100 µm en canal de herraje, lijar o decaparse.'
    },
    {
      id: 'ac-pnt-02',
      processId: 'proc-pintura',
      controlId: 'qc-pnt-02',
      parameter: 'Adherencia y polimerización',
      acceptance: 'Cero desprendimiento de bordes en la cuadrícula 5B tras retirar la cinta 3M 610.',
      rejection: 'Desprendimiento de cuadros de pintura (Clasificación 3B, 2B, 1B o 0B).',
      requiredAction: 'Inmovilizar todo el lote de horneado asociado y realizar re-horneado o decapado total.'
    }
  ],
  'empaques-felpas': [
    {
      id: 'ac-emp-01',
      processId: 'proc-empaques-felpas',
      controlId: 'qc-emp-01',
      parameter: 'Inserción de EPDM y Felpa',
      acceptance: 'Felpa alineada en su guía con aleta plástica completa. Empaque EPDM encajado en todo el canal.',
      rejection: 'Felpa aplastada o sin aleta. Empaque estirado (se encogerá después dejando luz en las esquinas).',
      requiredAction: 'Retirar empaque tensionado y reinsertar manualmente sin halar.'
    }
  ],
  ensamble: [
    {
      id: 'ac-ens-01',
      processId: 'proc-ensamble',
      controlId: 'qc-ens-01',
      parameter: 'Escuadreo de diagonales',
      acceptance: 'Diferencia D1 - D2 ≤ 1.5 mm en marcos de ventana estándar.',
      rejection: 'Diferencia D1 - D2 > 1.5 mm.',
      requiredAction: 'Aflojar tornillos de escuadra de alineación, re-escuadrar en mesa neumática y apretar a torque.'
    },
    {
      id: 'ac-ens-02',
      processId: 'proc-ensamble',
      controlId: 'qc-ens-02',
      parameter: 'Acople de ingletes',
      acceptance: 'Ingletes alineados al ras, plano con plano, sin escalón perceptible al tacto.',
      rejection: 'Escalón entre perfiles > 0.3 mm o luz de unión abierta > 0.2 mm.',
      requiredAction: 'Verificar si la escuadra interna de ensamble está defectuosa o re-revisar corte de 45°.'
    }
  ],
  alistamiento: [
    {
      id: 'ac-als-01',
      processId: 'proc-alistamiento',
      controlId: 'qc-als-01',
      parameter: 'Kit de material suelto y accesorios',
      acceptance: '100% de herrajes, remates, tornillos y empaques sueltos empacados en bolsa sellada y rotulada.',
      rejection: 'Faltante de cualquier accesorio según lista de empaque o bolsa rota.',
      requiredAction: 'Completar kit en mesa de alistamiento y colocar sello verde de verificación.'
    },
    {
      id: 'ac-als-02',
      processId: 'proc-alistamiento',
      controlId: 'qc-als-02',
      parameter: 'Protección de marcos alistados',
      acceptance: 'Marcos protegidos con vinipel (mínimo 3 capas) y esquineros de cartón en los 4 vértices.',
      rejection: 'Esquinas expuestas o vinipel roto.',
      requiredAction: 'Colocar esquineros adicionales y envolver nuevamente con película vinipel.'
    },
    {
      id: 'ac-als-03',
      processId: 'proc-alistamiento',
      controlId: 'qc-als-03',
      parameter: 'Identificación QR de alistamiento',
      acceptance: 'Etiqueta QR pegada en lugar visible con nombre de cliente, obra y contenido de bulto.',
      rejection: 'Ausencia de etiqueta o código QR ilegible al escaneo.',
      requiredAction: 'Imprimir nueva etiqueta oficial QR y sustituir de inmediato.'
    }
  ],
  despachos: [
    {
      id: 'ac-dsp-01',
      processId: 'proc-despachos',
      controlId: 'qc-dsp-01',
      parameter: 'Identificación y Embalaje',
      acceptance: 'Etiqueta QR visible con número de obra, ítem y cliente. Película protectora azul sin roturas.',
      rejection: 'Falta de etiqueta, número de obra erróneo o perfiles descubiertos en zonas de roce.',
      requiredAction: 'Re-empaquetar zona descubierta y solicitar reimpresión de etiqueta QR a Logística.'
    }
  ],
  transporte: [
    {
      id: 'ac-trn-01',
      processId: 'proc-transporte',
      controlId: 'qc-trn-01',
      parameter: 'Estibado y trincado',
      acceptance: 'Atados colocados sobre tacos de pino con amarres textiles tensionados a mano/carraca.',
      rejection: 'Cables de acero o cadenas en contacto directo con perfiles, o carga sobresaliente sin señalización.',
      requiredAction: 'Reordenar estibas y colocar mantas protectoras antes de autorizar salida del camión.'
    }
  ]
};

export const AUTONOMY_MATRIX: Record<string, AutonomyLevelItem[]> = {
  'corte-perfileria': [
    {
      level: 'Nivel 1',
      title: 'Autonomía de Cortador de Perfiles',
      role: 'Cortador',
      scope: 'Ejecución del corte e inspección dimensional y angular básica de perfiles de aluminio.',
      allowedActions: [
        'Realizar cortes de aluminio según la orden de producción.',
        'Ajustar tope micrométrico para tolerancias dentro de ±0.5 mm y ±0.2°.',
        'Separar barras con defectos superficiales o rayaduras de extrusión.'
      ],
      escalationCondition: 'Descalibración de tronzadora o tolerancia fuera de ±0.5 mm.',
      contactPerson: 'Supervisor'
    },
    {
      level: 'Nivel 2',
      title: 'Autonomía de Supervisor',
      role: 'Supervisor',
      scope: 'Supervisión del proceso de corte, re-optimización de barras y ajuste de máquinas.',
      allowedActions: [
        'Autorizar repetición de corte de perfiles dañados.',
        'Re-optimizar retazos para minimizar desperdicios de aluminio.',
        'Ajustar y calibrar tronzadoras de doble cabezal.'
      ],
      escalationCondition: 'Defecto repetitivo de matriz o no conformidad dimensional en el lote.',
      contactPerson: 'Auxiliar y Coordinador de Calidad'
    },
    {
      level: 'Nivel 3',
      title: 'Autonomía de Auxiliar y Coordinador de Calidad',
      role: 'Auxiliar y Coordinador de Calidad',
      scope: 'Auditoría de tolerancias, liberación de lotes de corte y detención de operaciones.',
      allowedActions: [
        'Detener la operación de tronzadoras fuera de tolerancia angular o dimensional.',
        'Bloquear lotes de aluminio no conformes en sistema.',
        'Emitir reportes de no conformidad y autorizar liberación de corte.'
      ],
      escalationCondition: 'Necesidad de autorizar reprogramación o cambios por prioridades de entrega.',
      contactPerson: 'Jefe de Producción'
    },
    {
      level: 'Nivel 4',
      title: 'Autonomía de Jefe de Producción',
      role: 'Jefe de Producción',
      scope: 'Autorización por prioridades de entregas, reprogramación de lotes e hitos de despacho.',
      allowedActions: [
        'Autorizar cambios de secuencia de corte según prioridades de entrega de obra.',
        'Aprobar turnos extraordinarios o reprogramaciones urgentes para cumplir despachos.',
        'Reasignar recursos y priorizar órdenes críticas de clientes.'
      ],
      escalationCondition: 'No aplica.',
      contactPerson: 'Gerencia de Operaciones'
    }
  ],
  pintura: [
    {
      level: 'Nivel 1',
      title: 'Autonomía de Auxiliar de Pintura',
      role: 'Auxiliar de Pintura',
      scope: 'Cuelgue de perfiles, aplicación electrostática y control visual previo al curado.',
      allowedActions: [
        'Ajustar voltaje de pistolas electrostáticas (60 - 80 kV).',
        'Limpiar picos y boquillas de aplicación de polvo.',
        'Separar perfiles con acumulación desigual de polvo antes del curado.'
      ],
      escalationCondition: 'Variación de tono, polvo apelmazado o fallas en el lavado previo.',
      contactPerson: 'Supervisor'
    },
    {
      level: 'Nivel 2',
      title: 'Autonomía de Supervisor',
      role: 'Supervisor',
      scope: 'Gestión de cadena de transporte, temperatura de horneado y baños químicos.',
      allowedActions: [
        'Ajustar velocidad de cadena y temperatura del horno (180°C - 200°C).',
        'Autorizar repintado (reprisa) de perfiles no curados.',
        'Supervisar concentraciones de baños de lavado y pretratamiento.'
      ],
      escalationCondition: 'Falta de adherencia en prueba de cinta o espesores fuera de 60-80 µm.',
      contactPerson: 'Auxiliar y Coordinador de Calidad'
    },
    {
      level: 'Nivel 3',
      title: 'Autonomía de Auxiliar y Coordinador de Calidad',
      role: 'Auxiliar y Coordinador de Calidad',
      scope: 'Ensayos de adherencia (ASTM D3359), medición de micras y liberación de racks.',
      allowedActions: [
        'Rechazar e inmovilizar lotes horneados con fallas de adherencia.',
        'Liberar racks de pintura mediante certificado de micras (60-80 µm).',
        'Exigir rectificación o cambio de baños químicos.'
      ],
      escalationCondition: 'Ajuste urgente en la secuencia de horneado por prioridades de entrega.',
      contactPerson: 'Jefe de Producción'
    },
    {
      level: 'Nivel 4',
      title: 'Autonomía de Jefe de Producción',
      role: 'Jefe de Producción',
      scope: 'Autorización por prioridades de entregas y cambios de secuencia de color en pintura.',
      allowedActions: [
        'Autorizar cambio de secuencia de color para priorizar entregas de obra urgentes.',
        'Aprobar procesamiento preferencial de lotes críticos.',
        'Coordinar con logística el despacho prioritario de perfiles pintados.'
      ],
      escalationCondition: 'No aplica.',
      contactPerson: 'Gerencia de Operaciones'
    }
  ],
  troquelado: [
    {
      level: 'Nivel 1',
      title: 'Autonomía de Auxiliar Troquelado',
      role: 'Auxiliar Troquelado',
      scope: 'Ejecución de perforaciones, desahogos de agua y calados estructurales en prensa.',
      allowedActions: [
        'Verificar alineación de pisadores y matrices antes de punzonar.',
        'Limpiar rebabas suaves con desbarbador o lima.',
        'Detener la prensa si el punzón se traba en el perfil.'
      ],
      escalationCondition: 'Punzón roto, deformación en paredes visibles o troquel mellado.',
      contactPerson: 'Supervisor'
    },
    {
      level: 'Nivel 2',
      title: 'Autonomía de Supervisor',
      role: 'Supervisor',
      scope: 'Montaje de troqueles, ajuste de presión neumática y prueba de perforación.',
      allowedActions: [
        'Montar y ajustar matrices estándar de punzonado.',
        'Ajustar la presión neumática de entrada (6 - 8 bar) y lubricación.',
        'Autorizar muestras iniciales de calado y drenajes.'
      ],
      escalationCondition: 'Matriz desgastada que requiera mantenimiento o desajuste de cotas.',
      contactPerson: 'Auxiliar y Coordinador de Calidad'
    },
    {
      level: 'Nivel 3',
      title: 'Autonomía de Auxiliar y Coordinador de Calidad',
      role: 'Auxiliar y Coordinador de Calidad',
      scope: 'Auditoría de patrones de desahogo (25x5 mm) y liberación de mecanizado.',
      allowedActions: [
        'Inhabilitar matrices que generen perforaciones fuera de tolerancia.',
        'Liberar estaciones de troquelado para paso a ensamble.',
        'Exigir mantenimiento o rectificación de matrices.'
      ],
      escalationCondition: 'Ajuste en la prioridad de troquelado por urgencia en armado de marcos.',
      contactPerson: 'Jefe de Producción'
    },
    {
      level: 'Nivel 4',
      title: 'Autonomía de Jefe de Producción',
      role: 'Jefe de Producción',
      scope: 'Autorización por prioridades de entregas y reprogramación de troquelado.',
      allowedActions: [
        'Autorizar prioridades de troquelado e intercambio de turnos por compromisos de entrega.',
        'Aprobar mecanizados especiales para requerimientos urgentes de cliente.',
        'Reasignar operadores a líneas de troquelado prioritarias.'
      ],
      escalationCondition: 'No aplica.',
      contactPerson: 'Gerencia de Operaciones'
    }
  ],
  'empaques-felpas': [
    {
      level: 'Nivel 1',
      title: 'Autonomía de Auxiliar de Felpa',
      role: 'Auxiliar de Felpa',
      scope: 'Inserción manual o mecánica de felpas y sellos EPDM en canales de aluminio.',
      allowedActions: [
        'Utilizar rodillo cónico de nylon sin estirar el empaque.',
        'Dejar excedente de 1 cm para contracción térmica de EPDM.',
        'Reemplazar carretes de felpa deshilachados o sin aleta.'
      ],
      escalationCondition: 'Canal de aluminio estrecho o empaque que se desaloja.',
      contactPerson: 'Supervisor'
    },
    {
      level: 'Nivel 2',
      title: 'Autonomía de Supervisor',
      role: 'Supervisor',
      scope: 'Supervisión de referencias de empaque por serie y unión de esquinas.',
      allowedActions: [
        'Ajustar la referencia de empaque según la serie de perfil (S-7042, S-8025, etc.).',
        'Autorizar pegado con cianocrilato especializado en esquinas.',
        'Verificar inserción de felpa con aleta impermeabilizante (fin-seal).'
      ],
      escalationCondition: 'Elongación del empaque >2% o falta de insumos de sellado.',
      contactPerson: 'Auxiliar y Coordinador de Calidad'
    },
    {
      level: 'Nivel 3',
      title: 'Autonomía de Auxiliar y Coordinador de Calidad',
      role: 'Auxiliar y Coordinador de Calidad',
      scope: 'Auditoría de estanqueidad, tracción y verificación de elongación (<2%).',
      allowedActions: [
        'Obligar re-empaquetado inmediato si se detecta estiramiento >2%.',
        'Liberar perfiles empaquetados para paso a ensamble.',
        'Exigir corrección de felpas aplastadas o mal encajadas.'
      ],
      escalationCondition: 'Reprogramación del flujo de ensamble por prioridad de entrega.',
      contactPerson: 'Jefe de Producción'
    },
    {
      level: 'Nivel 4',
      title: 'Autonomía de Jefe de Producción',
      role: 'Jefe de Producción',
      scope: 'Autorización por prioridades de entregas y aceleración de empaquetado.',
      allowedActions: [
        'Autorizar despacho o avance prioritario de lotes empaquetados.',
        'Aprobar sustituciones homologadas de empaques para evitar retrasos de entrega.',
        'Coordinar prioridades de armado según fecha comprometida con cliente.'
      ],
      escalationCondition: 'No aplica.',
      contactPerson: 'Gerencia de Operaciones'
    }
  ],
  'vidrio-crudo-templado': [
    {
      level: 'Nivel 1',
      title: 'Autonomía de Auxiliar de Corte o Temple',
      role: 'Auxiliar de Corte o Temple',
      scope: 'Corte automatizado de vidrio crudo, arrisado de cantos y alimentación del horno.',
      allowedActions: [
        'Verificar dimensiones de vidrio crudo (tolerancia ±1.0 mm).',
        'Rutear vidrio crudo simple (sin templar) hacia la estiba de pátina directa.',
        'Verificar el correcto arrisado y pulido de cantos antes del horno.'
      ],
      escalationCondition: 'Desportilladuras, descuadre >1.5 mm o fallas en el arrisado de cantos.',
      contactPerson: 'Supervisor'
    },
    {
      level: 'Nivel 2',
      title: 'Autonomía de Supervisor',
      role: 'Supervisor',
      scope: 'Supervisión de recetas del horno (680-700°C), mesa de corte y arrisado.',
      allowedActions: [
        'Ajustar la velocidad de transferencia y temperatura del horno.',
        'Autorizar el re-corte de vidrios crudos sobrantes en mesa.',
        'Supervisar la preparación de bordes y lavado del vidrio.'
      ],
      escalationCondition: 'Falla en prueba de fragmentación (<40 fragmentos en 50x50 mm) o rotura.',
      contactPerson: 'Auxiliar y Coordinador de Calidad'
    },
    {
      level: 'Nivel 3',
      title: 'Autonomía de Auxiliar y Coordinador de Calidad',
      role: 'Auxiliar y Coordinador de Calidad',
      scope: 'Auditoría de fragmentación, choque térmico, tolerancias ópticas y liberación.',
      allowedActions: [
        'Detener el horno de templado si la prueba de fragmentación no es conforme a norma.',
        'Rechazar vidrios con iridiscencia severa, pandeo > 0.3% o burbujas.',
        'Liberar coches de vidrio cortado o templado hacia ensamble o despachos.'
      ],
      escalationCondition: 'Reagendamiento de procesamientos por prioridades de entrega.',
      contactPerson: 'Jefe de Producción'
    },
    {
      level: 'Nivel 4',
      title: 'Autonomía de Jefe de Producción',
      role: 'Jefe de Producción',
      scope: 'Autorización por prioridades de entregas en mesa de corte y horno de templado.',
      allowedActions: [
        'Autorizar procesamiento prioritario de cristales urgentes para obras.',
        'Aprobar pátina directa prioritaria de vidrio crudo para acelerar ensamble.',
        'Sincronizar despachos de vidrio templado con el cronograma de entregas.'
      ],
      escalationCondition: 'No aplica.',
      contactPerson: 'Gerencia de Operaciones'
    }
  ],
  ensamble: [
    {
      level: 'Nivel 1',
      title: 'Autonomía de Auxiliar u Oficial de Ensamble',
      role: 'Auxiliar u Oficial de Ensamble',
      scope: 'Atornillado de marcos, montaje de escuadras, accesorios y sellado con silicona.',
      allowedActions: [
        'Ajustar torque de atornillador neumático (4.5 Nm).',
        'Aplicar cordón de silicona estructural y repasar con espátula.',
        'Verificar el ajuste de herrajes y rodamientos de la ventana.'
      ],
      escalationCondition: 'Diferencia entre diagonales > 1.5 mm o desajuste de ingletes.',
      contactPerson: 'Supervisor'
    },
    {
      level: 'Nivel 2',
      title: 'Autonomía de Supervisor',
      role: 'Supervisor',
      scope: 'Supervisión de armado, escuadreo de marcos y hojas, y pruebas de rodamiento.',
      allowedActions: [
        'Reemplazar escuadras de alineación o herrajes defectuosos.',
        'Autorizar desarmado y re-escuadreo de marcos fuera de norma.',
        'Regular frenos y pestillos de cierre cremona.'
      ],
      escalationCondition: 'Luz de inglete > 0.2 mm o impedimento mecánico para escuadrar.',
      contactPerson: 'Auxiliar y Coordinador de Calidad'
    },
    {
      level: 'Nivel 3',
      title: 'Autonomía de Auxiliar y Coordinador de Calidad',
      role: 'Auxiliar y Coordinador de Calidad',
      scope: 'Auditoría de diagonales (≤1.5 mm), hermeticidad de ingletes y rotulado de aprobación.',
      allowedActions: [
        'Rechazar ventanas armadas con holgura en ingletes o fallas de cierre.',
        'Detener la línea de ensamble ante defectos no conformes.',
        'Colocar sello de "Calidad Aprobado" para paso a Alistamiento.'
      ],
      escalationCondition: 'Priorización de entrega urgente para cumplimiento de despachos.',
      contactPerson: 'Jefe de Producción'
    },
    {
      level: 'Nivel 4',
      title: 'Autonomía de Jefe de Producción',
      role: 'Jefe de Producción',
      scope: 'Autorización por prioridades de entregas para ensamble de ventanas a obra.',
      allowedActions: [
        'Autorizar armado preferencial de unidades comprometidas con obras urgentes.',
        'Aprobar soluciones técnicas especiales o refuerzos estructurales.',
        'Alinear turnos de ensamble para cumplir hitos de entrega de cliente.'
      ],
      escalationCondition: 'No aplica.',
      contactPerson: 'Gerencia de Operaciones'
    }
  ],
  alistamiento: [
    {
      level: 'Nivel 1',
      title: 'Autonomía de Auxiliar Alistamiento',
      role: 'Auxiliar Alistamiento',
      scope: 'Empaque de marcos con vinipel, colocación de esquineros y armado de kit de herrajes sueltos.',
      allowedActions: [
        'Verificar cantidades de herrajes y accesorios contra el picking list.',
        'Colocar esquineros de cartón en las 4 esquinas del marco.',
        'Aplicar mínimo 3 vueltas de película vinipel en marcos y bultos.'
      ],
      escalationCondition: 'Faltante de herrajes sueltos en stock o marco con defecto visual.',
      contactPerson: 'Supervisor'
    },
    {
      level: 'Nivel 2',
      title: 'Autonomía de Supervisor',
      role: 'Supervisor',
      scope: 'Supervisión de alistamiento de kits de material suelto, empaque y etiqueta QR.',
      allowedActions: [
        'Autorizar la sustitución de accesorios equivalentes homologados.',
        'Re-empacar elementos con vinipel roto o rasgado.',
        'Validar la etiqueta QR adjunta con datos de obra y cliente.'
      ],
      escalationCondition: 'Discrepancias entre la orden de producción y los accesorios entregados.',
      contactPerson: 'Auxiliar y Coordinador de Calidad'
    },
    {
      level: 'Nivel 3',
      title: 'Autonomía de Auxiliar y Coordinador de Calidad',
      role: 'Auxiliar y Coordinador de Calidad',
      scope: 'Auditoría del 100% de kits de herrajes sueltos y empaque antes de pasar a despachos.',
      allowedActions: [
        'Detener la salida de bultos incompletos o sin etiqueta QR legible.',
        'Auditar por muestreo bolsas de herrajes sueltos.',
        'Exigir esquineros rígidos adicionales en esquinas vulnerables.'
      ],
      escalationCondition: 'Cambios de urgencia en el orden de empaque por prioridades de entrega.',
      contactPerson: 'Jefe de Producción'
    },
    {
      level: 'Nivel 4',
      title: 'Autonomía de Jefe de Producción',
      role: 'Jefe de Producción',
      scope: 'Autorización por prioridades de entregas y despachos urgentes de kits de alistamiento.',
      allowedActions: [
        'Autorizar entregas parciales prioritarias de kits sueltos a obra.',
        'Aprobar embalajes especiales para transporte de larga distancia o exportación.',
        'Coordinar alistamiento express por solicitud urgente de cliente.'
      ],
      escalationCondition: 'No aplica.',
      contactPerson: 'Gerencia de Operaciones'
    }
  ],
  despachos: [
    {
      level: 'Nivel 1',
      title: 'Autonomía de Auxiliar Despachos',
      role: 'Auxiliar Despachos',
      scope: 'Ubicación de bultos en zona de cargue, verificación de empaques y etiquetas QR.',
      allowedActions: [
        'Aplicar vueltas adicionales de vinipel en zonas expuestas.',
        'Verificar la coincidencia del código QR con la planilla de cargue.',
        'Organizar bultos por obra y cliente en el muelle de despacho.'
      ],
      escalationCondition: 'Falta de etiqueta QR de obra o rotura de empaque protector.',
      contactPerson: 'Supervisor'
    },
    {
      level: 'Nivel 2',
      title: 'Autonomía de Supervisor',
      role: 'Supervisor',
      scope: 'Consolidación de remisiones, armado de guías de despacho e inspección de bultos.',
      allowedActions: [
        'Autorizar despacho parcial de ítems listos previa confirmación.',
        'Verificar la integridad del empaque de cristales y ventanas.',
        'Firmar remisión de salida de almacén de producto terminado.'
      ],
      escalationCondition: 'Divergencia entre inventario físico y remisión o material dañado.',
      contactPerson: 'Auxiliar y Coordinador de Calidad'
    },
    {
      level: 'Nivel 3',
      title: 'Autonomía de Auxiliar y Coordinador de Calidad',
      role: 'Auxiliar y Coordinador de Calidad',
      scope: 'Auditoría final de empaque, rotulado QR y estado de producto antes de subir al camión.',
      allowedActions: [
        'Bloquear el despacho de bultos mal embalados o sin esquineros rígidos.',
        'Auditar aleatoriamente bultos retirando película vinipel.',
        'Exigir re-etiquetado inmediato si el código QR es ilegible.'
      ],
      escalationCondition: 'Autorizaciones de despacho fuera de horario o prioridades especiales.',
      contactPerson: 'Jefe de Producción'
    },
    {
      level: 'Nivel 4',
      title: 'Autonomía de Jefe de Producción',
      role: 'Jefe de Producción',
      scope: 'Autorización por prioridades de entregas y despachos críticos de obra.',
      allowedActions: [
        'Autorizar despachos inmediatos por prioridades de entrega en obra.',
        'Aprobar fletes o transportes de emergencia para cumplir con el cliente.',
        'Resolver contingencias de despacho directamente con operaciones.'
      ],
      escalationCondition: 'No aplica.',
      contactPerson: 'Gerencia de Operaciones'
    }
  ],
  transporte: [
    {
      level: 'Nivel 1',
      title: 'Autonomía de Auxiliar Transporte',
      role: 'Auxiliar Transporte',
      scope: 'Acomodación de elementos en el vehículo, coloca tacos de madera y trincado textil.',
      allowedActions: [
        'Colocar tacos de caucho/madera entre atados para evitar fricción.',
        'Tensionar ratchets y bandas textiles de amarre de 2".',
        'Cubrir la carga con carpa impermeabilizada.'
      ],
      escalationCondition: 'Plataforma en mal estado o falta de bandas textiles de amarre.',
      contactPerson: 'Supervisor'
    },
    {
      level: 'Nivel 2',
      title: 'Autonomía de Supervisor',
      role: 'Supervisor',
      scope: 'Supervisión de la distribución de peso, amarres textiles y carpa del vehículo.',
      allowedActions: [
        'Verificar la estabilidad de la carga e inclinación de elementos.',
        'Exigir entablado o guacales para elementos frágiles.',
        'Ajustar trincados y ratchets antes de la salida del vehículo.'
      ],
      escalationCondition: 'Riesgo de sobrepeso o trincado inadecuado.',
      contactPerson: 'Auxiliar y Coordinador de Calidad'
    },
    {
      level: 'Nivel 3',
      title: 'Autonomía de Auxiliar y Coordinador de Calidad',
      role: 'Auxiliar y Coordinador de Calidad',
      scope: 'Auditoría de seguridad en trincado textil (cero contacto metálico) y liberación de camión.',
      allowedActions: [
        'Descalificar vehículos que usen cables o cadenas directas sobre el aluminio.',
        'Firmar manifiesto de salida de carga segura.',
        'Inmovilizar el vehículo hasta corregir el amarre.'
      ],
      escalationCondition: 'Reagendamiento de salida por prioridades de entrega al cliente.',
      contactPerson: 'Jefe de Producción'
    },
    {
      level: 'Nivel 4',
      title: 'Autonomía de Jefe de Producción',
      role: 'Jefe de Producción',
      scope: 'Autorización por prioridades de entregas y viajes expresos.',
      allowedActions: [
        'Autorizar despachos expresos o rutas especiales por prioridades de entrega.',
        'Aprobar transporte especial para sobredimensiones de fachada.',
        'Coordinar con clientes la llegada prioritaria a obra.'
      ],
      escalationCondition: 'No aplica.',
      contactPerson: 'Gerencia de Operaciones'
    }
  ]
};

export const DOCUMENTS: Record<string, DocumentItem[]> = {
  'corte-perfileria': [
    {
      id: 'doc-cyp-30',
      processId: 'proc-corte-perfileria',
      title: 'Infografía Estándar Corte y Perfilería de Aluminio Alco',
      code: 'INF-CYP-01',
      version: 'v3.0',
      status: 'vigente',
      effectiveDate: '2026-02-15',
      owner: 'Ing. Carlos Mendoza / Ing. Mateo Gómez',
      approvedBy: 'Dirección de Operaciones',
      documentType: 'infografia',
      contentText: `ESTÁNDAR OFICIAL DE CORTE Y PERFILERÍA DE ALUMINIO - ALCO S.A.S.
1. Recepción e Inspección de Perfiles Extruidos:
   - Aleación AA6063-T5. Espesor de pared según catálogo (tolerancia ± 0.10 mm).
   - Rectitud longitudinal (Flecha máx: 1.0 mm por metro lineal).
2. Parámetros de Corte en Tronzadoras de Doble Cabezal:
   - Tolerancia en longitud cortada: ± 0.5 mm respecto a la orden de producción.
   - Ángulos e inglete: 45.0° ± 0.2° y 90.0° ± 0.2°.
   - Desbarbado obligatorio de extremos y lubricación continua por microgoteo.
3. Matriz de Autonomía:
   - N1 (Operador): Corregir topes si la variación es < 0.5 mm y descartar barras rayadas.
   - N2 (Líder): Re-optimizar retazos y autorizar corte de sustitución.
   - N3 (Inspector): Detener tronzadora si hay desviación angular y bloquear lotes defectuosos.
   - N4 (Jefe Planta/Calidad): Autorizar devoluciones a extruidora o rediseño de despiece.`,
      sections: [
        { title: '1. Requisitos Dimensionales y Ángulos', content: 'Longitud ±0.5 mm. Ángulo ±0.2°. Espesor de pared ±0.10 mm. Flecha ≤ 1.0 mm/m.' },
        { title: '2. Mantenimiento y Calibración', content: 'Revisar dientes de disco cada 500 cortes y verificar escuadras metálicas de mesa Clase II.' }
      ]
    }
  ],
  troquelado: [
    {
      id: 'doc-trq-20',
      processId: 'proc-troquelado',
      title: 'Infografía Estándar Troquelado y Desahogos',
      code: 'INF-TRQ-02',
      version: 'v2.0',
      status: 'vigente',
      effectiveDate: '2025-09-20',
      owner: 'Téc. Roberto Silva',
      approvedBy: 'Dirección Técnica',
      documentType: 'infografia',
      contentText: `ESTÁNDAR DE TROQUELADO Y DREN AJES DE AGUA - ALCO S.A.S.
1. Requisitos:
   - Todos los marcos inferiores de ventana corredera y guías de fachada deben tener desahogos de agua troquelados según patrón del catálogo.
   - La perforación de desagüe debe medir 25x5 mm y llevar la calota protectora antiviento.
2. Criterios de Rechazo:
   - Omitir desahogos de agua en perfiles de riel inferior (causa filtración severa e inundación en obra).
   - Deformación del perfil por pisador flojo o punzón sin lubricante.
3. Autonomía:
   - N1: Verificar desahogo con galga y limpiar viruta.
   - N2: Montar y calibrar troqueles neumático-hidráulicos.
   - N3: Inhabilitar troquel que genere perforaciones fuera de cota.`,
      sections: [
        { title: 'Ubicación de Desagües', content: 'A 50 mm de cada extremo y luego distanciados cada 400 mm máximo entre centros.' }
      ]
    }
  ],
  'vidrio-crudo-templado': [
    {
      id: 'doc-vdt-20',
      processId: 'proc-vidrio-crudo-templado',
      title: 'Infografía Estándar Corte de Vidrio Crudo y Proceso de Templado',
      code: 'INF-VDT-03',
      version: 'v2.0',
      status: 'vigente',
      effectiveDate: '2026-02-20',
      owner: 'Ing. Diana Henao',
      approvedBy: 'Gerencia de Planta Alco',
      documentType: 'infografia',
      contentText: `ESTÁNDAR DE CORTE DE VIDRIO CRUDO Y PROCESO DE TEMPLADO - ALCO S.A.S.
1. Corte de Vidrio Crudo:
   - Tolerancia dimensional de corte en mesa automatizada: ± 1.0 mm. Escuadreo entre diagonales ≤ 1.5 mm.
   - Distribución según especificación: Vidrio crudo no procesado patina directo hacia ensamble o despachos.
2. Proceso de Templado y Arrisado:
   - Todo vidrio destinado al horno de templado o laminado DEBE llevar arrisado/pulido de cantos matando filos.
   - Control de choque térmico y masa vidriada en horno (680°C - 700°C).
   - Prueba de fragmentación obligatoria por lote: mínimo 40 fragmentos en área de 50x50 mm.
3. Autonomía:
   - N1 (Operador Vidrio): Verificar medida cruda y rutear vidrios simples no procesados a pátina.
   - N2 (Líder Vidrio): Ajustar curva de calentamiento en horno y supervisar arrisadora.
   - N3 (Inspector Vidrio): Detener horno si la prueba de fragmentación es < 40 partículas.
   - N4 (Jefe Planta): Aprobar vidrios especiales y ensayos de laboratorio EN 12150.`,
      sections: [
        { title: 'Corte y Rutero de Vidrio Crudo', content: 'Vidrio crudo monolítico sin requerimiento térmico se envía directamente a la sección de ensamble o despachos mediante coche identificado.' },
        { title: 'Arrisado Obligatorio', content: 'Queda prohibido ingresar vidrios con cantos vivos al horno de templado para evitar estallidos.' }
      ]
    }
  ],
  pintura: [
    {
      id: 'doc-pnt-21',
      processId: 'proc-pintura',
      title: 'Infografía Estándar Pintura Electrostática en Polvo',
      code: 'INF-PNT-04',
      version: 'v2.1',
      status: 'vigente',
      effectiveDate: '2026-02-01',
      owner: 'Ing. Sofia Restrepo',
      approvedBy: 'Gerencia de Calidad',
      documentType: 'infografia',
      contentText: `ESTÁNDAR OFICIAL DE PINTURA ELECTROSTÁTICA - ALCO S.A.S.
1. Parámetros de Calidad del Recubrimiento:
   - Espesor de Película Seca: Entre 60 µm y 80 µm en superficies vistas principales.
   - Adherencia ASTM D3359: Calificación 5B (0% de desprendimiento en prueba de rejilla con cinta 3M 610).
   - Curado en Horno: Temperatura de metal 180°C - 200°C sostenida durante 20 minutos.
2. Defectos Inaceptables:
   - Cáscara de naranja excesiva (rugosidad Nivel > 3).
   - Cráteres, poros o pinholes que dejen ver el aluminio base.
   - Adherencia defectuosa (desprendimiento de pintura al rayar o manipular).
3. Niveles de Autonomía:
   - N1 (Pintor): Ajuste de kVoltaico (60-80 kV) y limpieza de picos.
   - N2 (Líder Pintura): Control de lavado pretratamiento y velocidad de cadena.
   - N3 (Laboratorio/Inspector): Detener producción ante falla 0B en prueba de adherencia.
   - N4 (Jefe Calidad): Certificación de garantías Qualicoat y cambio de proveedor de polvo.`,
      sections: [
        { title: 'Prueba de Adherencia (Cross Hatch)', content: 'Realizar 6 cortes verticales y 6 horizontales a 1mm de distancia con cortador multilama, aplicar cinta 3M 610, frotar y halar a 90°. Resultado obligatorio: 5B.' },
        { title: 'Medición de Espesor', content: 'Tomar 5 lecturas por perfil con medidor de corriente de Eddy calibrado con galga de 75µm sobre sustrato de aluminio.' }
      ]
    }
  ],
  'empaques-felpas': [
    {
      id: 'doc-emp-12',
      processId: 'proc-empaques-felpas',
      title: 'Infografía Inserción de Empaques EPDM y Felpas',
      code: 'INF-EMP-05',
      version: 'v1.2',
      status: 'vigente',
      effectiveDate: '2025-10-05',
      owner: 'Téc. Fernando Ruiz',
      approvedBy: 'Coordinación de Calidad',
      documentType: 'infografia',
      contentText: `ESTÁNDAR DE EMPAQUES Y HERMETICIDAD - ALCO S.A.S.
1. Empaques EPDM:
   - Deben colocarse continuos sin estiramiento (elongación máxima autorizada < 2%).
   - Esquinas cortadas a 45° con tijera angular especial y selladas con gota de adhesivo cianocrilato.
2. Felpas con Aleta (Fin-Seal):
   - Obligatorias en todas las ventanas correderas para garantizar la estanqueidad al viento y agua.
   - La aleta plástica central debe quedar vertical e intacta, sin dobleces.
3. Autonomía:
   - N1: Inserción manual con rodillo, dejar sobrante de 1cm en puntas.
   - N2: Cambiar referencia de felpa si cambia serie de obra.
   - N3: Obligar re-empaquetado si hay empaque tensionado.`,
      sections: [
        { title: 'Control de Elongación', content: 'Si se hala el empaque al insertarlo, con los días se encogerá dejando rendijas descubiertas en las esquinas por donde entrará agua.' }
      ]
    }
  ],
  ensamble: [
    {
      id: 'doc-ens-31',
      processId: 'proc-ensamble',
      title: 'Infografía Control de Ensamble y Cierre',
      code: 'INF-ENS-06',
      version: 'v3.1',
      status: 'vigente',
      effectiveDate: '2026-03-01',
      owner: 'Ing. Alejandro Morales',
      approvedBy: 'Gerencia General',
      documentType: 'infografia',
      contentText: `ESTÁNDAR DE ENSAMBLE DE VENTANERÍA Y ARQUITECTURA - ALCO S.A.S.
1. Requisitos de Tolerancia Dimensional:
   - Diagonales del Marco: Diferencia máxima entre D1 y D2 ≤ 1.5 mm.
   - Holgura de Inglete: Cierre hermético de esquina a 45°. Luz abierta mayor a 0.2 mm es MOTIVO DE RECHAZO.
   - Operación del Herraje: La manija o cremona debe accionar suavemente con un torque de mano menor a 2 Nm.
2. Sellado Estructural y Estanqueidad:
   - Cordón de silicona neutra continuo en el perímetro de contacto vidrio-aluminio.
   - Repasado obligatorio de silicona con espátula cóncava de goma.
3. Niveles de Autonomía:
   - N1 (Armador): Ajustar torque de atornillador neumático a 4.5 Nm y repasar cordón.
   - N2 (Líder Ensamble): Reemplazar escuadras de alineación y autorizar desarmado.
   - N3 (Inspector Calidad): Rechazar marcos con diagonales >1.5mm o luces abiertas >0.2mm.
   - N4 (Jefe Planta): Autorizar refuerzos de acero galvanizado en perfiles.`,
      sections: [
        { title: 'Escuadreo de Diagonales', content: 'Medir en X con cinta métrica metálica desde la punta exterior del inglete superior izquierdo al inferior derecho, y viceversa.' },
        { title: 'Prueba de Cierre de Hoja', content: 'Verificar que los puntos de cierre falleba / cremona enganchen completamente en sus cerraderos de marco sin forzar.' }
      ]
    }
  ],
  alistamiento: [
    {
      id: 'doc-als-20',
      processId: 'proc-alistamiento',
      title: 'Infografía Estándar de Alistamiento, Empaque y Material Suelto',
      code: 'INF-ALS-07',
      version: 'v2.0',
      status: 'vigente',
      effectiveDate: '2026-02-18',
      owner: 'Coord. Nelson Parra',
      approvedBy: 'Dirección de Operaciones',
      documentType: 'infografia',
      contentText: `ESTÁNDAR DE ALISTAMIENTO Y EMPAQUE DE MATERIAL SUELTO - ALCO S.A.S.
1. Alistamiento de Material Suelto:
   - Todo herraje, tornillería, remate, felpa suelta y accesorio de fijación debe ser empacado en bolsa plástica sellada y rotulada.
   - Verificación del 100% contra la lista de empaque (picking list) del proyecto.
2. Empaque y Protección de Marcos Armados:
   - Cubrimiento con película vinipel termoencogible (mínimo 3 capas completas).
   - Esquineros rígidos de cartón prensado o espuma en las 4 esquinas del producto.
3. Identificación y QR:
   - Etiqueta QR indeleble adherida en lugar visible del bulto con datos de obra, cliente, ítem y contenido.
4. Niveles de Autonomía:
   - N1 (Auxiliar): Armar kit de sueltos, aplicar vinipel y esquineros.
   - N2 (Líder Alistamiento): Consolidar bultos y colocar sello verde de verificación.
   - N3 (Inspector Calidad): Auditar por muestreo y detener salidas sin etiqueta QR.
   - N4 (Jefe Logística): Autorizar envíos express por garantía.`,
      sections: [
        { title: 'Verificación de Kits', content: 'Se debe realizar conteo doble de accesorios antes del sellado hermético de la bolsa de sueltos.' },
        { title: 'Protección para Transporte', content: 'Los marcos alistados no deben tener bordes metálicos descubiertos que puedan rayarse durante la estiba.' }
      ]
    }
  ],
  despachos: [
    {
      id: 'doc-dsp-20',
      processId: 'proc-despachos',
      title: 'Infografía Protección y Empaque para Despacho',
      code: 'INF-DSP-08',
      version: 'v2.0',
      status: 'vigente',
      effectiveDate: '2025-12-10',
      owner: 'Coord. Nelson Parra',
      approvedBy: 'Dirección Logística',
      documentType: 'infografia',
      contentText: `ESTÁNDAR DE EMBALAJE Y ROTULADO - ALCO S.A.S.
1. Criterios de Empaque:
   - Película azul autoadhesiva de protección en el 100% de las caras visibles expuestas.
   - Esquineros de cartón prensado rígido de 3 mm de espesor en las 4 esquinas de marcos armados.
   - Mínimo 3 vueltas de vinipel termoencogible en atados de perfiles.
2. Identificación y QR:
   - Cada paquete / elemento debe llevar la etiqueta oficial impreso con Código QR con: Número de Obra, Cliente, Código de Elemento, Cantidad y Peso.
3. Autonomía:
   - N1: Aplicar Vinipel y verificar QR con escáner.
   - N2: Autorizar despachos parciales.
   - N3: Detener salidas sin esquineros o con película rotas.`,
      sections: [
        { title: 'Rotulado Obligatorio', content: 'Etiqueta autoadhesiva indeleble pegada en la esquina inferior derecha del empaque del marco.' }
      ]
    }
  ],
  transporte: [
    {
      id: 'doc-trn-11',
      processId: 'proc-transporte',
      title: 'Infografía Aseguramiento de Carga en Vehículo',
      code: 'INF-TRN-09',
      version: 'v1.1',
      status: 'vigente',
      effectiveDate: '2025-08-14',
      owner: 'Ing. Claudia Vargas',
      approvedBy: 'Gerencia de Operaciones',
      documentType: 'infografia',
      contentText: `ESTÁNDAR DE TRANSPORTE Y AMARRE DE CARGA - ALCO S.A.S.
1. Reglas Inviolables de Cargue:
   - Queda strictly PROHIBIDO el contacto directo del aluminio pintado o pulido con las partes metálicas de la estaca o carrocería del camión.
   - Separadores de madera de pino seco o caucho sintético entre estibas cada 1.20 metros.
   - Amarre exclusivo con bandas textiles de trinquete de 2 pulgadas (prohibido usar cables de acero o cadenas directas).
2. Protección Térmica y de Lluvia:
   - Lona o carpa impermeabilizada de alta densidad fijada con reata en viajes superiores a 20 km.
3. Autonomía:
   - N1: Colocar tacos de caucho entre estibas.
   - N2: Rechazar plataforma si el camión tiene fisuras, piso húmedo o clavos.
   - N3: Inhabilitar camión por bandas desgastadas.`,
      sections: [
        { title: 'Distribución de Carga', content: 'Los elementos más pesados (atados de perfiles o cristales insulados) deben ir centrados sobre los ejes traseros del vehículo.' }
      ]
    }
  ]
};
