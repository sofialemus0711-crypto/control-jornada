/**
 * Inicializa la hoja de calculo de Google Sheets creando (si no existen) las
 * pestanas "Empleados" y "Registros" con sus encabezados correctos.
 *
 * Uso: npm run setup:sheets
 * Requiere que .env.local tenga GOOGLE_SERVICE_ACCOUNT_EMAIL,
 * GOOGLE_PRIVATE_KEY y GOOGLE_SHEET_ID configurados.
 */
import "dotenv/config";
import { config as loadEnvLocal } from "dotenv";
loadEnvLocal({ path: ".env.local", override: true });

import { ensureSheetsExist } from "../lib/googleSheets";

async function main() {
  console.log("Conectando con Google Sheets...");
  await ensureSheetsExist();
  console.log("Listo. Las pestanas 'Empleados' y 'Registros' existen y tienen sus encabezados.");
  console.log("Ahora puedes ejecutar: npm run setup:admin");
}

main().catch((error) => {
  console.error("Error al inicializar la hoja de calculo:");
  console.error(error);
  process.exit(1);
});
