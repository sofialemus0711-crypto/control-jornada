import { NextRequest, NextResponse } from "next/server";
import { obtenerSesionActual } from "@/lib/auth";
import {
  getRegistroDeHoy,
  crearRegistro,
  actualizarRegistroPorId,
} from "@/lib/googleSheets";
import {
  calcularHorasTrabajadas,
  fechaActualISO,
  horaActual,
  nombreDiaSemana,
} from "@/lib/hours";
import { nanoid } from "nanoid";
import type { AccionRegistro, Registro } from "@/lib/types";

const ACCIONES_VALIDAS: AccionRegistro[] = [
  "ENTRADA",
  "INICIO_ALMUERZO",
  "FIN_ALMUERZO",
  "SIN_ALMUERZO",
  "SALIDA",
];

export async function POST(request: NextRequest) {
  const sesion = await obtenerSesionActual();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const accion = body?.accion as AccionRegistro;

    if (!ACCIONES_VALIDAS.includes(accion)) {
      return NextResponse.json(
        { error: "Accion no reconocida." },
        { status: 400 }
      );
    }

    const fecha = fechaActualISO();
    const hora = horaActual();
    const registroExistente = await getRegistroDeHoy(sesion.id, fecha);

    if (accion === "ENTRADA") {
      if (registroExistente) {
        return NextResponse.json(
          { error: "Ya registraste tu entrada el dia de hoy." },
          { status: 400 }
        );
      }
      const foto = typeof body?.foto === "string" ? body.foto : "";
      if (!foto) {
        return NextResponse.json(
          { error: "Debes tomarte una foto para registrar tu entrada." },
          { status: 400 }
        );
      }
      if (foto.length > 60000) {
        return NextResponse.json(
          { error: "La foto es demasiado pesada. Intenta tomarla de nuevo." },
          { status: 400 }
        );
      }
      const nuevo: Registro = {
        id: nanoid(10),
        empleadoId: sesion.id,
        nombreEmpleado: sesion.nombre,
        fecha,
        diaSemana: nombreDiaSemana(fecha),
        horaEntrada: hora,
        horaInicioAlmuerzo: "",
        horaFinAlmuerzo: "",
        huboAlmuerzo: "PENDIENTE",
        horaSalida: "",
        totalHorasTrabajadas: "",
        observaciones: "",
        estado: "EN_CURSO",
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        modificadoPor: sesion.usuario,
        fotoEntrada: foto,
      };
      const creado = await crearRegistro(nuevo);
      return NextResponse.json({ ok: true, registro: creado });
    }

    if (!registroExistente) {
      return NextResponse.json(
        { error: "Primero debes registrar tu entrada." },
        { status: 400 }
      );
    }

    if (registroExistente.horaSalida) {
      return NextResponse.json(
        { error: "Tu jornada de hoy ya esta completa." },
        { status: 400 }
      );
    }

    if (accion === "INICIO_ALMUERZO") {
      if (registroExistente.horaInicioAlmuerzo) {
        return NextResponse.json(
          { error: "Ya registraste el inicio de tu almuerzo." },
          { status: 400 }
        );
      }
      if (registroExistente.huboAlmuerzo === "NO") {
        return NextResponse.json(
          { error: "Ya indicaste que hoy no tuviste hora de almuerzo." },
          { status: 400 }
        );
      }
      const actualizado = await actualizarRegistroPorId(registroExistente.id, {
        horaInicioAlmuerzo: hora,
        estado: "EN_ALMUERZO",
        modificadoPor: sesion.usuario,
      });
      return NextResponse.json({ ok: true, registro: actualizado });
    }

    if (accion === "FIN_ALMUERZO") {
      if (!registroExistente.horaInicioAlmuerzo) {
        return NextResponse.json(
          { error: "Primero debes registrar el inicio de tu almuerzo." },
          { status: 400 }
        );
      }
      if (registroExistente.horaFinAlmuerzo) {
        return NextResponse.json(
          { error: "Ya registraste el fin de tu almuerzo." },
          { status: 400 }
        );
      }
      const actualizado = await actualizarRegistroPorId(registroExistente.id, {
        horaFinAlmuerzo: hora,
        huboAlmuerzo: "SI",
        estado: "EN_CURSO",
        modificadoPor: sesion.usuario,
      });
      return NextResponse.json({ ok: true, registro: actualizado });
    }

    if (accion === "SIN_ALMUERZO") {
      if (registroExistente.huboAlmuerzo === "SI") {
        return NextResponse.json(
          { error: "Hoy ya registraste tu hora de almuerzo." },
          { status: 400 }
        );
      }
      if (registroExistente.horaInicioAlmuerzo) {
        return NextResponse.json(
          { error: "Ya iniciaste tu almuerzo hoy." },
          { status: 400 }
        );
      }
      const actualizado = await actualizarRegistroPorId(registroExistente.id, {
        huboAlmuerzo: "NO",
        modificadoPor: sesion.usuario,
      });
      return NextResponse.json({ ok: true, registro: actualizado });
    }

    if (accion === "SALIDA") {
      if (registroExistente.huboAlmuerzo === "PENDIENTE") {
        return NextResponse.json(
          {
            error:
              'Antes de registrar tu salida, indica tu almuerzo o marca "Hoy no tuve hora de almuerzo".',
          },
          { status: 400 }
        );
      }
      if (registroExistente.horaInicioAlmuerzo && !registroExistente.horaFinAlmuerzo) {
        return NextResponse.json(
          { error: "Primero debes registrar el fin de tu almuerzo." },
          { status: 400 }
        );
      }

      const horasTrabajadas = calcularHorasTrabajadas({
        horaEntrada: registroExistente.horaEntrada,
        horaInicioAlmuerzo: registroExistente.horaInicioAlmuerzo,
        horaFinAlmuerzo: registroExistente.horaFinAlmuerzo,
        huboAlmuerzo: registroExistente.huboAlmuerzo,
        horaSalida: hora,
      });

      const actualizado = await actualizarRegistroPorId(registroExistente.id, {
        horaSalida: hora,
        totalHorasTrabajadas:
          horasTrabajadas !== null ? horasTrabajadas.toFixed(2) : "",
        estado: "COMPLETO",
        modificadoPor: sesion.usuario,
      });
      return NextResponse.json({ ok: true, registro: actualizado });
    }

    return NextResponse.json({ error: "Accion no valida." }, { status: 400 });
  } catch (error) {
    console.error("Error registrando accion:", error);
    return NextResponse.json(
      { error: "No se pudo registrar la accion. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
