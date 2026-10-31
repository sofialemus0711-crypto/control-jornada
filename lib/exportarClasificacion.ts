import {
  CATEGORIAS,
  ES_EXTRA,
  ETIQUETAS_CATEGORIA,
  type ResultadoClasificacion,
} from "./recargos";

function fmt(f: string): string {
  const [y, m, d] = f.split("-");
  return `${d}/${m}/${y}`;
}

function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function pagoTexto(factor: number, extra: boolean): string {
  if (factor === 0) return "Incluida en salario";
  return extra
    ? `${Math.round(factor * 100)}% del valor hora`
    : `+${Math.round(factor * 100)}% recargo`;
}

function nombreArchivo(r: ResultadoClasificacion, empleado: string, ext: string) {
  const limpio = empleado.normalize("NFD").replace(/[^\w]+/g, "_").replace(/^_|_$/g, "") || "empleado";
  return `horas-extra-${limpio}-${r.desde}_a_${r.hasta}.${ext}`;
}

export async function exportarPDF(
  r: ResultadoClasificacion,
  empleado: string,
  salario: number
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const ancho = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.text("Informe de horas extra y recargos", 40, 45);
  doc.setFontSize(10);
  doc.text(`Empleado: ${empleado}`, 40, 65);
  doc.text(`Periodo: ${fmt(r.desde)} a ${fmt(r.hasta)}`, 40, 79);
  doc.text(
    `Regla: horas extra despues de ${r.limiteOrdinarioDia} h netas por dia (sin almuerzo).`,
    40,
    93
  );
  let y = 105;
  if (salario > 0) {
    const vh = salario / 210;
    doc.text(
      `Salario mensual: $${Math.round(salario).toLocaleString("es-CO")}  |  Valor hora (salario/210): $${Math.round(vh).toLocaleString("es-CO")}  |  Pago adicional estimado: $${Math.round(r.totalHorasEquivalentes * vh).toLocaleString("es-CO")}`,
      40,
      y
    );
    y += 14;
  }

  autoTable(doc, {
    startY: y + 6,
    head: [["Clasificacion", "Horas", "Pago adicional"]],
    body: [
      ...CATEGORIAS.map((c) => [
        ETIQUETAS_CATEGORIA[c] + (ES_EXTRA[c] ? " (EXTRA)" : ""),
        r.totalHoras[c].toFixed(2),
        pagoTexto(r.factores[c], ES_EXTRA[c]),
      ]),
      ["TOTAL HORAS EXTRA", r.totalHorasExtra.toFixed(2), ""],
      ["TOTAL HORAS NETAS", r.totalHorasNetas.toFixed(2), ""],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 41, 59] },
    columnStyles: { 1: { halign: "right" } },
  });

  const filas: string[][] = [];
  for (const d of r.dias) {
    d.tramos.forEach((t, i) => {
      filas.push([
        i === 0 ? `${d.diaSemana.slice(0, 3)} ${fmt(d.fecha)}${d.festivo ? `\n${d.festivo}` : ""}` : "",
        i === 0 ? `${d.horaEntrada}-${d.horaSalida}\nAlm. ${d.almuerzo}` : "",
        i === 0 ? `${d.horasNetas.toFixed(2)}` : "",
        i === 0 ? `${d.horasExtra.toFixed(2)}` : "",
        `${t.desde}-${t.hasta}`,
        ETIQUETAS_CATEGORIA[t.categoria] + (t.extra ? " (EXTRA)" : ""),
        t.horas.toFixed(2),
      ]);
    });
  }
  doc.addPage();
  doc.setFontSize(13);
  doc.text("Detalle dia por dia", 40, 45);
  autoTable(doc, {
    startY: 55,
    head: [["Fecha", "Turno", "Netas", "Extra", "Tramo", "Clasificacion", "Horas"]],
    body: filas,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 41, 59] },
    didParseCell: (data) => {
      if (data.section === "body" && String(data.row.raw && (data.row.raw as string[])[5]).includes("(EXTRA)")) {
        data.cell.styles.fillColor = [254, 243, 199];
      }
    },
  });

  const alto = doc.internal.pageSize.getHeight();
  const nota =
    "Guia de calculo segun Ley 2101/2021 y Ley 2466/2025 (valor hora = salario/210; nocturno 7pm-6am). No constituye asesoria legal.";
  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.text(nota, 40, alto - 25, { maxWidth: ancho - 80 });
    doc.text(`Pagina ${p} de ${n}`, ancho - 40, alto - 25, { align: "right" });
  }
  doc.save(nombreArchivo(r, empleado, "pdf"));
}

export async function exportarExcel(
  r: ResultadoClasificacion,
  empleado: string,
  salario: number
) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const vh = salario > 0 ? salario / 210 : 0;

  const res = wb.addWorksheet("Resumen");
  res.addRow(["Empleado", empleado]);
  res.addRow(["Periodo", `${fmt(r.desde)} a ${fmt(r.hasta)}`]);
  res.addRow(["Horas ordinarias por dia (regla)", r.limiteOrdinarioDia]);
  if (vh > 0) {
    res.addRow(["Salario mensual", salario]);
    res.addRow(["Valor hora (salario/210)", Math.round(vh)]);
  }
  res.addRow([]);
  const cab = res.addRow(["Clasificacion", "Es extra", "Horas", "Pago adicional", "Factor"]);
  cab.font = { bold: true };
  for (const c of CATEGORIAS) {
    res.addRow([
      ETIQUETAS_CATEGORIA[c],
      ES_EXTRA[c] ? "SI" : "NO",
      r.totalHoras[c],
      pagoTexto(r.factores[c], ES_EXTRA[c]),
      r.factores[c],
    ]);
  }
  res.addRow([]);
  res.addRow(["Total horas extra", "", r.totalHorasExtra]).font = { bold: true };
  res.addRow(["Total horas netas", "", r.totalHorasNetas]).font = { bold: true };
  if (vh > 0) {
    res.addRow(["Pago adicional estimado", "", "", Math.round(r.totalHorasEquivalentes * vh)]).font = { bold: true };
  }
  res.columns = [{ width: 38 }, { width: 22 }, { width: 10 }, { width: 24 }, { width: 10 }];

  const dias = wb.addWorksheet("Dias");
  dias.addRow([
    "Fecha", "Dia", "Festivo/Domingo", "Entrada", "Almuerzo", "Salida",
    "Horas netas", "Horas ordinarias", "Horas extra",
    ...CATEGORIAS.map((c) => ETIQUETAS_CATEGORIA[c]),
  ]).font = { bold: true };
  for (const d of r.dias) {
    dias.addRow([
      d.fecha, d.diaSemana, d.festivo ?? "", d.horaEntrada, d.almuerzo, d.horaSalida,
      d.horasNetas, d.horasOrdinarias, d.horasExtra,
      ...CATEGORIAS.map((c) => d.horas[c]),
    ]);
  }
  dias.columns.forEach((c) => (c.width = 16));

  const tr = wb.addWorksheet("Tramos");
  tr.addRow(["Fecha", "Dia", "Desde", "Hasta", "Clasificacion", "Es extra", "Horas"]).font = { bold: true };
  for (const d of r.dias) {
    for (const t of d.tramos) {
      const fila = tr.addRow([
        d.fecha, d.diaSemana, t.desde, t.hasta, ETIQUETAS_CATEGORIA[t.categoria],
        t.extra ? "SI" : "NO", t.horas,
      ]);
      if (t.extra) {
        fila.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
        });
      }
    }
  }
  tr.columns = [{ width: 12 }, { width: 12 }, { width: 8 }, { width: 8 }, { width: 38 }, { width: 10 }, { width: 8 }];

  const buf = await wb.xlsx.writeBuffer();
  descargar(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    nombreArchivo(r, empleado, "xlsx")
  );
}
