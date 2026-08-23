import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { SesionUsuario } from "./types";

const COOKIE_NAME = "cjl_session";
const DURACION_SESION = "12h";

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      'Falta la variable de entorno "SESSION_SECRET". Genera una con: openssl rand -base64 48'
    );
  }
  return new TextEncoder().encode(secret);
}

export async function crearSesion(usuario: SesionUsuario): Promise<string> {
  const token = await new SignJWT({ ...usuario })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(DURACION_SESION)
    .sign(getSecretKey());
  return token;
}

export async function verificarToken(
  token: string
): Promise<SesionUsuario | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SesionUsuario;
  } catch {
    return null;
  }
}

export function nombreCookie(): string {
  return COOKIE_NAME;
}

/** Solo puede usarse en Server Components / Route Handlers. */
export async function obtenerSesionActual(): Promise<SesionUsuario | null> {
  const store = cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verificarToken(token);
}

/** Devuelve la sesion solo si el usuario autenticado es administrador, si no null. */
export async function obtenerSesionAdmin(): Promise<SesionUsuario | null> {
  const sesion = await obtenerSesionActual();
  if (!sesion || sesion.rol !== "admin") return null;
  return sesion;
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 12, // 12 horas
};
