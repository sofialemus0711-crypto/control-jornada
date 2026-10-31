export function limiteHorasSemanales(): number {
  const raw = process.env.WEEKLY_HOURS_LIMIT;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 42;
}

export function urlApp(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/** Horas ordinarias por dia segun la regla de la empresa (despues de esto es hora extra). */
export function horasOrdinariasDia(): number {
  const raw = process.env.DAILY_ORDINARY_HOURS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 24 ? parsed : 7.5;
}
