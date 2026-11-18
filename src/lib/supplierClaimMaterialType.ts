/**
 * Tipo de material de un informe de reclamo a proveedor. Define los rótulos del
 * formulario y del documento, y el enfoque con el que la IA redacta el texto
 * (no es lo mismo una novedad en un perfil de aluminio que en un accesorio o
 * en un insumo como la silicona).
 */

export type SupplierClaimMaterialType = 'materia_prima' | 'accesorio' | 'insumo';

export const DEFAULT_MATERIAL_TYPE: SupplierClaimMaterialType = 'materia_prima';

interface MaterialTypeConfig {
  /** Nombre corto para botones y listas. */
  label: string;
  /** Ayuda corta bajo el selector del formulario. */
  hint: string;
  /** Rótulo del campo de material en el formulario. */
  fieldLabel: string;
  placeholder: string;
  /** Rótulo de la fila del encabezado del informe (Word y PDF). */
  infoLabel: string;
  /** Cómo se nombra el material en los textos de respaldo. */
  noun: string;
  /** Título de la columna de cantidad en la tabla de unidades rechazadas. */
  quantityHeader: string;
  intro: string;
  /** Enfoque de inspección que se le indica a la IA. */
  aiFocus: string;
  /** Ejemplos de observaciones técnicas propias de este tipo de material. */
  aiObservations: string;
  /** Cómo se plantean las tres acciones correctivas para este tipo de material. */
  aiActions: string;
}

export const MATERIAL_TYPES: Record<SupplierClaimMaterialType, MaterialTypeConfig> = {
  materia_prima: {
    label: 'Materia prima',
    hint: 'Aluminio, vidrio u otro material base de fabricación.',
    fieldLabel: 'Materia prima (aluminio, vidrio...) *',
    placeholder: 'Ej: ALUMINIO, Perfil Ángulo',
    infoLabel: 'MATERIA PRIMA:',
    noun: 'materia prima',
    quantityHeader: 'Cantidad de perfiles',
    intro:
      'En el presente informe se detallan las condiciones observadas durante el proceso de recepción de materias primas, con el fin de documentar posibles incidencias y contribuir al cumplimiento de los estándares de calidad establecidos por ALCO S.A.S.',
    aiFocus:
      'Es materia prima (por ejemplo perfiles de aluminio o vidrio). Enfoca la novedad en defectos de fabricación del material: extrusión, superficie y acabado (anodizado, pintura, crudo), dimensiones, rectitud, escuadra, y en vidrio rayones, burbujas, bordes o manchas. Aclara cómo afecta el proceso posterior de corte, ensamble o instalación.',
    aiObservations: 'visibilidad a distancia, extensión del defecto en el perfil o la lámina, posible origen en el proceso de fabricación, evidencia fotográfica adjunta',
    aiActions:
      'análisis de la causa en el proceso de fabricación (extrusión, tratamiento superficial, corte o embalaje); control de calidad en origen mediante inspección previa al despacho; reposición del material rechazado en las referencias y cantidades indicadas.'
  },
  accesorio: {
    label: 'Accesorio',
    hint: 'Herrajes, rodamientos, cierres, manijas y otros componentes.',
    fieldLabel: 'Accesorio *',
    placeholder: 'Ej: Rodamiento, Cierre, Manija, Escuadra',
    infoLabel: 'ACCESORIO:',
    noun: 'accesorio',
    quantityHeader: 'Cantidad de unidades',
    intro:
      'En el presente informe se detallan las condiciones observadas durante la recepción e inspección de accesorios, con el fin de documentar posibles no conformidades y contribuir al cumplimiento de los estándares de calidad establecidos por ALCO S.A.S.',
    aiFocus:
      'Es un accesorio (herraje, componente de ensamble o funcional). Enfoca la novedad en ajuste y compatibilidad con el perfil o sistema, funcionamiento, holguras, resistencia, acabado o recubrimiento, corrosión, referencia o color distintos al solicitado, piezas incompletas o empaque inadecuado. Aclara cómo afecta el ensamble, la operación de la ventana o puerta o la experiencia del cliente final.',
    aiObservations: 'ajuste o funcionamiento observado, cantidad de piezas con la novedad frente al total revisado, posible origen en la fabricación o el empaque, evidencia fotográfica adjunta',
    aiActions:
      'análisis de la causa en la fabricación o el empaque del accesorio; control de calidad en origen con verificación funcional y dimensional previa al despacho; reposición o cambio de las unidades rechazadas en las referencias y cantidades indicadas.'
  },
  insumo: {
    label: 'Insumo',
    hint: 'Siliconas, empaques, cintas, tornillería y otros consumibles.',
    fieldLabel: 'Insumo *',
    placeholder: 'Ej: Silicona estructural, Cinta, Tornillería',
    infoLabel: 'INSUMO:',
    noun: 'insumo',
    quantityHeader: 'Cantidad de unidades',
    intro:
      'En el presente informe se detallan las condiciones observadas durante la recepción e inspección de insumos, con el fin de documentar posibles no conformidades y contribuir al cumplimiento de los estándares de calidad establecidos por ALCO S.A.S.',
    aiFocus:
      'Es un insumo o consumible (silicona, empaque, cinta, tornillería y similares). Enfoca la novedad en la conformidad con la especificación: referencia o color distintos al pedido, fecha de vencimiento o lote, estado del producto (curado, adherencia, consistencia, oxidación), medidas o rosca, empaque dañado, cantidad recibida distinta a la facturada. Aclara cómo afecta el proceso de producción o la durabilidad del producto terminado.',
    aiObservations: 'condición del producto o del empaque, lote y fecha de vencimiento si constan, extensión de la novedad en el lote recibido, evidencia fotográfica adjunta',
    aiActions:
      'análisis de la causa en la fabricación, el almacenamiento o el transporte del insumo; control de calidad en origen con verificación de especificación y fechas previa al despacho; reposición o cambio del insumo rechazado en las referencias y cantidades indicadas.'
  }
};

export const MATERIAL_TYPE_ORDER: SupplierClaimMaterialType[] = ['materia_prima', 'accesorio', 'insumo'];

/** Valor válido a partir de cualquier dato (informes antiguos o entradas externas): por defecto, materia prima. */
export function normalizeMaterialType(value: unknown): SupplierClaimMaterialType {
  return typeof value === 'string' && value in MATERIAL_TYPES ? (value as SupplierClaimMaterialType) : DEFAULT_MATERIAL_TYPE;
}
