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
    ],
    showSelfCertificationBox: true
  },
  {
    id: 'proc-despachos-transporte',
    slug: 'despachos-transporte',
    code: 'INF-DSP-08',
    name: 'Despachos-Transporte',
    iconName: 'Truck',
    department: 'Almacén de Producto Terminado, Flotas y Transporte Terrestre',
    description: 'Cargue, etiquetado QR por ítem/obra, verificación de lista de embarque de módulos listos, aparejamiento y amarre seguro de la carga para su traslado.',
    activeVersion: 'v2.0',
    effectiveDate: '2025-12-10',
    owner: 'Coord. Nelson Parra - Logística y Despachos / Ing. Claudia Vargas - Seguridad y Logística',
    approvedBy: 'Dirección Logística Alco / Gerencia de Operaciones Alco',
    status: 'vigente',
    infographicTitle: 'Infografía Protección, Empaque y Aseguramiento de Carga para Despacho y Transporte',
    infographicSummary: 'Capa protectora azul de baja adhesión en perfiles visibles, esquineros de cartón en marcos armados, etiqueta de obra legible, y amarre seguro con bandas textiles sin contacto metal-metal durante el transporte.',
    keyAspects: [
      'Mínimo 3 vueltas de vinipel termoencogible en atados',
      'Esquineros de cartón prensado en las 4 esquinas de marcos armados',
      'Rótulo de despacho con código de orden, cliente, destino y peso',
      'Checklist de herrajes y accesorios empaquetados por separado',
      'Prohibido el contacto directo de perfiles pintados con metales del camión',
      'Separadores de goma o madera entre atados cada 1.2 metros',
      'Tensión de trinquete/carraca controlada para evitar doblado de marcos',
      'Lona impermeabilizada completa para trayectos intermunicipales'
    ]
  },
  {
    id: 'proc-instalacion',
    slug: 'instalacion',
    code: 'INF-INS-09',
    name: 'Instalación',
    iconName: 'Wrench',
    department: 'Equipo de Instalación en Obra',
    description: 'Espacio de consulta para el equipo instalador: publicaciones y documentación vigente compartidos directamente desde el Portal de Administración.',
    activeVersion: 'v1.0',
    effectiveDate: '2026-08-21',
    owner: 'Coordinación de Instalación',
    approvedBy: 'Dirección de Operaciones Alco',
    status: 'vigente',
    infographicTitle: 'Documentación de Referencia para el Equipo de Instalación',
    infographicSummary: 'Este espacio reúne las publicaciones y la documentación vigente para el equipo de instalación en obra. El contenido se carga y actualiza directamente desde el Portal de Administración a medida que esté disponible.',
    keyAspects: [],
    showAutonomyTab: false
  },
  {
    id: 'proc-control-calidad',
    slug: 'control-calidad',
    code: 'INF-CAL-10',
    name: 'Control Calidad',
    iconName: 'ClipboardCheck',
    department: 'Aseguramiento y Control de Calidad',
    description: 'Espacio del equipo de Calidad: instructivos, diseños, formularios de inspección y gestión de tareas del área.',
    activeVersion: 'v1.0',
    effectiveDate: '2026-09-01',
    owner: 'Coordinación de Calidad Alco',
    approvedBy: 'Dirección de Operaciones Alco',
    status: 'vigente',
    infographicTitle: 'Espacio de Trabajo de Calidad',
    infographicSummary: 'Instructivos y diseños de referencia, formularios de inspección (Microsoft Forms) abiertos directamente dentro del aplicativo, y un tablero de tareas para el seguimiento diario del equipo de Calidad.',
    keyAspects: [],
    showAutonomyTab: false,
    showFormsTab: true,
    showTasksTab: true
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
  'despachos-transporte': [
    {
      id: 'qc-dsp-01',
      processId: 'proc-despachos-transporte',
      code: 'CC-DSP-01',
      title: 'Protección con Película y Esquinas de Cartón',
      description: 'Verificación del empaque exterior con película azul protectora y esquineros rígidos.',
      criticalLevel: 'alto',
      inspectionFrequency: '100% de paquetes y marcos despachados',
      standardValue: 'Cubrimiento completo sin zonas expuestas',
      tolerance: 'Mínimo 3 capas de vinipel en extremos'
    },
    {
      id: 'qc-trn-01',
      processId: 'proc-despachos-transporte',
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
      parameter: 'Rayas transversales de manipulación en el perfil',
      acceptance: 'Máximo 5 rayas con longitud menor a 4 mm, separadas como mínimo 20 cm entre ellas.',
      rejection: 'Más de 5 rayas o rayas ubicadas a menor distancia entre sí que lo permitido.',
      requiredAction: 'Separar la pieza y reportar a Calidad; si es atribuible al proveedor, registrar en la hoja de defectos.'
    },
    {
      id: 'ac-cyp-02',
      processId: 'proc-corte-perfileria',
      controlId: 'qc-cyp-02',
      parameter: 'Defectos del recubrimiento de pintura electrostática en el perfil',
      acceptance: 'Superficie sin desprendimiento de pintura, piel de naranja, ojo de pescado/cráteres ni pinhole/hervido.',
      rejection: 'Presencia de cualquiera de estos defectos (desprendimiento, piel de naranja, cráteres, pinhole) — según la hoja de defectos, siempre se rechazan.',
      requiredAction: 'Separar la pieza y notificar al área de Pintura para determinar si es reprocesable.'
    },
    {
      id: 'ac-cyp-03',
      processId: 'proc-corte-perfileria',
      controlId: 'qc-cyp-03',
      parameter: 'Fricción y golpes por manipulación',
      acceptance: 'Marca de fricción o golpe presente en un solo punto del perfil.',
      rejection: 'Fricción o golpes repetitivos en varios puntos del mismo perfil.',
      requiredAction: 'Si es repetitivo, separar la pieza y reportar a Calidad; revisar prácticas de arrume del área.'
    },
    {
      id: 'ac-cyp-04',
      processId: 'proc-corte-perfileria',
      controlId: 'qc-cyp-04',
      parameter: 'Protección de perfilería durante la manipulación',
      acceptance: 'Perfiles arrumados sobre icopor, con puntas protegidas y sin contacto directo entre paquetes.',
      rejection: 'Perfiles apilados sin icopor/protección, con puntas expuestas en contacto con otros paquetes.',
      requiredAction: 'Reubicar y proteger la perfilería según el instructivo de cuidado y manipulación antes de continuar.'
    }
  ],
  troquelado: [
    {
      id: 'ac-trq-01',
      processId: 'proc-troquelado',
      controlId: 'qc-trq-01',
      parameter: 'Diámetro y posición de perforaciones según plano',
      acceptance: 'Diámetro de la perforación dentro de la tolerancia indicada en el plano técnico vigente (ej. Ø4.5 ±0.1 mm, Ø2.5 ±0.1 mm) y ubicada en la cota señalada.',
      rejection: 'Diámetro o posición de la perforación fuera de la tolerancia o cota indicada en el plano CAD vigente del sistema.',
      requiredAction: 'Verificar el plano vigente de la referencia y recalibrar punzón o matriz antes de continuar el lote.'
    },
    {
      id: 'ac-trq-02',
      processId: 'proc-troquelado',
      controlId: 'qc-trq-02',
      parameter: 'Ubicación de avellanes según plantilla de diseño',
      acceptance: 'Avellán posicionado según la plantilla oficial correspondiente al sistema y al rango de medida de la ventana (jamba, cabezal o sillar).',
      rejection: 'Avellán fuera de la posición de plantilla, o realizado en zonas marcadas como "no lleva avellán" (p. ej. anchos ≤1200 mm en sillar, zonas engrafadas) sin consultar medidas fuera de rango.',
      requiredAction: 'Verificar la plantilla del sistema y medida antes de perforar; si la medida está fuera de rango, consultar con Ingeniería.'
    }
  ],
  'vidrio-crudo-templado': [
    {
      id: 'ac-vdt-01',
      processId: 'proc-vidrio-crudo-templado',
      controlId: 'qc-vdt-01',
      parameter: 'Separación y protección de vidrios en arrumes',
      acceptance: 'Vidrios de distinta medida separados con cartón, apoyados con icopor sobre pared o tablas, y arrumados sin inclinación.',
      rejection: 'Vidrios de distinta medida en contacto directo sin cartón, apoyados sin icopor, o arrumados de forma inclinada.',
      requiredAction: 'Reorganizar el arrume con la protección adecuada antes de continuar la manipulación.'
    },
    {
      id: 'ac-vdt-02',
      processId: 'proc-vidrio-crudo-templado',
      controlId: 'qc-vdt-02',
      parameter: 'Estado de carros patinadores para transporte de vidrio',
      acceptance: 'Carro patinador en buen estado y arrume sujeto con caulla alrededor.',
      rejection: 'Carro deteriorado o arrume sin sujeción.',
      requiredAction: 'No usar el carro, avisar al supervisor y transportar en uno que esté en condiciones óptimas.'
    },
    {
      id: 'ac-vdt-03',
      processId: 'proc-vidrio-crudo-templado',
      controlId: 'qc-vdt-03',
      parameter: 'Manipulación de vidrio templado a la salida del horno',
      acceptance: 'Piezas manipuladas de una en una al salir del horno antes de ubicarlas en los burros.',
      rejection: 'Manipulación de varias piezas de vidrio templado a la vez (riesgo de sobrepeso y caída).',
      requiredAction: 'Detener la manipulación en curso y retomar pieza por pieza según el instructivo.'
    }
  ],
  pintura: [
    {
      id: 'ac-pnt-01',
      processId: 'proc-pintura',
      controlId: 'qc-pnt-01',
      parameter: 'Acidez del baño de fosfatizado (titulación diaria)',
      acceptance: 'Entre 10 y 12 ml de líquido titulante para alcanzar el color rosado estable, lo que garantiza buena adherencia de la pintura.',
      rejection: 'Menos de 10 ml o más de 12 ml de titulante.',
      requiredAction: 'Informar al supervisor de pintura para calcular y aplicar la fórmula de recarga (ácido Gardacid y/o agua).'
    },
    {
      id: 'ac-pnt-02',
      processId: 'proc-pintura',
      controlId: 'qc-pnt-02',
      parameter: 'Puntos activos totales del baño GARDACID AC (ficha técnica del proveedor)',
      acceptance: '79 a 89 puntos activos totales en la dilución estándar de operación (1:9).',
      rejection: 'Titulación fuera del rango 79-89 en la dilución estándar.',
      requiredAction: 'Ajustar el baño por adición de producto o de agua según la ficha técnica; consultar al proveedor si persiste.'
    },
    {
      id: 'ac-pnt-03',
      processId: 'proc-pintura',
      controlId: 'qc-pnt-03',
      parameter: 'Protección del material después de pintado',
      acceptance: 'Perfilería protegida con cinta stretch inmediatamente después de pintada y ubicada donde no sufra caídas ni fricciones.',
      rejection: 'Material recién pintado sin proteger, expuesto a caídas o fricción con otros paquetes.',
      requiredAction: 'Proteger de inmediato con cinta stretch y reubicar en zona segura.'
    }
  ],
  'empaques-felpas': [
    {
      id: 'ac-emp-01',
      processId: 'proc-empaques-felpas',
      controlId: 'qc-emp-01',
      parameter: 'Compatibilidad química y térmica del empaque EPDM',
      acceptance: 'Empaque EPDM sin contacto con combustibles, solventes de hidrocarburos, lubricantes de diésteres minerales/sintéticos ni sellantes de silicona estructural, y a temperatura de trabajo de hasta 110°C.',
      rejection: 'Contacto con cualquiera de esas sustancias incompatibles, o exposición a temperatura mayor a 110°C.',
      requiredAction: 'Retirar y sustituir el tramo de empaque expuesto; verificar la ficha técnica del compuesto antes de aplicar químicos cerca del empaque.'
    },
    {
      id: 'ac-emp-02',
      processId: 'proc-empaques-felpas',
      controlId: 'qc-emp-02',
      parameter: 'Protección de perfilería durante inserción de felpa y empaque',
      acceptance: 'Perfiles arrumados con icopor/cartón entre medidas distintas y extremos protegidos con plástico al finalizar el pegado de felpa/empaque.',
      rejection: 'Perfiles arrumados sin protección, con fricción entre puntas o rebaba de mecanizado en contacto directo.',
      requiredAction: 'Proteger y reorganizar el arrume según el instructivo antes de continuar.'
    }
  ],
  ensamble: [
    {
      id: 'ac-ens-01',
      processId: 'proc-ensamble',
      controlId: 'qc-ens-01',
      parameter: 'Estado superficial de perfiles y vidrio antes de ensamblar',
      acceptance: 'Perfiles libres de rebabas, rayas, fricción, defectos de pintura y limalla; vidrio libre de manchas y daños de manipulación.',
      rejection: 'Perfiles con rebabas, rayas o limalla visibles, o vidrio con manchas o daños de manipulación.',
      requiredAction: 'Limpiar o lijar rebabas antes de ensamblar; separar y reportar a Calidad si el defecto persiste.'
    },
    {
      id: 'ac-ens-02',
      processId: 'proc-ensamble',
      controlId: 'qc-ens-02',
      parameter: 'Funcionalidad de accesorios y rodamientos',
      acceptance: 'Tornillos, chapas, cierres y rodamientos correctamente colocados, con apertura y cierre suaves.',
      rejection: 'Accesorio faltante o mal ubicado, o rodamiento que traba la apertura/cierre.',
      requiredAction: 'Reajustar o sustituir el accesorio antes de pasar a empaque.'
    },
    {
      id: 'ac-ens-03',
      processId: 'proc-ensamble',
      controlId: 'qc-ens-03',
      parameter: 'Orientación de vidrio especial (serigrafiado, reflectivo, sandblasting)',
      acceptance: 'Grabado, reflectivo o serigrafiado ubicado hacia el interior según diseño; sin uso de agua siliconada en vidrio sandblasting.',
      rejection: 'Vidrio especial instalado con la cara tratada hacia el exterior, o limpiado con agua siliconada en sandblasting.',
      requiredAction: 'Retirar y reinstalar el vidrio en la orientación correcta.'
    },
    {
      id: 'ac-ens-04',
      processId: 'proc-ensamble',
      controlId: 'qc-ens-04',
      parameter: 'Aplicación de cinta estructural 3M VHB',
      acceptance: 'Superficies limpiadas con alcohol e imprimadas (Primer 94 en perfil, Silano AP 115 en vidrio) con 30 segundos de evaporación antes del montaje, y unión prensada con rodillo o prensa neumática a 15 psi.',
      rejection: 'Montaje de la cinta VHB sin limpieza/imprimación previa, sin tiempo de evaporación del primer, o sin presión de unión aplicada.',
      requiredAction: 'Retirar la cinta, limpiar y reprocesar aplicando correctamente primer, tiempo de evaporación y presión.'
    }
  ],
  'despachos-transporte': [
    {
      id: 'ac-dsp-01',
      processId: 'proc-despachos-transporte',
      controlId: 'qc-dsp-01',
      parameter: 'Aplicación de película de protección en ventanería',
      acceptance: 'Cinta azul cubriendo la totalidad del vidrio y la perfilería indicada en el listado de protección (exterior/interior/ambos lados), sin sobrantes, burbujas ni arrugas, sobre superficie limpia y seca.',
      rejection: 'Cinta con sobrantes sueltos, burbujas o arrugas, o zonas requeridas del listado sin cubrir.',
      requiredAction: 'Retirar y reaplicar la cinta en la zona afectada siguiendo el listado de protección del sistema.'
    },
    {
      id: 'ac-dsp-02',
      processId: 'proc-despachos-transporte',
      controlId: 'qc-dsp-02',
      parameter: 'Protección y separación de vidrio y producto en zona de despacho',
      acceptance: 'Vidrios y perfiles separados con icopor/cartón entre distintas medidas; producción nunca apoyada directamente sobre vidrio; carros de patinado sujetos por ambos lados.',
      rejection: 'Producto apilado sin separación, apoyado directamente sobre vidrio, o carros sin sujetar antes de mover.',
      requiredAction: 'Reordenar y proteger el material según el instructivo antes de continuar el despacho.'
    },
    {
      id: 'ac-trn-01',
      processId: 'proc-despachos-transporte',
      controlId: 'qc-trn-01',
      parameter: 'Aseguramiento de carga para transporte',
      acceptance: 'Materia prima embalada con zunchos, separada con cartón entre puntas de distinta medida, y con cartón sobre el material dentro del camión para amortiguar la vibración del viaje.',
      rejection: 'Material sin zunchos, sin separación entre puntas, o cargado contra las paredes del camión sin protección.',
      requiredAction: 'Re-embalar y asegurar con zunchos antes de autorizar la salida del camión.'
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
  'despachos-transporte': [
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
    },
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
    },
    {
      id: 'doc-cyp-31',
      processId: 'proc-corte-perfileria',
      title: 'Instructivo Cuidado y Manipulación de la Producción - Perfilería',
      code: 'INS-CMP-CYP',
      version: 'v2',
      status: 'vigente',
      effectiveDate: '2026-01-30',
      owner: 'Niver Metaute García - Coordinador de Control Interno',
      approvedBy: 'Víctor Bermúdez (Jefe de Producción) / Antonio Arévalo (Gerente General)',
      documentType: 'instructivo',
      contentText: `INSTRUCTIVO CUIDADO Y MANIPULACIÓN DE LA PRODUCCIÓN - PROCESO PERFILERÍA
Responsable: Coordinador de perfilería, Oficial y Auxiliar de perfilería.
Alcance: Cubre desde almacén hasta el corte de perfilería en el cuidado y manejo de la producción.
Objetivo: Estandarizar el manejo y cuidado del material en producción y del producto terminado.

BUENAS PRÁCTICAS:
1. Al manipular la perfilería, evitar que las puntas hagan contacto con los otros paquetes. Pedir ayuda a un compañero para alzar perfiles que superen 25 kg.
2. No caminar ni pisar las superficies de perfilería.
3. Abrir las cajas de perfilería con la punta del cuchillo hacia arriba, cortando por cavidades o caras no visibles para evitar rayones.
4. Si se ponen perfiles sobre el piso, descargar cuidadosamente sobre icopor; si son largos, icopor en extremos y en el medio.
5. Perfiles sobrantes de una caja tras abastecer la línea: envolver de nuevo y ubicar en su lugar para evitar fricción con otros arrumes.
6. Arrumar de acuerdo a la geometría de los paquetes: sobre la cara más ancha, en forma horizontal.
7. Ubicar correctamente la perfilería en el carro (cubículo); con distintas medidas, proteger con plástico en los extremos o zunchos y separar en cajones distintos.
8. Perfilería que supere 2.4 m no se introduce en el carro: ubicar en el suelo con icopor y evitar agrupar perfiles grandes que generen mucho peso.
9. No ubicar perfilería en zonas que obstaculicen el paso; organizar arrumes en los costados sin invadir las líneas amarillas de circulación.
10. Empacar, marcar y acomodar de forma adecuada cuando los perfiles tienen medidas diferentes, separando con cartón o plástico en extremos.
11. Garantizar que la máquina esté libre de partículas de limalla que puedan generar defectos en la perfilería.
12. Al empacar, verificar que la perfilería esté libre de limalla; limpiar con pistola de aire si es necesario.
13. Ubicar el retal según su referencia y acabado para reducir manipulación.
14-19. Empaque y embalaje: pisavidrios AOC-0019 en royos; zócalos ALE-0955/0907/0908/AOC-0031 y divisores ALE-0899/0919 con cartón intermedio; no descargar perfiles colillados sobre las puntas (arrumar sobre icopor u horizontal); referencias PER-0002 y OPT-034M empacadas según patrón definido para evitar fricción/engrafado; pasamanos con protección de cartón y papel stretch en extremos y centro.

Documento versión 2 (30/01/2026). Control de cambios: v1 creación e implementación del procedimiento (Mónica Arenas Zapata); actualización de forma en encabezado/pie de página y control de cambios (Niver Metaute García); v2 se modifica el alcance, se agrega el cargo de Coordinador del área y se mejora la redacción (Niver Metaute García).`,
      sections: [
        { title: 'Manipulación segura', content: 'Perfiles de más de 25 kg se alzan entre dos personas. Perfiles mayores a 2.4 m no van en el carro/cubículo: se ubican en el suelo sobre icopor.' },
        { title: 'Empaque de referencias específicas', content: 'Pisavidrios AOC-0019 se empacan en royos. Zócalos ALE-0955, 0907, 0908, AOC-0031 y divisores ALE-0899, 0919 se empacan con cartón en el intermedio.' }
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
    },
    {
      id: 'doc-trq-21',
      processId: 'proc-troquelado',
      title: 'Instructivo Cuidado y Manipulación de la Producción - Troquelado',
      code: 'INS-CMP-TRQ',
      version: 'v2',
      status: 'vigente',
      effectiveDate: '2026-01-30',
      owner: 'Niver Metaute García - Coordinador de Control Interno',
      approvedBy: 'Víctor Bermúdez (Jefe de Producción) / Antonio Arévalo (Gerente General)',
      documentType: 'instructivo',
      contentText: `INSTRUCTIVO CUIDADO Y MANIPULACIÓN DE LA PRODUCCIÓN - PROCESO TROQUELADO
Responsable: Auxiliar de troquelado.

BUENAS PRÁCTICAS:
1. Abrir las cajas de perfilería con la punta del cuchillo hacia arriba, cortando por cavidades o caras no visibles para evitar rayones.
2. Usar icopor o cartón cuando se arrume perfilería en el suelo, para que no se friccione.
3. Verificar que la máquina esté libre de partículas; si se encuentran desechos, limpiar con pistola de aire.
4. Inspeccionar que la máquina esté en condiciones óptimas; si hay desnivel por falta de soporte, reportar de inmediato al supervisor para reparación por mantenimiento.
5. Quitar la rebaba de los perfiles; asegurar que las cajas estén libres de rebaba antes de empacar para evitar rayones.
6. Proteger las cajas troqueladas colocando cartón en medio de los perfiles.
7. Arrumar de manera correcta en los carros de transporte, según la geometría de los perfiles, para evitar fricción.
9. Verificar que las patas-torre estén protegidas con plástico stretch, cinta o caucho.
10. Verificar que los carros patinadores estén protegidos en los extremos; si no tienen protección, informar al supervisor o mantenimiento.
11-12. Empaque y embalaje: pisavidrios AOC-0019 se empacan en arrumes cuando van verticales y en royos cuando van horizontales.
13. Sistemas 3310, 3380 y VP-OPT que requieran troquelado para recibidor de manijas importadas deben llevar protección (cartón entre cada perfil).
14. Evitar colocar perfilería colillada de forma vertical; arrumar horizontal o sobre icopor.
15. Al retirar producción parcial, sujetar la perfilería suelta con zunchos.
16. Al arrumar, ubicar primero la perfilería más grande protegiendo los extremos con plástico, y por último la más pequeña.
17. Perfilería grande o pesada se transporta al hombro entre dos compañeros.
18. Transportar la perfilería horizontalmente dentro del carro.
19. Zócalos ALE-0955/0907/0908/AOC-0031 y divisores ALE-0899/0919 se empacan con cartón en el intermedio.
20. Referencia OPT-034M se empaca según el patrón definido de acción correcta.

Documento versión 2 (30/01/2026).`,
      sections: [
        { title: 'Mantenimiento preventivo', content: 'Si la máquina presenta desnivel por falta de soporte, se reporta de inmediato al supervisor para reparación oportuna por mantenimiento — no se opera con desviaciones.' },
        { title: 'Protección de piezas troqueladas', content: 'Cajas troqueladas se protegen con cartón entre perfiles. Sistemas 3310, 3380 y VP-OPT con troquelado para recibidor de manijas importadas requieren protección adicional entre cada perfil.' }
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
    },
    {
      id: 'doc-vdt-21',
      processId: 'proc-vidrio-crudo-templado',
      title: 'Instructivo Cuidado y Manipulación de la Producción - Vidrio Crudo, Templado y Laminado',
      code: 'INS-CMP-VDT',
      version: 'v2',
      status: 'vigente',
      effectiveDate: '2026-01-30',
      owner: 'Niver Metaute García - Coordinador de Control Interno',
      approvedBy: 'Víctor Bermúdez (Jefe de Producción) / Antonio Arévalo (Gerente General)',
      documentType: 'instructivo',
      contentText: `INSTRUCTIVO CUIDADO Y MANIPULACIÓN DE LA PRODUCCIÓN - VIDRIO TEMPLADO, LAMINADO Y CRUDO
Responsables: Oficiales y auxiliares de vidrio templado, vidrio laminado y vidrio crudo.

VIDRIO TEMPLADO (VDT):
1. Separar con cartón los vidrios que presenten distintas medidas para evitar rayones.
2. Utilizar icopor al apoyar el vidrio templado sobre la pared, y tablas de madera en el suelo.
3. Verificar que los carros patinadores estén en buen estado para transportar el vidrio templado; si no lo están, no usarlos y avisar al supervisor.
4. Manipular el vidrio de a 1 unidad después de salir del horno y ubicarlo en los burros, evitando sobrepeso y caídas.
5. Al arrumar, evitar hacerlo de forma inclinada porque los vidrios pueden rayarse.
6. Sujetar los carros de patinado usando caucho alrededor del arrume.

VIDRIO LAMINADO (VLA):
1. Separar con cartón los vidrios de medidas diferentes en el mismo arrume.
2. Utilizar icopor al apoyar el vidrio sobre la pared y tablas de madera en el suelo.
3. Verificar que los carros transportadores estén en buen estado; si no, no utilizarlos y reportar al jefe inmediato.
4. Evitar arrumar los vidrios de forma inclinada para prevenir rayones.
5. Sujetar los carros de patinado con caucho alrededor del arrume.

VIDRIO CRUDO (VDC):
1. Separar con cartón los vidrios de distintas medidas para evitar rayones.
2. Utilizar icopor al apoyar el vidrio crudo sobre la pared y tablas de madera en el suelo.
3. Verificar que los carros patinadores estén en buen estado para transportar el vidrio; si no, avisar al supervisor.
5. Evitar inclinar los vidrios al momento de arrumar.
6. Limpiar las mesas de corte para evitar acumulación de partículas que generen fricción.
7. Sujetar los carros de patinado con caucho alrededor del arrume.

Documento versión 2 (30/01/2026).`,
      sections: [
        { title: 'Manipulación de vidrio recién templado', content: 'El vidrio se manipula de a 1 unidad al salir del horno antes de ubicarlo en los burros, para evitar sobrepeso y caídas.' },
        { title: 'Transporte en carros patinadores', content: 'Antes de transportar cualquier tipo de vidrio (crudo, templado o laminado), verificar que el carro esté en buen estado; si no lo está, no usarlo y reportar al supervisor o jefe inmediato.' }
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
    },
    {
      id: 'doc-pnt-22',
      processId: 'proc-pintura',
      title: 'Instructivo Cuidado y Manipulación de la Producción - Pintura',
      code: 'INS-CMP-PNT',
      version: 'v1',
      status: 'vigente',
      effectiveDate: '2026-01-30',
      owner: 'Niver Metaute García - Coordinador de Control Interno',
      approvedBy: 'Víctor Bermúdez (Jefe de Producción) / Antonio Arévalo (Gerente General)',
      documentType: 'instructivo',
      contentText: `INSTRUCTIVO CUIDADO Y MANIPULACIÓN DE LA PRODUCCIÓN - PROCESO PINTURA
Responsable: Coordinador de pintura, Oficial y Auxiliar de pintura.

BUENAS PRÁCTICAS:
1. Ubicar la perfilería en un lugar donde no sufra caídas ni fricciones después de lavar, según el espacio y la cantidad de perfiles disponible.
2. Proteger el material después de pintado, utilizando cinta stretch para garantizar una buena protección.

Documento versión 1 (30/01/2026).`,
      sections: [
        { title: 'Post-lavado', content: 'La perfilería recién lavada se ubica en un sitio que no sufra caídas ni fricciones antes de ingresar al proceso de pintura.' },
        { title: 'Post-pintado', content: 'Todo material ya pintado se protege con cinta stretch para evitar daño al acabado antes de continuar el flujo.' }
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
    },
    {
      id: 'doc-emp-13',
      processId: 'proc-empaques-felpas',
      title: 'Instructivo Cuidado y Manipulación de la Producción - Felpa y Empaque',
      code: 'INS-CMP-EMP',
      version: 'v2',
      status: 'vigente',
      effectiveDate: '2026-01-30',
      owner: 'Niver Metaute García - Coordinador de Control Interno',
      approvedBy: 'Víctor Bermúdez (Jefe de Producción) / Antonio Arévalo (Gerente General)',
      documentType: 'instructivo',
      contentText: `INSTRUCTIVO CUIDADO Y MANIPULACIÓN DE LA PRODUCCIÓN - PROCESO FELPA Y EMPAQUE
Responsable: Auxiliar de felpa y empaque.

BUENAS PRÁCTICAS:
1. Abrir las cajas de perfilería con la punta del cuchillo hacia arriba, cortando por cavidades o caras no visibles para evitar rayones.
2. Usar icopor o cartón cuando se arrume sobre el suelo, para que la perfilería no se friccione.
3. Proteger las cajas maquinadas colocando cartón en medio de los perfiles, ya que algunas cajas quedan con rebaba que ocasiona fricción.
4. Al finalizar el pegado de felpa y/o empaque, proteger con plástico los extremos de la perfilería evitando que las puntas queden expuestas.
5. Limpiar y ordenar constantemente la mesa de trabajo, evitando la acumulación de partículas que puedan friccionar el material.
6. Evitar colocar perfilería colillada de forma vertical; arrumar horizontal o sobre icopor.
7. Arrumar los perfiles más grandes al principio del arrume, en forma piramidal (de mayor a menor) para distribuir el peso.
8-9. Empaque y embalaje: pisavidrios AOC-0019 en arrumes cuando van verticales, en royos cuando van horizontales.
10. Sistemas 3310, 3380 y VP-OPT que requieran troquelado para recibidor de manijas importadas: proteger con cartón entre cada perfil.
11. Verificar que las prensas estén protegidas con cinta; si no lo están, informar al jefe inmediato.
12. Al destapar los paquetes, evitar tirarlos: destapar la perfilería con precaución para no dañarla.
13. Empacar la referencia OPT-034M según el patrón de acción correcta, para evitar fricción o engrafado.
19. Zócalos ALE-0955/0907/0908/AOC-0031 y divisores ALE-0899/0919 se empacan con cartón en el intermedio.

Documento versión 2 (30/01/2026).`,
      sections: [
        { title: 'Después del pegado de felpa/empaque', content: 'Proteger inmediatamente con plástico los extremos de la perfilería para que las puntas no queden expuestas a fricción.' },
        { title: 'Estado de prensas y herramientas', content: 'Las prensas deben permanecer protegidas con cinta; si se detecta una sin protección, se informa de inmediato al jefe inmediato antes de continuar usándola.' }
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
    },
    {
      id: 'doc-ens-32',
      processId: 'proc-ensamble',
      title: 'Instructivo Cuidado y Manipulación de la Producción - Ensamble',
      code: 'INS-CMP-ENS',
      version: 'v2',
      status: 'vigente',
      effectiveDate: '2026-01-30',
      owner: 'Niver Metaute García - Coordinador de Control Interno',
      approvedBy: 'Víctor Bermúdez (Jefe de Producción) / Antonio Arévalo (Gerente General)',
      documentType: 'instructivo',
      contentText: `INSTRUCTIVO CUIDADO Y MANIPULACIÓN DE LA PRODUCCIÓN - PROCESO ENSAMBLE
Responsable: Oficial y auxiliar de ensamble.
Alcance: Cumplir con los parámetros establecidos para darle una buena gestión al material que sale de la empresa hasta llegar al cliente final.

BUENAS PRÁCTICAS:
1. Separar con icopor y/o cartón los arrumes de material de distinta medida para evitar fricciones.
2. Proteger todo tipo de material con una correcta protección cuando se vaya a ubicar en el suelo.
3. No recostar producción sobre los vidrios, para evitar quebrarlos.
4. No ubicar producto terminado sobre producto en proceso; mantenerlos separados para no generar confusiones.
5. Arrumar la producción de forma intercalada, de manera que enganches, traslapes y/o accesorios (chapas, manijas, pivotes) queden intercalados.
6. Proteger los vidrios con icopor o cartón en las puntas cuando presenten diferentes medidas.
7. Mantener libre la zona de circulación para que los patinadores se desplacen sin tropiezos que afecten la producción.
8. Evitar colocar perfilería colillada de forma vertical; arrumar horizontal o sobre icopor.
9. No colocar producción sobre las paredes sin protección; usar cartón o icopor.
10. Limpiar y ordenar el puesto de trabajo, libre de limalla, tornillos y brocas sueltas.
11. Arrumar el producto en proceso de manera ordenada, aprovechando su geometría para reducir la fricción entre piezas.
12. Colocar zunchos de sujeción en los fijos (vertical y horizontal, según aplique, en ventanas corredizas): fijos ≥ 2500 mm de longitud llevan zuncho horizontal; fijos ≥ 1200 mm de altura llevan zuncho vertical; si cumple ambas condiciones, se colocan ambos zunchos cruzados. Esto evita el desprendimiento de los perfiles ensamblados durante la manipulación en el transporte.
13. Empacar todo tipo de pasamanos con protección de cartón y papel stretch en sus extremos y en el medio, para evitar fricción que afecte la estética y/o el acabado de recubrimiento.

Documento versión 2 (30/01/2026).`,
      sections: [
        { title: 'Zunchos de sujeción en ventanas corredizas', content: 'Fijos ≥ 2500 mm de longitud: zuncho horizontal. Fijos ≥ 1200 mm de altura: zuncho vertical. Si cumple ambas medidas, se colocan ambos zunchos cruzados — evita el desprendimiento de perfiles ensamblados durante el transporte.' },
        { title: 'Separación de vidrios y producto', content: 'Nunca recostar producción sobre vidrios (riesgo de quiebre). Producto terminado y producto en proceso se mantienen separados para evitar confusiones.' }
      ]
    }
  ],
  'despachos-transporte': [
    {
      id: 'doc-dsp-20',
      processId: 'proc-despachos-transporte',
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
    },
    {
      id: 'doc-dsp-21',
      processId: 'proc-despachos',
      title: 'Instructivo Cuidado y Manipulación de la Producción - Despachos',
      code: 'INS-CMP-DSP',
      version: 'v2',
      status: 'vigente',
      effectiveDate: '2026-01-30',
      owner: 'Niver Metaute García - Coordinador de Control Interno',
      approvedBy: 'Víctor Bermúdez (Jefe de Producción) / Antonio Arévalo (Gerente General)',
      documentType: 'instructivo',
      contentText: `INSTRUCTIVO CUIDADO Y MANIPULACIÓN DE LA PRODUCCIÓN - PROCESO DESPACHOS
Responsables: Auxiliares de despachos, asistente de abastecimiento, auxiliares de abastecimiento.

BUENAS PRÁCTICAS:
1. Separar con icopor y/o cartón los arrumes de distinta medida cuando se ubiquen sobre el suelo, para evitar deterioro del producto.
2. No poner ventanas ni puertas (pequeñas o grandes) sobre otro vidrio; al descargar producción sobre soportes, verificar que no sea contra un vidrio para evitar daños por sobrepeso.
3. Proteger los vidrios de diferentes medidas con icopor y/o cartón.
4. Mantener libre la zona de circulación para evitar caídas que puedan ocasionar rupturas o imperfectos.
5. Proteger el producto antes de despachar (cinta adhesiva de protección) para evitar rayones en vidrio y perfiles.
6. No arrumar producto directamente sobre paredes u otras superficies sin protegerlo con cartón o icopor.
7. Al ingresar material al camión, colocar cartón encima para evitar rayones o rupturas por vibración durante el viaje.
8. Sujetar la producción a ambos lados de los carros de patinado, para evitar caídas y daños.
9. Ubicar el PRODUCTO NO CONFORME en su sitio indicado; si se encuentra en un lugar indebido, reubicarlo con cuidado en la zona asignada.
10. Arrumar la producción de forma intercalada, de manera que enganches, traslapes y/o accesorios queden intercalados.
11. Si el destino es fuera de Medellín, proteger el suelo y las paredes del camión con cartón, esquineros y/o icopor para separar la producción.
12. Empacar y sujetar correctamente la materia prima para su transporte: embalar según geometría, proteger con cartón las puntas de perfiles de distintas medidas para evitar roce, y asegurar con zunchos para evitar accidentes por caída durante el transporte.

Documento versión 2 (30/01/2026).`,
      sections: [
        { title: 'Producto no conforme', content: 'Todo producto no conforme se ubica en su sitio indicado — nunca se despacha ni se deja en un lugar indebido, para asegurar trazabilidad y evitar despachos erróneos.' },
        { title: 'Despachos fuera de Medellín', content: 'Cuando el destino es fuera de Medellín se refuerza la protección: suelo y paredes del camión cubiertos con cartón, esquineros y/o icopor para separar la producción durante trayectos más largos.' }
      ]
    },
    {
      id: 'doc-trn-11',
      processId: 'proc-despachos-transporte',
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
