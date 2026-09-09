import jsPDF from 'jspdf';
import { MetrologyReplacement } from './metrologyReplacementsStore';
import { loadLogoDataUrl, addPdfHeader, addPdfSectionLabel, addPdfInfoGrid, addPdfSignature } from './metrologyPdfHelpers';

/** Exporta un registro de Reposición y Baja de Metrología Pro a PDF — se genera en el navegador, no requiere sesión del CRM. */
export async function exportMetrologyReplacementToPDF(record: MetrologyReplacement): Promise<void> {
  const logoDataUrl = await loadLogoDataUrl();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  addPdfHeader(doc, 'ACTA DE BAJA Y REPOSICIÓN DE EQUIPO', 'Gestión del Ciclo de Vida de Activos · Metrología Pro', record.id.slice(0, 8).toUpperCase(), logoDataUrl);

  let y = 52;
  y = addPdfSectionLabel(doc, '1. Datos del Registro', y);
  y = addPdfInfoGrid(doc, [
    { label: 'Fecha', value: record.fechaRegistro },
    { label: 'Área de Uso', value: record.areaUso },
    { label: 'Se Cobra Equipo', value: record.seCobraEquipo },
    { label: 'Devuelve Equipo Anterior', value: record.devuelveEquipoAnterior }
  ], y, 3);

  y += 4;
  y = addPdfSectionLabel(doc, '2. Equipo Dado de Baja', y);
  y = addPdfInfoGrid(doc, [
    { label: 'Nombre del Equipo', value: record.nombreEquipo },
    { label: 'Marca', value: record.marca || '' },
    { label: 'Código', value: record.codigo }
  ], y, 3);

  y += 4;
  y = addPdfSectionLabel(doc, '3. Motivo y Descripción', y);
  y = addPdfInfoGrid(doc, [
    { label: 'Motivo de Reposición', value: record.motivoReposicion },
    { label: 'Descripción de la Baja', value: record.descripcionBaja || '' }
  ], y, 2);

  y += 4;
  y = addPdfSectionLabel(doc, '4. Responsables', y);
  y = addPdfInfoGrid(doc, [
    { label: 'Responsable Proceso / Área', value: record.nombreResponsable },
    { label: 'Responsable Calidad', value: record.nombreResponsableCalidad || '' }
  ], y, 2);

  y += 4;
  if (y > 220) { doc.addPage(); y = 20; }
  y = addPdfSectionLabel(doc, '5. Firmas del Acta', y);

  const sigW = (pageW - 36) / 2;
  addPdfSignature(doc, 'Firma Responsable Proceso/Área', record.firmaResponsableArea, 14, y, sigW);
  addPdfSignature(doc, 'Firma Responsable Calidad', record.firmaResponsableCalidad, 14 + sigW + 8, y, sigW);

  doc.save(`Acta-Baja-Reposicion-${record.nombreEquipo.replace(/\s+/g, '-')}-${record.fechaRegistro}.pdf`);
}
