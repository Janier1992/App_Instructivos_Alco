import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MetrologyDelivery } from './metrologyDeliveriesStore';
import { BRAND_COLOR, DARK, LIGHT_BG, loadLogoDataUrl, addPdfHeader, addPdfSectionLabel, addPdfInfoGrid, addPdfSignature } from './metrologyPdfHelpers';

/** Exporta un acta de entrega de Metrología Pro a PDF — se genera en el navegador, no requiere sesión del CRM. */
export async function exportMetrologyDeliveryToPDF(record: MetrologyDelivery): Promise<void> {
  const logoDataUrl = await loadLogoDataUrl();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  addPdfHeader(doc, 'ACTA DE ENTREGA DE EQUIPOS', 'Gestión de Herramientas y Activos · Metrología Pro', record.id.slice(0, 8).toUpperCase(), logoDataUrl);

  let y = 52;
  y = addPdfSectionLabel(doc, '1. Datos Generales', y);
  y = addPdfInfoGrid(doc, [
    { label: 'Fecha', value: record.fecha },
    { label: 'Área', value: record.area },
    { label: 'Sede', value: record.sede }
  ], y, 3);

  y += 4;
  y = addPdfSectionLabel(doc, '2. Datos del Receptor', y);
  y = addPdfInfoGrid(doc, [
    { label: 'Nombre y Apellidos', value: record.receptorNombre },
    { label: 'Cédula', value: record.receptorCedula },
    { label: 'Cargo', value: record.receptorCargo || '' }
  ], y, 3);

  y += 4;
  y = addPdfSectionLabel(doc, '3. Equipos / Herramientas Entregadas', y);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Equipo / Herramienta', 'Marca', 'Cant.', 'Observaciones']],
    body: record.items.map((item, i) => {
      const nameWithDetails = [
        item.equipoNombre,
        item.codigo ? `(Cód: ${item.codigo})` : '',
        item.longitud ? `[Long: ${item.longitud}]` : ''
      ].filter(Boolean).join(' ');
      return [String(i + 1), nameWithDetails, item.marca, String(item.cantidad), item.observaciones];
    }),
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 3, font: 'helvetica', textColor: DARK },
    headStyles: { fillColor: BRAND_COLOR, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: LIGHT_BG },
    columnStyles: { 0: { cellWidth: 8 }, 3: { cellWidth: 12, halign: 'center' } },
    margin: { left: 14, right: 14 }
  });

  y = (doc as any).lastAutoTable.finalY + 10;
  if (y > 230) { doc.addPage(); y = 20; }

  y = addPdfSectionLabel(doc, '4. Firmas del Acta', y);
  const pageW = doc.internal.pageSize.getWidth();
  const sigW = (pageW - 28 - 10) / 2;
  addPdfSignature(doc, 'Firma quien entrega (Gestor SGC)', record.firmaEntrega, 14, y, sigW);
  addPdfSignature(doc, 'Firma quien recibe (Colaborador)', record.firmaRecibe, 14 + sigW + 10, y, sigW);

  doc.save(`Acta-Entrega-${record.receptorNombre.replace(/\s+/g, '-')}-${record.fecha}.pdf`);
}
