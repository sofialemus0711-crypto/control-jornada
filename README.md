# Control de Jornada Laboral

Aplicación web completa para el control de asistencia de empleados mediante
código QR, con cálculo automático de horas trabajadas, horas extra, y
almacenamiento de todos los registros en **Google Sheets**.

---

## 1. Resumen de la solución

| Aspecto | Decisión tomada |
|---|---|
| Framework | **Next.js 14** (React + TypeScript), App Router. Un solo proyecto sirve el frontend y el backend (API routes), lo que simplifica el despliegue. |
| Base de datos | **Google Sheets** (tal como pediste). Una hoja `Empleados` y una hoja `Registros`. No se necesita ninguna base de datos adicional: también se usa Sheets para las credenciales de acceso (usuario + contraseña cifrada), así todo vive en un solo lugar que puedes abrir y exportar cuando quieras. |
| Autenticación | Sesiones propias con **JWT firmado** guardado en una cookie `httpOnly` seguras (no se usan servicios externos de login). Las contraseñas se guardan **cifradas con bcrypt**, nunca en texto plano. |
| Código QR | Se genera **en el servidor** (librería `qrcode`) y apunta siempre a `/login`. Escanearlo nunca marca asistencia automáticamente, tal como pediste. |
| Hosting recomendado | **Vercel** (plan gratuito es suficiente). |
| Idioma | Toda la interfaz, mensajes y textos están en español. |

### ¿Por qué este stack?

Next.js permite tener el frontend y las rutas de API (`/api/...`) en el mismo
proyecto, sin necesidad de levantar un backend separado ni pagar por un
servidor. Se despliega gratis en Vercel con soporte nativo, escala solo,
y es el framework de React más usado y mejor documentado hoy en día — lo que
facilita que cualquier desarrollador que contrates en el futuro pueda darle
mantenimiento.

---

## 2. Estructura del proyecto

```
control-jornada/
├── app/
│   ├── login/page.tsx              Pantalla de inicio de sesión
│   ├── empleado/page.tsx           Panel del empleado
│   ├── admin/
│   │   ├── page.tsx                Dashboard / resumen general
│   │   ├── empleados/page.tsx      Gestión de empleados
│   │   ├── registros/page.tsx      Consulta y corrección de registros
│   │   └── qr/page.tsx             Descarga del código QR
│   └── api/                        Backend (rutas API)
│       ├── auth/...                Login, logout, sesión actual
│       ├── registros/...           Marcar entrada/almuerzo/salida
│       ├── empleado/password       Cambio de contraseña propia
│       └── admin/...               Gestión de empleados y registros
├── lib/
│   ├── googleSheets.ts             Toda la integración con Google Sheets
│   ├── auth.ts                     Sesiones (JWT en cookies)
│   ├── password.ts                 Hash de contraseñas (bcrypt)
│   ├── hours.ts                    Cálculo automático de horas y horas extra
│   └── types.ts                    Tipos compartidos
├── components/                     Componentes de interfaz reutilizables
├── scripts/
│   ├── setup-sheets.ts             Crea las pestañas y encabezados en Sheets
│   └── crear-admin.ts              Crea el primer usuario administrador
├── middleware.ts                   Protege /admin y /empleado según sesión
├── .env.example                    Plantilla de variables de entorno
└── README.md                       Este archivo
```

---

## 3. Cómo funciona (resumen funcional)

- **QR** → abre `/login` (no marca asistencia).
- **Empleado** inicia sesión con usuario y contraseña → ve solo sus propios
  registros → botones contextuales: *Registrar entrada*, *Iniciar/Finalizar
  almuerzo*, *"Hoy no tuve hora de almuerzo"*, *Registrar salida*.
- Cada registro guarda automáticamente: fecha, día de la semana, hora de
  entrada, inicio/fin de almuerzo, si hubo almuerzo, hora de salida, horas
  trabajadas (descontando el almuerzo cuando aplica) y observaciones.
- **No se pueden editar registros antiguos** desde el panel del empleado.
  Si alguien olvida marcar la salida, **solo el administrador** puede
  corregirlo desde *Admin → Registros → Corregir*.
- **Horas extra**: el sistema agrupa los registros por semana (lunes a
  domingo) y todo lo que supere el límite semanal (**42 horas** por
  defecto, configurable con `WEEKLY_HOURS_LIMIT`) se calcula automáticamente
  como horas extra.
- **Administrador** ve un dashboard con vista diaria y semanal, filtros por
  empleado/fecha/semana, y puede crear nuevos empleados en cualquier
  momento.
- Todo se refleja **en tiempo real en tu hoja de Google Sheets**, lista para
  exportar a Excel/CSV o usarla para nómina.

---

## 4. Instalación paso a paso

### 4.1. Requisitos previos

- Cuenta de Google (para Google Sheets y Google Cloud).
- Node.js 18 o superior instalado en tu computador ([nodejs.org](https://nodejs.org)).
- Una cuenta gratuita en [Vercel](https://vercel.com) (puedes entrar con tu
  cuenta de GitHub).
- Una cuenta en [GitHub](https://github.com) (para subir el código y
  conectarlo con Vercel).

### 4.2. Crear la hoja de cálculo en Google Sheets

1. Ve a [sheets.google.com](https://sheets.google.com) y crea una hoja de
   cálculo nueva. Nómbrala, por ejemplo, **"Control de Jornada - Datos"**.
2. Copia el ID de la hoja desde la URL. Es la parte marcada aquí:
   `https://docs.google.com/spreadsheets/d/`**`ESTE_ES_EL_ID`**`/edit`
3. Guarda ese ID, lo necesitarás como `GOOGLE_SHEET_ID`.

No necesitas crear las pestañas ni columnas manualmente: el script
`setup:sheets` (paso 4.4) las crea automáticamente con los encabezados
correctos.

### 4.3. Crear la cuenta de servicio de Google (para que la app pueda escribir en tu hoja)

1. Entra a [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un proyecto nuevo (arriba a la izquierda → "Nuevo proyecto"). Ponle
   un nombre como "control-jornada".
3. Con el proyecto seleccionado, ve a **"APIs y servicios" → "Biblioteca"**,
   busca **"Google Sheets API"** y haz clic en **"Habilitar"**.
4. Ve a **"APIs y servicios" → "Credenciales"** → **"Crear credenciales"** →
   **"Cuenta de servicio"**.
5. Dale un nombre (ej. `control-jornada-app`) y crea la cuenta. No necesitas
   asignarle roles adicionales de proyecto.
6. Entra a la cuenta de servicio recién creada → pestaña **"Claves"** →
   **"Agregar clave"** → **"Crear clave nueva"** → tipo **JSON** → Crear.
   Se descargará un archivo `.json`. Guárdalo en un lugar seguro (contiene
   credenciales sensibles, **no lo subas a GitHub**).
7. Abre ese archivo JSON. Necesitarás dos valores:
   - `client_email` → será tu variable `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
   - `private_key` → será tu variable `GOOGLE_PRIVATE_KEY`.
8. **Comparte tu hoja de Google Sheets con esa cuenta de servicio**: abre tu
   hoja → botón **"Compartir"** → pega el `client_email` (algo como
   `control-jornada-app@tu-proyecto.iam.gserviceaccount.com`) → dale
   permisos de **Editor** → Enviar. Este paso es obligatorio, si lo omites
   la aplicación no podrá leer ni escribir en tu hoja.

### 4.4. Configurar el proyecto localmente

1. Descarga/clona este proyecto en tu computador y entra a la carpeta:
   ```bash
   cd control-jornada
   npm install
   ```
2. Copia el archivo de variables de entorno de ejemplo:
   ```bash
   cp .env.example .env.local
   ```
3. Abre `.env.local` y completa:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: el `client_email` del paso 4.3.
   - `GOOGLE_PRIVATE_KEY`: el `private_key` del paso 4.3 (cópialo tal cual,
     entre comillas, con los `\n` incluidos).
   - `GOOGLE_SHEET_ID`: el ID del paso 4.2.
   - `SESSION_SECRET`: genera uno ejecutando en tu terminal
     `openssl rand -base64 48` (o cualquier cadena aleatoria larga).
   - `NEXT_PUBLIC_APP_URL`: por ahora déjalo en `http://localhost:3000`.
   - `INITIAL_ADMIN_USUARIO` / `INITIAL_ADMIN_PASSWORD`: usuario y
     contraseña que quieras para el primer administrador.
4. Crea las pestañas y encabezados en tu hoja de cálculo:
   ```bash
   npm run setup:sheets
   ```
5. Crea tu usuario administrador inicial:
   ```bash
   npm run setup:admin
   ```
6. Levanta la aplicación en tu computador:
   ```bash
   npm run dev
   ```
7. Abre [http://localhost:3000](http://localhost:3000), inicia sesión con
   el usuario/contraseña que configuraste, y ya puedes crear a tu primer
   empleado desde **Admin → Empleados → "+ Nuevo empleado"**.

---

## 5. Despliegue gratuito en Vercel (sin usar la terminal)

No necesitas instalar Node.js ni usar la línea de comandos para desplegar.
Vercel construye la aplicación por ti; solo necesitas subir los archivos a
GitHub.

1. Descomprime el archivo `.zip` del proyecto en tu computador.
2. Entra a [github.com](https://github.com) y crea una cuenta si no
   tienes una.
3. Haz clic en **"New repository"** (Nuevo repositorio). Ponle un nombre
   como `control-jornada`, marca **"Private"** (privado), y haz clic en
   **"Create repository"**.
4. En la página del repositorio recién creado, busca el enlace
   **"uploading an existing file"** (subir un archivo existente).
5. Arrastra **todos los archivos y carpetas** del proyecto descomprimido
   (excepto la carpeta `node_modules` si llegara a existir) a esa página, y
   haz clic en **"Commit changes"**.
6. Entra a [vercel.com](https://vercel.com), inicia sesión con tu cuenta de
   GitHub, haz clic en **"Add New..." → "Project"**, y selecciona el
   repositorio `control-jornada` que acabas de crear.
7. Vercel detectará automáticamente que es un proyecto Next.js. Antes de
   darle a "Deploy", abre la sección **"Environment Variables"** y agrega
   una por una:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` → el `client_email` de tu archivo JSON.
   - `GOOGLE_PRIVATE_KEY` → el `private_key` de tu archivo JSON (cópialo
     completo, tal cual aparece entre comillas, con los `\n` incluidos).
   - `GOOGLE_SHEET_ID` → el ID que copiaste de la URL de tu hoja.
   - `SESSION_SECRET` → cualquier frase larga y aleatoria que inventes
     (mínimo 30 caracteres, ej. `mi-frase-secreta-super-larga-y-dificil-2026`).
   - `WEEKLY_HOURS_LIMIT` → `42` (opcional).
   - `APP_TIMEZONE` → `America/Bogota` (opcional).
   - `INITIAL_ADMIN_NOMBRE`, `INITIAL_ADMIN_CARGO`, `INITIAL_ADMIN_USUARIO`,
     `INITIAL_ADMIN_PASSWORD` → los datos de tu primer administrador
     (elige tú el usuario y la contraseña).
   - `NEXT_PUBLIC_APP_URL` → por ahora déjala como `http://localhost:3000`,
     la corregiremos en el paso 9.
8. Haz clic en **"Deploy"** y espera 1-2 minutos.
9. Cuando termine, Vercel te dará una URL pública, por ejemplo
   `https://control-jornada.vercel.app`. Copia esa URL, ve a
   **Project Settings → Environment Variables**, edita
   `NEXT_PUBLIC_APP_URL` con esa URL real (sin `/` al final), guarda, y
   vuelve a desplegar (**Deployments → ⋯ → Redeploy**).
10. Visita `https://TU-URL.vercel.app/setup` en tu navegador y haz clic en
    **"Ejecutar configuracion inicial"**. Esto crea las pestañas en tu hoja
    de Google Sheets y tu usuario administrador — reemplaza haber tenido
    que ejecutar `npm run setup:sheets` y `npm run setup:admin` en tu
    computador.
11. Ve a `https://TU-URL.vercel.app/login` e inicia sesión con el usuario y
    la contraseña que pusiste en `INITIAL_ADMIN_USUARIO` /
    `INITIAL_ADMIN_PASSWORD`. Desde **Admin → Código QR** puedes descargar
    el QR definitivo, y desde **Admin → Empleados** puedes crear a tus
    empleados.

¡Listo! La aplicación queda funcionando 24/7 de forma gratuita, con HTTPS
automático, y toda la información sincronizándose en tu Google Sheet.

> Si prefieres el flujo con terminal (`npm install`, `npm run dev`, git,
> etc.) para tener un entorno de desarrollo local, sigue la sección 4; es
> opcional y solo lo necesitas si vas a modificar el código.

### 5.1. Actualizaciones futuras

Cada vez que subas cambios de archivos a tu repositorio de GitHub (por
ejemplo, volviendo a usar "Upload files"), Vercel desplegará
automáticamente la nueva versión sin que tengas que hacer nada más.

---

## 6. Uso diario

### Como administrador
- **Admin → Empleados**: crear, editar, activar/desactivar empleados y
  restablecer contraseñas. Al crear un empleado se genera una contraseña
  temporal que debes compartirle (solo se muestra una vez).
- **Admin → Registros**: ver todos los registros, filtrar por empleado,
  fecha o semana, y corregir cualquier campo (por ejemplo, una salida que
  el empleado olvidó marcar).
- **Admin → Código QR**: descargar/imprimir el código QR de acceso.
- **Admin → Resumen**: vista general del día y de horas extra acumuladas.

### Como empleado
- Escanear el QR (o entrar directamente a la URL) → iniciar sesión →
  presionar los botones según avanza el día: *Registrar entrada*,
  *Iniciar almuerzo* / *Hoy no tuve hora de almuerzo*, *Finalizar
  almuerzo*, *Registrar salida*.
- Puede consultar su historial y el resumen de horas de la semana actual,
  pero no puede editar registros pasados.

---

## 7. Estructura de datos en Google Sheets

### Pestaña `Empleados`
`ID · Nombre · Cargo · Usuario · PasswordHash · Rol · Activo · FechaCreacion`

### Pestaña `Registros` (una fila por jornada de un empleado)
`ID · EmpleadoID · NombreEmpleado · Fecha · DiaSemana · HoraEntrada ·
HoraInicioAlmuerzo · HoraFinAlmuerzo · HuboAlmuerzo · HoraSalida ·
TotalHorasTrabajadas · Observaciones · Estado · FechaCreacion ·
FechaModificacion · ModificadoPor`

Puedes usar directamente **Archivo → Descargar → Excel/CSV** desde Google
Sheets, o conectar la hoja a Google Data Studio / Looker Studio, para
generar reportes de nómina.

> **No edites manualmente** la columna `PasswordHash` ni borres filas de la
> pestaña `Empleados`: usa siempre el panel de administración para eso, así
> evitas romper la autenticación.

---

## 8. Seguridad

- Las contraseñas nunca se guardan en texto plano (se cifran con bcrypt).
- Las sesiones usan cookies `httpOnly` + `secure` (en producción) + JWT
  firmado con `SESSION_SECRET`, con expiración de 12 horas.
- `middleware.ts` bloquea el acceso a `/admin/*` si el usuario no tiene rol
  de administrador, y a `/admin/*` y `/empleado/*` si no hay sesión.
- Cada empleado solo puede ver y modificar sus propios registros del día;
  todas las rutas de administración validan en el servidor que quien llama
  tiene rol `admin` (no basta con ocultar botones en la interfaz).
- Nunca subas tu archivo `.env.local` ni el JSON de la cuenta de servicio a
  un repositorio público (`.gitignore` ya excluye `.env*.local`).

---

## 9. Variables de entorno (referencia completa)

Ver `.env.example` para la plantilla completa con comentarios. Resumen:

| Variable | Obligatoria | Descripción |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Sí | Email de la cuenta de servicio de Google Cloud. |
| `GOOGLE_PRIVATE_KEY` | Sí | Clave privada de la cuenta de servicio. |
| `GOOGLE_SHEET_ID` | Sí | ID de tu hoja de cálculo. |
| `SESSION_SECRET` | Sí | Cadena secreta para firmar las sesiones. |
| `NEXT_PUBLIC_APP_URL` | Sí | URL pública de la app (para el QR). |
| `WEEKLY_HOURS_LIMIT` | No (default 42) | Horas semanales antes de contar horas extra. |
| `APP_TIMEZONE` | No (default `America/Bogota`) | Zona horaria usada para calcular "hoy" y la hora actual. |
| `INITIAL_ADMIN_*` | Solo para `npm run setup:admin` | Datos del primer administrador. |

---

## 10. Solución de problemas

- **"Falta la variable de entorno..."**: revisa que `.env.local` (local) o
  las variables en Vercel (producción) estén completas.
- **Error 403 / "The caller does not have permission"** al leer o escribir
  en Sheets: significa que no compartiste la hoja con el `client_email` de
  la cuenta de servicio, o que le diste permiso de solo lectura en vez de
  Editor.
- **El QR no abre la URL correcta**: revisa `NEXT_PUBLIC_APP_URL` en Vercel
  y vuelve a desplegar.
- **Un empleado olvidó registrar la salida**: solo el administrador puede
  corregirlo desde **Admin → Registros → Corregir**.
