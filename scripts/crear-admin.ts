/**
 * Crea el usuario administrador inicial en la hoja "Empleados".
 *
 * Uso: npm run setup:admin
 * Toma los datos de las variables INITIAL_ADMIN_* en .env.local.
 * Si ya existe un usuario con ese nombre de usuario, el script se detiene
 * sin duplicar el registro.
 */
import "dotenv/config";
import { config as loadEnvLocal } from "dotenv";
loadEnvLocal({ path: ".env.local", override: true });

import { crearEmpleado, getEmpleadoPorUsuario } from "../lib/googleSheets";
import { hashPassword } from "../lib/password";

async function main() {
  const nombre = process.env.INITIAL_ADMIN_NOMBRE || "Administrador";
  const cargo = process.env.INITIAL_ADMIN_CARGO || "Administrador del sistema";
  const usuario = (process.env.INITIAL_ADMIN_USUARIO || "admin").toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!password) {
    throw new Error(
      "Define INITIAL_ADMIN_PASSWORD en tu .env.local antes de ejecutar este script."
    );
  }

  const existente = await getEmpleadoPorUsuario(usuario);
  if (existente) {
    console.log(
      `Ya existe un usuario con el nombre de usuario "${usuario}". No se creo ningun registro nuevo.`
    );
    return;
  }

  const passwordHash = await hashPassword(password);
  const admin = await crearEmpleado({
    nombre,
    cargo,
    usuario,
    passwordHash,
    rol: "admin",
  });

  console.log("Administrador creado correctamente:");
  console.log(`  Usuario:     ${admin.usuario}`);
  console.log(`  Contrasena:  ${password}`);
  console.log("Guarda esta contrasena en un lugar seguro y cambiala despues de tu primer ingreso.");
}

main().catch((error) => {
  console.error("Error al crear el administrador:");
  console.error(error);
  process.exit(1);
});
