import { NextRequest, NextResponse } from "next/server";
import { obtenerSesionAdmin } from "@/lib/auth";
import { actualizarRegistroPorId, getRegistros } from "@/lib/googleSheets";
import { calcularHorasTrabajadas } from "@/lib/hours";

const CAMPOS_HORA = [
  "horaEntrada",
  "horaInicioAlmuerzo",
  "horaFinAlmuerzo",
  "horaSalida",
] as const;

function horaValida(valor: unknown): valor is string {
  return typeof valor === "string" && (/^\d{2}:\d{2}$/.test(valor) || valor === "");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await obtenerSesionAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const registros = await getRegistros();
    const registroActual = registros.find((r) => r.id === params.id);
    if (!registroActual) {
      return NextResponse.json(
        { error: "Registro no encontrado." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const cambios: Record<string, string> = {};

    for (const campo of CAMPOS_HORA) {
      if (campo in body) {
        if (!horaValida(body[campo])) {
          return NextResponse.json(
            { error: `El campo ${campo} debe tener formato HH:mm.` },
            { status: 400 }
          );
        }
        cambios[campo] = body[campo];
      }
    }

    if ("huboAlmuerzo" in body) {
      if (!["SI", "NO", "PENDIENTE"].includes(body.huboAlmuerzo)) {
        return NextResponse.json(
          { error: "Valor de huboAlmuerzo no valido." },
          { status: 400 }
        );
      }
      cambios.huboAlmuerzo = body.huboAlmuerzo;
    }

    if ("observaciones" in body) {
      cambios.observaciones = String(body.observaciones || "");
    }

    const fusion = { ...registroActual, ...cambios };

    let estado: string = registroActual.estado;
    let totalHorasTrabajadas = registroActual.totalHorasTrabajadas;

    if (fusion.horaEntrada && fusion.horaSalida) {
      const horas = calcularHorasTrabajadas({
        horaEntrada: fusion.horaEntrada,
        horaInicioAlmuerzo: fusion.horaInicioAlmuerzo,
        horaFinAlmuerzo: fusion.horaFinAlmuerzo,
        huboAlmuerzo: fusion.huboAlmuerzo,
        horaSalida: fusion.horaSalida,
      });
      totalHorasTrabajadas = horas !== null ? horas.toFixed(2) : "";
      estado = "COMPLETO";
    } else if (fusion.horaEntrada && !fusion.horaSalida) {
      totalHorasTrabajadas = "";
      estado = fusion.horaInicioAlmuerzo && !fusion.horaFinAlmuerzo
        ? "EN_ALMUERZO"
        : "EN_CURSO";
    }

    const actualizado = await actualizarRegistroPorId(params.id, {
      ...cambios,
      totalHorasTrabajadas,
      estado: estado as typeof registroActual.estado,
      modificadoPor: `${admin.nombre} (admin)`,
    });

    return NextResponse.json({ ok: true, registro: actualizado });
  } catch (error) {
    console.error("Error corrigiendo registro:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el registro." },
      { status: 500 }
    );
  }
}
