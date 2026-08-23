export function limiteHorasSemanales(): number {
  const raw = process.env.WEEKLY_HOURS_LIMIT;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 42;
}

export function urlApp(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
