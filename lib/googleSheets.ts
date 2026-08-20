import { google, sheets_v4 } from "googleapis";
import { nanoid } from "nanoid";
import type { Empleado, Registro, Rol, EstadoRegistro } from "./types";

const EMPLEADOS_SHEET = "Empleados";
const REGISTROS_SHEET = "Registros";

const EMPLEADOS_HEADERS = [
  "ID",
  "Nombre",
  "Cargo",
  "Usuario",
  "PasswordHash",
  "Rol",
  "Activo",
  "FechaCreacion",
];

const REGISTROS_HEADERS = [
  "ID",
  "EmpleadoID",
  "NombreEmpleado",
  "Fecha",
  "DiaSemana",
  "HoraEntrada",
  "HoraInicioAlmuerzo",
  "HoraFinAlmuerzo",
  "HuboAlmuerzo",
  "HoraSalida",
  "TotalHorasTrabajadas",
  "Observaciones",
  "Estado",
  "FechaCreacion",
  "FechaModificacion",
  "ModificadoPor",
];

let cachedClient: sheets_v4.Sheets | null = null;

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta la variable de entorno "${name}". Revisa tu archivo .env.local o la configuracion en Vercel.`
    );
  }
  return value;
}

export function getSheetsClient(): sheets_v4.Sheets {
  if (cachedClient) return cachedClient;

  const email = getEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const rawKey = getEnv("GOOGLE_PRIVATE_KEY");
  const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  cachedClient = google.sheets({ version: "v4", auth });
  return cachedClient;
}

function getSpreadsheetId(): string {
  return getEnv("GOOGLE_SHEET_ID");
}

/** Crea las pestanas Empleados/Registros con encabezados si no existen todavia. */
export async function ensureSheetsExist(): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTitles = (meta.data.sheets ?? []).map(
    (s) => s.properties?.title ?? ""
  );

  const requests: sheets_v4.Schema$Request[] = [];
  if (!existingTitles.includes(EMPLEADOS_SHEET)) {
    requests.push({ addSheet: { properties: { title: EMPLEADOS_SHEET } } });
  }
  if (!existingTitles.includes(REGISTROS_SHEET)) {
    requests.push({ addSheet: { properties: { title: REGISTROS_SHEET } } });
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }

  await ensureHeaders(EMPLEADOS_SHEET, EMPLEADOS_HEADERS);
  await ensureHeaders(REGISTROS_SHEET, REGISTROS_HEADERS);
}

async function ensureHeaders(tab: string, headers: string[]): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!A1:Z1`,
  });

  const currentHeaders = res.data.values?.[0] ?? [];
  if (currentHeaders.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    });
  }
}

async function readAllRows(tab: string): Promise<string[][]> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!A2:Z100000`,
  });
  return res.data.values ?? [];
}

async function appendRow(tab: string, row: (string | number)[]): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tab}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row.map(String)] },
  });
}

/** Sobrescribe una fila completa. rowNumber es 1-based incluyendo el encabezado (fila 2 = primer registro). */
async function updateRow(
  tab: string,
  rowNumber: number,
  row: (string | number)[]
): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [row.map(String)] },
  });
}

function rowToEmpleado(row: string[]): Empleado {
  return {
    id: row[0] ?? "",
    nombre: row[1] ?? "",
    cargo: row[2] ?? "",
    usuario: row[3] ?? "",
    passwordHash: row[4] ?? "",
    rol: (row[5] as Rol) ?? "empleado",
    activo: (row[6] ?? "TRUE").toUpperCase() === "TRUE",
    fechaCreacion: row[7] ?? "",
  };
}

function empleadoToRow(e: Empleado): (string | number)[] {
  return [
    e.id,
    e.nombre,
    e.cargo,
    e.usuario,
    e.passwordHash,
    e.rol,
    e.activo ? "TRUE" : "FALSE",
    e.fechaCreacion,
  ];
}

function rowToRegistro(row: string[]): Registro {
  return {
    id: row[0] ?? "",
    empleadoId: row[1] ?? "",
    nombreEmpleado: row[2] ?? "",
    fecha: row[3] ?? "",
    diaSemana: row[4] ?? "",
    horaEntrada: row[5] ?? "",
    horaInicioAlmuerzo: row[6] ?? "",
    horaFinAlmuerzo: row[7] ?? "",
    huboAlmuerzo: (row[8] as Registro["huboAlmuerzo"]) ?? "PENDIENTE",
    horaSalida: row[9] ?? "",
    totalHorasTrabajadas: row[10] ?? "",
    observaciones: row[11] ?? "",
    estado: (row[12] as EstadoRegistro) ?? "EN_CURSO",
    fechaCreacion: row[13] ?? "",
    fechaModificacion: row[14] ?? "",
    modificadoPor: row[15] ?? "",
  };
}

function registroToRow(r: Registro): (string | number)[] {
  return [
    r.id,
    r.empleadoId,
    r.nombreEmpleado,
    r.fecha,
    r.diaSemana,
    r.horaEntrada,
    r.horaInicioAlmuerzo,
    r.horaFinAlmuerzo,
    r.huboAlmuerzo,
    r.horaSalida,
    r.totalHorasTrabajadas,
    r.observaciones,
    r.estado,
    r.fechaCreacion,
    r.fechaModificacion,
    r.modificadoPor,
  ];
}

// ---------------------------------------------------------------------------
// EMPLEADOS
// ---------------------------------------------------------------------------

export async function getEmpleados(): Promise<Empleado[]> {
  const rows = await readAllRows(EMPLEADOS_SHEET);
  return rows.filter((r) => r[0]).map(rowToEmpleado);
}

export async function getEmpleadoPorId(id: string): Promise<Empleado | null> {
  const empleados = await getEmpleados();
  return empleados.find((e) => e.id === id) ?? null;
}

export async function getEmpleadoPorUsuario(
  usuario: string
): Promise<Empleado | null> {
  const empleados = await getEmpleados();
  const usuarioLower = usuario.trim().toLowerCase();
  return (
    empleados.find((e) => e.usuario.trim().toLowerCase() === usuarioLower) ??
    null
  );
}

export async function crearEmpleado(data: {
  nombre: string;
  cargo: string;
  usuario: string;
  passwordHash: string;
  rol: Rol;
}): Promise<Empleado> {
  const empleado: Empleado = {
    id: nanoid(10),
    nombre: data.nombre,
    cargo: data.cargo,
    usuario: data.usuario,
    passwordHash: data.passwordHash,
    rol: data.rol,
    activo: true,
    fechaCreacion: new Date().toISOString(),
  };
  await appendRow(EMPLEADOS_SHEET, empleadoToRow(empleado));
  return empleado;
}

export async function actualizarEmpleado(
  id: string,
  cambios: Partial<Pick<Empleado, "nombre" | "cargo" | "usuario" | "passwordHash" | "rol" | "activo">>
): Promise<Empleado | null> {
  const rows = await readAllRows(EMPLEADOS_SHEET);
  const index = rows.findIndex((r) => r[0] === id);
  if (index === -1) return null;

  const actual = rowToEmpleado(rows[index]);
  const actualizado: Empleado = { ...actual, ...cambios };
  await updateRow(EMPLEADOS_SHEET, index + 2, empleadoToRow(actualizado));
  return actualizado;
}

// ---------------------------------------------------------------------------
// REGISTROS
// ---------------------------------------------------------------------------

export async function getRegistros(): Promise<Registro[]> {
  const rows = await readAllRows(REGISTROS_SHEET);
  return rows.filter((r) => r[0]).map(rowToRegistro);
}

export async function getRegistrosPorEmpleado(
  empleadoId: string
): Promise<Registro[]> {
  const registros = await getRegistros();
  return registros
    .filter((r) => r.empleadoId === empleadoId)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export async function getRegistroDeHoy(
  empleadoId: string,
  fecha: string
): Promise<Registro | null> {
  const registros = await getRegistrosPorEmpleado(empleadoId);
  return registros.find((r) => r.fecha === fecha) ?? null;
}

export async function crearRegistro(registro: Registro): Promise<Registro> {
  await appendRow(REGISTROS_SHEET, registroToRow(registro));
  return registro;
}

/** Actualiza un registro existente por su ID (busca la fila y la sobrescribe). */
export async function actualizarRegistroPorId(
  id: string,
  cambios: Partial<Registro>
): Promise<Registro | null> {
  const rows = await readAllRows(REGISTROS_SHEET);
  const index = rows.findIndex((r) => r[0] === id);
  if (index === -1) return null;

  const actual = rowToRegistro(rows[index]);
  const actualizado: Registro = {
    ...actual,
    ...cambios,
    fechaModificacion: new Date().toISOString(),
  };
  await updateRow(REGISTROS_SHEET, index + 2, registroToRow(actualizado));
  return actualizado;
}
