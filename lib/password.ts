import bcrypt from "bcryptjs";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

/** Genera una contrasena temporal legible, ej "TX82-KLQ9", para nuevos empleados. */
export function generarPasswordTemporal(): string {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const parte = (len: number) =>
    Array.from({ length: len }, () =>
      alfabeto[Math.floor(Math.random() * alfabeto.length)]
    ).join("");
  return `${parte(4)}-${parte(4)}`;
}
