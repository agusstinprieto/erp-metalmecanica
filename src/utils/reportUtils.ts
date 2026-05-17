import type { jsPDF as jsPDFType } from 'jspdf';
import { eventBus } from './eventBus';

// Dynamically gets company brand info from localStorage (Rule 16)
function getBrandConfig() {
  try {
    const saved = localStorage.getItem('mcvill-config');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error reading brand config', e);
  }
  return {
    brandName: 'METALMECÁNICA',
    companyName: 'ERP Industrial',
    systemName: 'ERP',
  };
}

// Lazily loads jsPDF + autotable — only downloaded when user triggers an export
async function loadPDF() {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  return { jsPDF, autoTable };
}

// ── Colores corporativos — dinámicos según el tema activo del usuario ─────────
const SLATE_900  = [15,  23,  42]  as [number, number, number];
const SLATE_400  = [148, 163, 184] as [number, number, number];
const WHITE      = [255, 255, 255] as [number, number, number];

// Paleta de temas: [header_dark, header_mid]
const THEME_PALETTE: Record<string, [[number,number,number],[number,number,number]]> = {
  blue:    [[26,  74,  138], [37,  99,  235]],
  emerald: [[5,   78,  52 ], [16,  185, 129]],
  carbon:  [[15,  23,  42 ], [51,  65,  85 ]],
  slate:   [[30,  41,  59 ], [71,  85,  105]],
  violet:  [[46,  16,  101], [109, 40,  217]],
  rose:    [[136, 19,  55 ], [225, 29,  72 ]],
};

function getThemeColors(): { dark: [number,number,number]; mid: [number,number,number] } {
  try {
    const saved = localStorage.getItem('mcvill-config');
    const cfg = saved ? JSON.parse(saved) : {};
    const [dark, mid] = THEME_PALETTE[cfg.themeName as string] ?? THEME_PALETTE.blue;
    return { dark, mid };
  } catch {
    return { dark: THEME_PALETTE.blue[0], mid: THEME_PALETTE.blue[1] };
  }
}

// ── Carga del logo (cacheado en módulo) ──────────────────────────────────────
let _logoBase64: string | null = null;

async function loadLogo(): Promise<string | null> {
  if (_logoBase64) return _logoBase64;
  try {
    const res = await fetch('/mcvill-logo.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        _logoBase64 = reader.result as string;
        resolve(_logoBase64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ── Notificación de progreso ─────────────────────────────────────────────────
function notifyProgress(msg: string) {
  eventBus.emit('SHOW_NOTIFICATION', {
    type: 'info',
    title: 'Generando reporte',
    message: msg,
  });
}
function notifyError(msg: string) {
  eventBus.emit('SHOW_NOTIFICATION', {
    type: 'error',
    title: 'Error PDF',
    message: msg,
  });
}

// ── Helper: encabezado estándar McVill ───────────────────────────────────────
async function drawHeader(
  doc: jsPDFType,
  title: string,
  subtitle: string,
  logo: string | null,
): Promise<number> {
  const pageW = doc.internal.pageSize.getWidth();

  // Barra de encabezado con el color del tema activo del usuario
  const { dark: BLUE_DARK, mid: BLUE_MID } = getThemeColors();
  doc.setFillColor(...BLUE_DARK);
  doc.rect(0, 0, pageW, 32, 'F');

  // Logo (si cargó)
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 10, 4, 36, 24);
    } catch { /* logo inválido — omitir */ }
  }

  // Nombre empresa
  const textX = logo ? 52 : 14;
  const brand = getBrandConfig();
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(brand.companyName || 'ERP Industrial', textX, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(147, 197, 253); // azul claro
  doc.text(`${brand.brandName || 'METALMECÁNICA'} • Sistema ${brand.systemName || 'ERP'}`, textX, 21);

  // Fecha y reporte ID en la derecha
  const now  = new Date();
  const fecha = now.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  const hora  = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  doc.setTextColor(...WHITE);
  doc.setFontSize(7);
  doc.text(fecha, pageW - 10, 14, { align: 'right' });
  doc.text(hora,  pageW - 10, 20, { align: 'right' });

  // Barra del título del reporte (azul medio)
  doc.setFillColor(...BLUE_MID);
  doc.rect(0, 32, pageW, 14, 'F');

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(title.toUpperCase(), 10, 41);

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(191, 219, 254);
    doc.text(subtitle, pageW - 10, 41, { align: 'right' });
  }

  return 54; // Y donde empieza el contenido
}

// ── Helper: pies de página ───────────────────────────────────────────────────
function drawFooters(doc: jsPDFType) {
  const pageCount = (doc.internal as any).getNumberOfPages();
  const pageW     = doc.internal.pageSize.getWidth();
  const pageH     = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BLUE_MID);
    doc.setLineWidth(0.3);
    doc.line(10, pageH - 12, pageW - 10, pageH - 12);

    const brand = getBrandConfig();
    doc.setFontSize(7);
    doc.setTextColor(...SLATE_400);
    doc.setFont('helvetica', 'normal');
    doc.text(`${brand.companyName || 'ERP Industrial'}  •  Documento de Uso Interno Confidencial`, 10, pageH - 7);
    doc.text(`Página ${i} de ${pageCount}`, pageW - 10, pageH - 7, { align: 'right' });
  }
}

// ── Exporta CSV ───────────────────────────────────────────────────────────────
function exportToCSV(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows    = data.map(obj =>
    Object.values(obj)
      .map(val => `"${String(val).replace(/"/g, '""')}"`)
      .join(',')
  );
  const csv  = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href     = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ── Exporta PDF genérico (tabla de datos) ─────────────────────────────────────
async function exportToPDF(
  title: string,
  data: any[],
  filename: string,
  area: string = 'CORPORATIVO',
) {
  if (!data.length) {
    notifyError('No hay datos para generar el reporte.');
    return;
  }

  notifyProgress(`Compilando ${filename}...`);

  try {
    const [logo, { jsPDF, autoTable }] = await Promise.all([loadLogo(), loadPDF()]);
    const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

    const startY = await drawHeader(doc, title, area, logo);

    // Tabla de datos
    const headers = Object.keys(data[0]);
    const body    = data.map(row => headers.map(h => String(row[h] ?? '')));

    autoTable(doc, {
      startY,
      head: [headers.map(h => h.toUpperCase().replace(/_/g, ' '))],
      body,
      theme: 'grid',
      headStyles: {
        fillColor: BLUE_MID,
        textColor: WHITE,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 7.5,
        cellPadding: 3,
        textColor: SLATE_900,
      },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      margin: { left: 10, right: 10 },
    });

    drawFooters(doc);
    doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);

  } catch (err) {
    console.error('PDF Error:', err);
    notifyError('Error al generar el PDF. Revisa la consola.');
  }
}

// ── API pública ───────────────────────────────────────────────────────────────
export const reportUtils = {
  exportToCSV,
  exportToPDF,
  /** Helpers para reportes personalizados — cargan jsPDF bajo demanda */
  loadLogo,
  drawHeader,
  drawFooters,
  autoTable: async (doc: jsPDFType, opts: any) => {
    const { autoTable } = await loadPDF();
    autoTable(doc, opts);
  },
  newDoc: async (landscape = false) => {
    const { jsPDF } = await loadPDF();
    return new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'letter' });
  },
};
