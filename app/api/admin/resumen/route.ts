import { NextResponse } from "next/server";
import { obtenerSesionAdmin } from "@/lib/auth";
import { getRegistros, getEmpleados } from "@/lib/googleSheets";
import {
  calcularResumenesSemanales,
  fechaActualISO,
  inicioSemanaISO,
} from "@/lib/hours";
import { limiteHorasSemanales } from "@/lib/constants";

export async function GET() {
  const admin = await obtenerSesionAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const [registros, empleados] = await Promise.all([
      getRegistros(),
      getEmpleados(),
    ]);

    const fechaHoy = fechaActualISO();
    const registrosHoy = registros
      .filter((r) => r.fecha === fechaHoy)
      .sort((a, b) => a.nombreEmpleado.localeCompare(b.nombreEmpleado));

    const inicioSemanaActual = inicioSemanaISO(fechaHoy);
    let horasExtraSemanaTotal = 0;
    let horasTotalesSemana = 0;

    for (const emp of empleados) {
      const registrosEmpleado = registros.filter((r) => r.empleadoId === emp.id);
      const resumenes = calcularResumenesSemanales(
        registrosEmpleado,
        limiteHorasSemanales()
      );
      const semanaActual = resumenes.find(
        (r) => r.fechaInicio === inicioSemanaActual
      );
      if (semanaActual) {
        horasExtraSemanaTotal += semanaActual.horasExtra;
        horasTotalesSemana += semanaActual.totalHoras;
      }
    }

    return NextResponse.json({
      fechaHoy,
      totalEmpleados: empleados.length,
      empleadosActivos: empleados.filter((e) => e.activo).length,
      registrosHoy,
      horasExtraSemanaTotal: Math.round(horasExtraSemanaTotal * 100) / 100,
      horasTotalesSemana: Math.round(horasTotalesSemana * 100) / 100,
      limiteHorasSemanales: limiteHorasSemanales(),
    });
  } catch (error) {
    console.error("Error generando resumen admin:", error);
    return NextResponse.json(
      { error: "No se pudo generar el resumen." },
      { status: 500 }
    );
  }
}
