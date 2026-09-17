/**
 * Criterios de aceptación y rechazo de defectos en vidrio — NTC 1909:2023
 * (tercera actualización), vidrio plano flotado transparente Tipo I,
 * Clase 1 y 2, adopción modificada de ASTM C1036-21.
 *
 * Transcripción del cuadro de referencia rápida entregado por Calidad para
 * el proceso de Vidrio Crudo y Templado (Tablas 3, 5, 6, 7 y 8; numerales
 * 5.1.1 a 5.1.5 y 6.1.1 a 6.1.2 de la norma). No reemplaza la consulta
 * directa de la norma completa.
 */

export type GlassCriteriaStatus = 'permitido' | 'condicional' | 'rechazado';

export interface GlassCriteriaCell {
  status: GlassCriteriaStatus;
  text: string;
}

export interface GlassCriteriaRow {
  characteristic: string;
  note?: string;
  q1: GlassCriteriaCell;
  q2: GlassCriteriaCell;
  q3: GlassCriteriaCell;
  q4: GlassCriteriaCell;
}

export interface GlassCriteriaSection {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  columnHeader: string;
  rows: GlassCriteriaRow[];
  footnote: string;
}

export const GLASS_QUALITY_TIERS = [
  { code: 'Q1', title: 'Calidad Q1', description: 'Fabricación de espejos de alta calidad' },
  { code: 'Q2', title: 'Calidad Q2', description: 'Espejos de uso general y otras aplicaciones' },
  { code: 'Q3', title: 'Calidad Q3', description: 'Vidrio arquitectónico: recubiertos, templados, laminados y selectos' },
  { code: 'Q4', title: 'Calidad Q4', description: 'Aplicaciones de vidriado en general' }
] as const;

export const GLASS_CRITERIA_LEGEND = [
  { status: 'permitido' as const, label: 'Permitido (sin restricción)' },
  { status: 'condicional' as const, label: 'Permitido con separación mínima entre defectos' },
  { status: 'rechazado' as const, label: 'No se permite (rechazo)' }
];

export const GLASS_CRITERIA_INSPECTION_NOTE = 'Inspección visual: iluminación difusa 1700–2500 lux, visión 20/20, según numeral 6.1.1';

export const GLASS_CRITERIA_SOURCE =
  'NTC 1909:2023 "Vidrio. Vidrio plano flotado. Vidrio plano impreso (grabado). Vidrio plano armado (alambrado)", ICONTEC, tercera actualización 2023-01-24 (Tablas 3, 5, 6, 7 y 8; numerales 5.1.1 a 5.1.5 y 6.1.1 a 6.1.2). Cuadro de referencia rápida para inspección de calidad — no reemplaza la consulta directa de la norma completa.';

export const GLASS_CRITERIA_SECTIONS: GlassCriteriaSection[] = [
  {
    id: 'desportillado-bordes',
    number: 1,
    title: 'Desportillado en bordes',
    subtitle: 'observado a 30 cm sin aumento (numeral 5.1.1)',
    columnHeader: 'Característica',
    rows: [
      {
        characteristic: 'Desportillado en concha — Profundidad',
        q1: { status: 'condicional', text: '≤ 25 % del espesor' },
        q2: { status: 'condicional', text: '≤ 50 % del espesor' },
        q3: { status: 'condicional', text: '≤ 50 % del espesor' },
        q4: { status: 'permitido', text: '≤ 50 % del espesor' }
      },
      {
        characteristic: 'Desportillado en concha — Ancho',
        q1: { status: 'condicional', text: '≤ 25 % espesor ó 1,6 mm (el mayor)' },
        q2: { status: 'condicional', text: '≤ 50 % espesor ó 1,6 mm (el mayor)' },
        q3: { status: 'condicional', text: '≤ espesor ó 6 mm (el mayor)' },
        q4: { status: 'permitido', text: 'Sin límite' }
      },
      {
        characteristic: 'Desportillado en concha — Longitud',
        q1: { status: 'condicional', text: '≤ 2× el ancho del desportillado' },
        q2: { status: 'condicional', text: '≤ 2× el ancho del desportillado' },
        q3: { status: 'condicional', text: '≤ 2× el ancho del desportillado' },
        q4: { status: 'permitido', text: 'Sin límite' }
      },
      {
        characteristic: 'Desportillado en V (ángulo agudo, riesgo de grieta)',
        q1: { status: 'rechazado', text: 'No se permite visible' },
        q2: { status: 'rechazado', text: 'No se permite visible' },
        q3: { status: 'rechazado', text: 'No se permite visible' },
        q4: { status: 'rechazado', text: 'No se permite visible' }
      }
    ],
    footnote:
      'Se permite el desportillado en concha siempre que no existan grietas asociadas detectables sin aumento desde el borde (numeral 5.1.1.1). Ancho/longitud no aplican a láminas estándar de fábrica. Ver Tabla 3 de la norma.'
  },
  {
    id: 'defectos-puntuales',
    number: 2,
    title: 'Defectos puntuales — inclusiones gaseosas, piedras, nudos, nubes, suciedad',
    subtitle: 'detección a 1 m, según tamaño promedio (largo + ancho)/2 — numeral 6.1.1.1',
    columnHeader: 'Tamaño del defecto',
    rows: [
      {
        characteristic: '< 0,50 mm',
        q1: { status: 'permitido', text: 'Permitido' },
        q2: { status: 'permitido', text: 'Permitido' },
        q3: { status: 'permitido', text: 'Permitido' },
        q4: { status: 'permitido', text: 'Permitido' }
      },
      {
        characteristic: '0,50 – 0,80 mm',
        q1: { status: 'condicional', text: 'Sep. mín. 1500 mm' },
        q2: { status: 'condicional', text: 'Sep. mín. 600 mm' },
        q3: { status: 'permitido', text: 'Permitido' },
        q4: { status: 'permitido', text: 'Permitido' }
      },
      {
        characteristic: '0,80 – 1,20 mm',
        q1: { status: 'rechazado', text: 'No se permite' },
        q2: { status: 'condicional', text: 'Sep. mín. 1200 mm' },
        q3: { status: 'permitido', text: 'Permitido' },
        q4: { status: 'permitido', text: 'Permitido' }
      },
      {
        characteristic: '1,20 – 1,50 mm',
        q1: { status: 'rechazado', text: 'No se permite' },
        q2: { status: 'condicional', text: 'Sep. mín. 1500 mm' },
        q3: { status: 'condicional', text: 'Sep. mín. 600 mm' },
        q4: { status: 'permitido', text: 'Permitido' }
      },
      {
        characteristic: '1,50 – 2,00 mm',
        q1: { status: 'rechazado', text: 'No se permite' },
        q2: { status: 'rechazado', text: 'No se permite' },
        q3: { status: 'condicional', text: 'Sep. mín. 600 mm' },
        q4: { status: 'permitido', text: 'Permitido' }
      },
      {
        characteristic: '2,00 – 2,50 mm',
        q1: { status: 'rechazado', text: 'No se permite' },
        q2: { status: 'rechazado', text: 'No se permite' },
        q3: { status: 'rechazado', text: 'No se permite' },
        q4: { status: 'condicional', text: 'Sep. mín. 600 mm' }
      },
      {
        characteristic: '≥ 2,50 mm',
        q1: { status: 'rechazado', text: 'No se permite' },
        q2: { status: 'rechazado', text: 'No se permite' },
        q3: { status: 'rechazado', text: 'No se permite' },
        q4: { status: 'rechazado', text: 'No se permite' }
      }
    ],
    footnote:
      'Válido para espesores ≤ 6,0 mm (para 6,0–12,0 mm se admiten defectos proporcionalmente mayores a igual separación). En Q1 y Q2 el tamaño incluye la distorsión asociada. Además, la lámina estándar de fábrica admite 1 a 3 defectos puntuales rechazables adicionales según su área (<7 m²: 1 · 7–14 m²: 2 · ≥14 m²: 3). Ver Tablas 5 y 6 de la norma.'
  },
  {
    id: 'defectos-lineales',
    number: 3,
    title: 'Defectos lineales — rasguños, frotes, cavaduras',
    subtitle: 'detección progresiva desde 3,3 m hasta < 0,2 m según intensidad — numeral 6.1.1.3',
    columnHeader: 'Intensidad y longitud del defecto',
    rows: [
      {
        characteristic: 'Tenue ≤ 75 mm',
        note: 'visible < 0,2 m',
        q1: { status: 'condicional', text: 'Sep. mín. 1500 mm' },
        q2: { status: 'condicional', text: 'Sep. mín. 1200 mm' },
        q3: { status: 'permitido', text: 'Permitido' },
        q4: { status: 'permitido', text: 'Permitido' }
      },
      {
        characteristic: 'Tenue > 75 mm',
        q1: { status: 'rechazado', text: 'No se permite' },
        q2: { status: 'rechazado', text: 'No se permite' },
        q3: { status: 'permitido', text: 'Permitido' },
        q4: { status: 'permitido', text: 'Permitido' }
      },
      {
        characteristic: 'Ligera ≤ 75 mm',
        note: 'visible a 0,2 m',
        q1: { status: 'rechazado', text: 'No se permite' },
        q2: { status: 'condicional', text: 'Sep. mín. 1200 mm' },
        q3: { status: 'permitido', text: 'Permitido' },
        q4: { status: 'permitido', text: 'Permitido' }
      },
      {
        characteristic: 'Ligera > 75 mm',
        q1: { status: 'rechazado', text: 'No se permite' },
        q2: { status: 'rechazado', text: 'No se permite' },
        q3: { status: 'permitido', text: 'Permitido' },
        q4: { status: 'permitido', text: 'Permitido' }
      },
      {
        characteristic: 'Media ≤ 75 mm',
        note: 'visible a 1 m',
        q1: { status: 'rechazado', text: 'No se permite' },
        q2: { status: 'rechazado', text: 'No se permite' },
        q3: { status: 'condicional', text: 'Sep. mín. 600 mm' },
        q4: { status: 'permitido', text: 'Permitido' }
      },
      {
        characteristic: 'Media > 75 mm',
        q1: { status: 'rechazado', text: 'No se permite' },
        q2: { status: 'rechazado', text: 'No se permite' },
        q3: { status: 'rechazado', text: 'No se permite' },
        q4: { status: 'permitido', text: 'Permitido' }
      },
      {
        characteristic: 'Alta ≤ 150 mm',
        note: 'visible a 3,3 m',
        q1: { status: 'rechazado', text: 'No se permite' },
        q2: { status: 'rechazado', text: 'No se permite' },
        q3: { status: 'rechazado', text: 'No se permite' },
        q4: { status: 'condicional', text: 'Sep. mín. 600 mm' }
      },
      {
        characteristic: 'Alta > 150 mm',
        q1: { status: 'rechazado', text: 'No se permite' },
        q2: { status: 'rechazado', text: 'No se permite' },
        q3: { status: 'rechazado', text: 'No se permite' },
        q4: { status: 'rechazado', text: 'No se permite' }
      }
    ],
    footnote:
      'Intensidad según distancia de detección (Tabla 12): Alta = 3,3 m · Media = 1 m · Ligera = 0,2 m · Tenue = < 0,2 m. Ver Tabla 7 de la norma.'
  },
  {
    id: 'distorsion',
    number: 4,
    title: 'Distorsión (resmas, cuerdas, líneas)',
    subtitle: 'ángulo mínimo de interferencia de visión antes de que aparezca distorsión — numeral 6.1.2',
    columnHeader: 'Requisito',
    rows: [
      {
        characteristic: 'Ángulo de interferencia de visión permitido',
        q1: { status: 'permitido', text: '≥ 60°' },
        q2: { status: 'permitido', text: '≥ 50°' },
        q3: { status: 'permitido', text: '≥ 35°' },
        q4: { status: 'permitido', text: '≥ 25°' }
      }
    ],
    footnote:
      'A menor ángulo admitido, mayor distorsión tolerada. Medido rotando la muestra frente a un tablero de cebra a 4,5 m (Figura 2). Ver Tabla 8 de la norma.'
  }
];
