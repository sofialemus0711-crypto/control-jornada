import type { Registro } from "./types";
import { formatoFecha, inicioSemanaISO, nombreDiaSemana } from "./hours";

/**
 * Clasificacion de horas segun la legislacion laboral colombiana
 * (Ley 2101 de 2021 y Ley 2466 de 2025, reforma laboral).
 *
 * Valor hora ordinaria = salario mensual / 210 (jornada de 42 h semanales).
 */

export type CategoriaHora =
  | "ORDINARIA_DIURNA"
  | "RECARGO_NOCTURNO"
  | "RECARGO_DOMINICAL_DIURNO"
  | "RECARGO_NOCTURNO_DOMINICAL"
  | "EXTRA_DIURNA"
  | "EXTRA_NOCTURNA"
  | "EXTRA_DIURNA_DOMINICAL"
  | "EXTRA_NOCTURNA_DOMINICAL";

export const CATEGORIAS: CategoriaHora[] = [
  "ORDINARIA_DIURNA",
  "RECARGO_NOCTURNO",
  "RECARGO_DOMINICAL_DIURNO",
  "RECARGO_NOCTURNO_DOMINICAL",
  "EXTRA_DIURNA",
  "EXTRA_NOCTURNA",
  "EXTRA_DIURNA_DOMINICAL",
  "EXTRA_NOCTURNA_DOMINICAL",
];

export const ETIQUETAS_CATEGORIA: Record<CategoriaHora, string> = {
  ORDINARIA_DIURNA: "Ordinaria diurna",
  RECARGO_NOCTURNO: "Ordinaria nocturna (recargo)",
  RECARGO_DOMINICAL_DIURNO: "Ordinaria dominical/festiva diurna",
  RECARGO_NOCTURNO_DOMINICAL: "Ordinaria nocturna dominical/festiva",
  EXTRA_DIURNA: "Extra diurna",
  EXTRA_NOCTURNA: "Extra nocturna",
  EXTRA_DIURNA_DOMINICAL: "Extra diurna dominical/festiva",
  EXTRA_NOCTURNA_DOMINICAL: "Extra nocturna dominical/festiva",
};

export const ES_EXTRA: Record<CategoriaHora, boolean> = {
  ORDINARIA_DIURNA: false,
  RECARGO_NOCTURNO: false,
  RECARGO_DOMINICAL_DIURNO: false,
  RECARGO_NOCTURNO_DOMINICAL: false,
  EXTRA_DIURNA: true,
  EXTRA_NOCTURNA: true,
  EXTRA_DIURNA_DOMINICAL: true,
  EXTRA_NOCTURNA_DOMINICAL: true,
};

/** Recargo dominical/festivo vigente en una fecha (sobre el valor de la hora ordinaria). */
export function recargoDominical(fechaISO: string): number {
  if (fechaISO >= "2027-07-01") return 1.0;
  if (fechaISO >= "2026-07-01") return 0.9;
  if (fechaISO >= "2025-07-01") return 0.8;
  return 0.75;
}

/** Minuto del dia en que empieza la jornada nocturna (19:00 desde el 25-dic-2025; antes 21:00). */
export function inicioNocturnoMin(fechaISO: string): number {
  return fechaISO >= "2025-12-25" ? 19 * 60 : 21 * 60;
}
const FIN_NOCTURNO_MIN = 6 * 60;

const RECARGO_NOCTURNO = 0.35;
const FACTOR_EXTRA_DIURNA = 1.25;
const FACTOR_EXTRA_NOCTURNA = 1.75;

/**
 * Pago ADICIONAL al salario como multiplicador del valor de la hora ordinaria.
 * Las horas ordinarias diurnas ya estan cubiertas por el salario (0).
 * Los recargos se pagan sobre la hora ordinaria; las horas extra se pagan
 * completas (factor total, que incluye la hora base).
 */
export function factorPago(categoria: CategoriaHora, fechaISO: string): number {
  const dom = recargoDominical(fechaISO);
  switch (categoria) {
    case "ORDINARIA_DIURNA":
      return 0;
    case "RECARGO_NOCTURNO":
      return RECARGO_NOCTURNO;
    case "RECARGO_DOMINICAL_DIURNO":
      return dom;
    case "RECARGO_NOCTURNO_DOMINICAL":
      return RECARGO_NOCTURNO + dom;
    case "EXTRA_DIURNA":
      return FACTOR_EXTRA_DIURNA;
    case "EXTRA_NOCTURNA":
      return FACTOR_EXTRA_NOCTURNA;
    case "EXTRA_DIURNA_DOMINICAL":
      return FACTOR_EXTRA_DIURNA + dom;
    case "EXTRA_NOCTURNA_DOMINICAL":
      return FACTOR_EXTRA_NOCTURNA + dom;
  }
}

/* ------------------------- Festivos de Colombia ------------------------- */

function utc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}
function sumarDias(date: Date, dias: number): Date {
  return new Date(date.getTime() + dias * 86400000);
}
function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}
/** Ley Emiliani: si el dia no es lunes, pasa al lunes siguiente. */
function aLunes(date: Date): Date {
  const dow = date.getUTCDay(); // 0 domingo
  if (dow === 1) return date;
  const dias = (8 - dow) % 7;
  return sumarDias(date, dias === 0 ? 1 : dias);
}
/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher). */
function pascua(y: number): Date {
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return utc(y, mes, dia);
}

const cacheFestivos = new Map<number, Map<string, string>>();

/** Festivos de un anio: fecha ISO -> nombre. */
export function festivosColombia(y: number): Map<string, string> {
  const cached = cacheFestivos.get(y);
  if (cached) return cached;
  const mapa = new Map<string, string>();
  const add = (d: Date, nombre: string) => mapa.set(iso(d), nombre);

  add(utc(y, 1, 1), "Año Nuevo");
  add(aLunes(utc(y, 1, 6)), "Reyes Magos");
  add(aLunes(utc(y, 3, 19)), "San José");
  add(utc(y, 5, 1), "Día del Trabajo");
  add(utc(y, 7, 20), "Independencia de Colombia");
  add(utc(y, 8, 7), "Batalla de Boyacá");
  add(aLunes(utc(y, 6, 29)), "San Pedro y San Pablo");
  add(aLunes(utc(y, 8, 15)), "Asunción de la Virgen");
  add(aLunes(utc(y, 10, 12)), "Día de la Raza");
  add(aLunes(utc(y, 11, 1)), "Todos los Santos");
  add(aLunes(utc(y, 11, 11)), "Independencia de Cartagena");
  add(utc(y, 12, 8), "Inmaculada Concepción");
  add(utc(y, 12, 25), "Navidad");

  const p = pascua(y);
  add(sumarDias(p, -3), "Jueves Santo");
  add(sumarDias(p, -2), "Viernes Santo");
  add(sumarDias(p, 43), "Ascensión del Señor");
  add(sumarDias(p, 64), "Corpus Christi");
  add(sumarDias(p, 71), "Sagrado Corazón");

  cacheFestivos.set(y, mapa);
  return mapa;
}

export function nombreFestivo(fechaISO: string): string | null {
  const y = Number(fechaISO.slice(0, 4));
  return festivosColombia(y).get(fechaISO) ?? null;
}

function sumarDiasISO(fechaISO: string, dias: number): string {
  const [y, m, d] = fechaISO.split("-").map(Number);
  return iso(sumarDias(utc(y, m, d), dias));
}
function esDomingo(fechaISO: string): boolean {
  const [y, m, d] = fechaISO.split("-").map(Number);
  return utc(y, m, d).getUTCDay() === 0;
}
/** Domingo o festivo (dia de descanso obligatorio). */
export function esDominicalOFestivo(fechaISO: string): boolean {
  return esDomingo(fechaISO) || nombreFestivo(fechaISO) !== null;
}

/* ----------------------------- Clasificador ----------------------------- */

function aMin(hora: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hora || "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

export interface DiaClasificado {
  fecha: string;
  diaSemana: string;
  festivo: string | null; // nombre del festivo, "Domingo" o null
  horaEntrada: string;
  horaSalida: string;
  horasNetas: number;
  horasOrdinarias: number;
  horasExtra: number;
  /** Minutos por categoria. */
  minutos: Record<CategoriaHora, number>;
  /** Horas por categoria (decimal). */
  horas: Record<CategoriaHora, number>;
  /** Suma de (horas x factor): horas "equivalentes" a pagar sobre el valor hora, adicionales al salario. */
  horasEquivalentes: number;
  excedeLimiteDiarioLegal: boolean;
}

export interface SemanaClasificada {
  inicio: string;
  horasExtra: number;
  excedeLimiteSemanalLegal: boolean;
}

export interface ResultadoClasificacion {
  desde: string;
  hasta: string;
  limiteOrdinarioDia: number;
  dias: DiaClasificado[];
  semanas: SemanaClasificada[];
  totalMinutos: Record<CategoriaHora, number>;
  totalHoras: Record<CategoriaHora, number>;
  totalHorasExtra: number;
  totalHorasNetas: number;
  totalHorasEquivalentes: number;
  registrosIncompletos: number;
  /** Factores de pago por categoria vigentes al final del rango (referencia). */
  factores: Record<CategoriaHora, number>;
  /** Factores por categoria por cada dia, para calcular el pago con precision. */
  recargoDominicalVigente: number;
}

const vacio = (): Record<CategoriaHora, number> => ({
  ORDINARIA_DIURNA: 0,
  RECARGO_NOCTURNO: 0,
  RECARGO_DOMINICAL_DIURNO: 0,
  RECARGO_NOCTURNO_DOMINICAL: 0,
  EXTRA_DIURNA: 0,
  EXTRA_NOCTURNA: 0,
  EXTRA_DIURNA_DOMINICAL: 0,
  EXTRA_NOCTURNA_DOMINICAL: 0,
});

const redondear = (n: number) => Math.round(n * 100) / 100;

/**
 * Clasifica minuto a minuto un registro completo. Los primeros
 * `limiteOrdinarioDia` horas netas (sin almuerzo) son ordinarias; el resto
 * son horas extra. Cada minuto se clasifica ademas como diurno/nocturno y
 * dominical-festivo segun la fecha calendario real en que ocurre.
 */
export function clasificarRegistro(
  r: Pick<
    Registro,
    | "fecha"
    | "horaEntrada"
    | "horaSalida"
    | "horaInicioAlmuerzo"
    | "horaFinAlmuerzo"
    | "huboAlmuerzo"
  >,
  limiteOrdinarioDia: number
): DiaClasificado | null {
  const entrada = aMin(r.horaEntrada);
  let salida = aMin(r.horaSalida);
  if (entrada === null || salida === null) return null;
  if (salida < entrada) salida += 1440; // cruza medianoche

  // Segmentos trabajados (en minutos desde la medianoche del dia de entrada)
  let segmentos: Array<[number, number]> = [[entrada, salida]];
  if (r.huboAlmuerzo === "SI") {
    const ia = aMin(r.horaInicioAlmuerzo);
    const fa = aMin(r.horaFinAlmuerzo);
    if (ia !== null && fa !== null) {
      let i = ia;
      let f = fa;
      if (i < entrada) i += 1440;
      if (f < i) f += 1440;
      if (i >= entrada && f <= salida && f > i) {
        segmentos = [
          [entrada, i],
          [f, salida],
        ];
      }
    }
  }

  const minutos = vacio();
  const limiteMin = Math.round(limiteOrdinarioDia * 60);
  let trabajados = 0;
  const cacheDia = new Map<number, { dom: boolean; inicioNoc: number }>();

  for (const [ini, fin] of segmentos) {
    for (let m = ini; m < fin; m++) {
      const offset = Math.floor(m / 1440);
      let info = cacheDia.get(offset);
      if (!info) {
        const f = offset === 0 ? r.fecha : sumarDiasISO(r.fecha, offset);
        info = { dom: esDominicalOFestivo(f), inicioNoc: inicioNocturnoMin(f) };
        cacheDia.set(offset, info);
      }
      const minDia = m % 1440;
      const noct = minDia < FIN_NOCTURNO_MIN || minDia >= info.inicioNoc;
      const extra = trabajados >= limiteMin;
      trabajados++;

      let cat: CategoriaHora;
      if (extra) {
        cat = info.dom
          ? noct
            ? "EXTRA_NOCTURNA_DOMINICAL"
            : "EXTRA_DIURNA_DOMINICAL"
          : noct
          ? "EXTRA_NOCTURNA"
          : "EXTRA_DIURNA";
      } else {
        cat = info.dom
          ? noct
            ? "RECARGO_NOCTURNO_DOMINICAL"
            : "RECARGO_DOMINICAL_DIURNO"
          : noct
          ? "RECARGO_NOCTURNO"
          : "ORDINARIA_DIURNA";
      }
      minutos[cat]++;
    }
  }

  const horas = vacio();
  let extraMin = 0;
  let equivalentes = 0;
  for (const c of CATEGORIAS) {
    horas[c] = redondear(minutos[c] / 60);
    if (ES_EXTRA[c]) extraMin += minutos[c];
    // Para el pago de cada minuto se usa el factor de la fecha de inicio del turno;
    // los turnos que cruzan a otra fecha son raros y la diferencia es minima.
    equivalentes += (minutos[c] / 60) * factorPago(c, r.fecha);
  }

  const festivo = nombreFestivo(r.fecha) ?? (esDomingo(r.fecha) ? "Domingo" : null);
  const extraHoras = redondear(extraMin / 60);

  return {
    fecha: r.fecha,
    diaSemana: nombreDiaSemana(r.fecha),
    festivo,
    horaEntrada: r.horaEntrada,
    horaSalida: r.horaSalida,
    horasNetas: redondear(trabajados / 60),
    horasOrdinarias: redondear((trabajados - extraMin) / 60),
    horasExtra: extraHoras,
    minutos,
    horas,
    horasEquivalentes: redondear(equivalentes),
    excedeLimiteDiarioLegal: extraHoras > 2,
  };
}

export function clasificarRango(
  registros: Registro[],
  desde: string,
  hasta: string,
  limiteOrdinarioDia: number
): ResultadoClasificacion {
  const dias: DiaClasificado[] = [];
  let incompletos = 0;

  const enRango = registros
    .filter((r) => r.fecha >= desde && r.fecha <= hasta)
    .sort((a, b) => (a.fecha + a.horaEntrada).localeCompare(b.fecha + b.horaEntrada));

  for (const r of enRango) {
    const c = clasificarRegistro(r, limiteOrdinarioDia);
    if (!c) {
      incompletos++;
      continue;
    }
    dias.push(c);
  }

  const totalMinutos = vacio();
  let equivalentes = 0;
  let neto = 0;
  for (const d of dias) {
    for (const c of CATEGORIAS) totalMinutos[c] += d.minutos[c];
    equivalentes += d.horasEquivalentes;
    neto += d.horasNetas;
  }
  const totalHoras = vacio();
  let totalExtra = 0;
  for (const c of CATEGORIAS) {
    totalHoras[c] = redondear(totalMinutos[c] / 60);
    if (ES_EXTRA[c]) totalExtra += totalMinutos[c];
  }

  const porSemana = new Map<string, number>();
  for (const d of dias) {
    const s = inicioSemanaISO(d.fecha);
    porSemana.set(s, (porSemana.get(s) ?? 0) + d.horasExtra);
  }
  const semanas: SemanaClasificada[] = [...porSemana.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([inicio, h]) => ({
      inicio,
      horasExtra: redondear(h),
      excedeLimiteSemanalLegal: h > 12,
    }));

  const factores = vacio();
  for (const c of CATEGORIAS) factores[c] = factorPago(c, hasta);

  return {
    desde,
    hasta,
    limiteOrdinarioDia,
    dias,
    semanas,
    totalMinutos,
    totalHoras,
    totalHorasExtra: redondear(totalExtra / 60),
    totalHorasNetas: redondear(neto),
    totalHorasEquivalentes: redondear(equivalentes),
    registrosIncompletos: incompletos,
    factores,
    recargoDominicalVigente: recargoDominical(hasta),
  };
}

export { formatoFecha };
