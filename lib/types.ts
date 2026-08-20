export type Rol = "admin" | "empleado";

export interface Empleado {
  id: string;
  nombre: string;
  cargo: string;
  usuario: string;
  passwordHash: string;
  rol: Rol;
  activo: boolean;
  fechaCreacion: string;
}

export interface EmpleadoPublico {
  id: string;
  nombre: string;
  cargo: string;
  usuario: string;
  rol: Rol;
  activo: boolean;
  fechaCreacion: string;
}

export interface Registro {
  id: string;
  empleadoId: string;
  nombreEmpleado: string;
  fecha: string; // YYYY-MM-DD
  diaSemana: string;
  horaEntrada: string; // HH:mm
  horaInicioAlmuerzo: string;
  horaFinAlmuerzo: string;
  huboAlmuerzo: "SI" | "NO" | "PENDIENTE";
  horaSalida: string;
  totalHorasTrabajadas: string; // decimal en texto, ej "8.50"
  observaciones: string;
  estado: EstadoRegistro;
  fechaCreacion: string;
  fechaModificacion: string;
  modificadoPor: string;
  fotoEntrada: string; // foto en base64 (JPEG comprimido) tomada al marcar entrada
}

export type EstadoRegistro =
  | "EN_CURSO"
  | "EN_ALMUERZO"
  | "COMPLETO"
  | "INCOMPLETO";

export type AccionRegistro =
  | "ENTRADA"
  | "INICIO_ALMUERZO"
  | "FIN_ALMUERZO"
  | "SIN_ALMUERZO"
  | "SALIDA";

export interface SesionUsuario {
  id: string;
  nombre: string;
  cargo: string;
  usuario: string;
  rol: Rol;
}

export interface ResumenSemanal {
  semana: string; // ej "2026-W32"
  fechaInicio: string;
  fechaFin: string;
  totalHoras: number;
  horasNormales: number;
  horasExtra: number;
  totalAlmuerzoHoras: number;
  diasTrabajados: number;
}
