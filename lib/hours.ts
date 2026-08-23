import type { Registro, ResumenSemanal } from "./types";

export const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
];

export function nombreDiaSemana(fechaISO: string): string {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return DIAS_SEMANA[date.getDay()];
}

/** Convierte "HH:mm" a minutos desde medianoche. Devuelve null si no es valido. */
function horaAMinutos(hora: string | undefined | null): number | null {
  if (!hora) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(hora.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const min = Number(match[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Calcula el total de horas trabajadas en un dia, descontando el almuerzo
 * automaticamente cuando corresponde. Devuelve un numero decimal (ej 8.5) o
 * null si el registro aun esta incompleto (falta entrada o salida).
 */
export function calcularHorasTrabajadas(registro: {
  horaEntrada: string;
  horaInicioAlmuerzo: string;
  horaFinAlmuerzo: string;
  huboAlmuerzo: string;
  horaSalida: string;
}): number | null {
  const entrada = horaAMinutos(registro.horaEntrada);
  const salida = horaAMinutos(registro.horaSalida);
  if (entrada === null || salida === null) return null;

  let minutosTotales = salida - entrada;
  if (minutosTotales < 0) {
    // turno que cruza medianoche (poco comun, pero lo contemplamos)
    minutosTotales += 24 * 60;
  }

  if (registro.huboAlmuerzo === "SI") {
    const inicioAlmuerzo = horaAMinutos(registro.horaInicioAlmuerzo);
    const finAlmuerzo = horaAMinutos(registro.horaFinAlmuerzo);
    if (inicioAlmuerzo !== null && finAlmuerzo !== null) {
      let minutosAlmuerzo = finAlmuerzo - inicioAlmuerzo;
      if (minutosAlmuerzo < 0) minutosAlmuerzo += 24 * 60;
      minutosTotales -= minutosAlmuerzo;
    }
  }

  return Math.max(0, Math.round((minutosTotales / 60) * 100) / 100);
}

export function minutosAlmuerzo(registro: {
  horaInicioAlmuerzo: string;
  horaFinAlmuerzo: string;
  huboAlmuerzo: string;
}): number {
  if (registro.huboAlmuerzo !== "SI") return 0;
  const inicio = horaAMinutos(registro.horaInicioAlmuerzo);
  const fin = horaAMinutos(registro.horaFinAlmuerzo);
  if (inicio === null || fin === null) return 0;
  let minutos = fin - inicio;
  if (minutos < 0) minutos += 24 * 60;
  return minutos;
}

/** Devuelve la fecha (YYYY-MM-DD) del lunes de la semana ISO a la que pertenece fechaISO. */
export function inicioSemanaISO(fechaISO: string): string {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dia = date.getDay(); // 0 = domingo
  const diff = dia === 0 ? -6 : 1 - dia; // retrocede hasta el lunes
  date.setDate(date.getDate() + diff);
  return formatoFecha(date);
}

export function finSemanaISO(inicioSemana: string): string {
  const [y, m, d] = inicioSemana.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + 6);
  return formatoFecha(date);
}

export function formatoFecha(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function etiquetaSemana(inicioSemana: string): string {
  const [y, m, d] = inicioSemana.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  // Numero de semana ISO 8601 aproximado
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target.getTime() - firstThursday.getTime();
  const semana = 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
  return `${target.getFullYear()}-W${String(semana).padStart(2, "0")}`;
}

/**
 * Agrupa los registros de un empleado por semana (lunes a domingo) y calcula
 * el total de horas, horas normales y horas extra segun el limite semanal.
 */
export function calcularResumenesSemanales(
  registros: Registro[],
  limiteSemanal: number
): ResumenSemanal[] {
  const grupos = new Map<string, Registro[]>();

  for (const registro of registros) {
    if (!registro.fecha) continue;
    const inicio = inicioSemanaISO(registro.fecha);
    if (!grupos.has(inicio)) grupos.set(inicio, []);
    grupos.get(inicio)!.push(registro);
  }

  const resumenes: ResumenSemanal[] = [];
  for (const [inicio, regs] of grupos.entries()) {
    const totalHoras = regs.reduce((sum, r) => {
      const horas = Number(r.totalHorasTrabajadas);
      return sum + (Number.isFinite(horas) ? horas : 0);
    }, 0);
    const totalAlmuerzoMinutos = regs.reduce(
      (sum, r) => sum + minutosAlmuerzo(r),
      0
    );

    const totalHorasRedondeado = Math.round(totalHoras * 100) / 100;
    const horasNormales = Math.min(totalHorasRedondeado, limiteSemanal);
    const horasExtra =
      Math.round(Math.max(0, totalHorasRedondeado - limiteSemanal) * 100) /
      100;

    resumenes.push({
      semana: etiquetaSemana(inicio),
      fechaInicio: inicio,
      fechaFin: finSemanaISO(inicio),
      totalHoras: totalHorasRedondeado,
      horasNormales,
      horasExtra,
      totalAlmuerzoHoras: Math.round((totalAlmuerzoMinutos / 60) * 100) / 100,
      diasTrabajados: regs.filter((r) => r.totalHorasTrabajadas).length,
    });
  }

  return resumenes.sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio));
}

/**
 * Las funciones de servidor (Vercel) corren en UTC, asi que usamos la zona
 * horaria configurada (por defecto America/Bogota) para que la hora y fecha
 * "actuales" coincidan con la hora real del empleado.
 */
function zonaHoraria(): string {
  return process.env.APP_TIMEZONE || "America/Bogota";
}

export function horaActual(): string {
  const formatter = new Intl.DateTimeFormat("es-CO", {
    timeZone: zonaHoraria(),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const partes = formatter.formatToParts(new Date());
  const h = partes.find((p) => p.type === "hour")?.value ?? "00";
  const m = partes.find((p) => p.type === "minute")?.value ?? "00";
  return `${h}:${m}`;
}

export function fechaActualISO(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: zonaHoraria(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date()); // en-CA produce YYYY-MM-DD
}
