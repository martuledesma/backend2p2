# Plataforma de Eventos e Inscripciones — API

Backend II. API REST con Express organizada por capas para una Plataforma de Eventos e Inscripciones.

- **Pre-entrega 1:** refactor arquitectónico inicial (servidor, capas, estructura de `events` y `sessions`).
- **Pre-entrega 2:** registro seguro de usuarios (`POST /api/sessions/register`) con MongoDB y bcrypt.

## Temática elegida

**Plataforma de Eventos e Inscripciones.** El proyecto final permitirá crear y publicar eventos, inscribir usuarios con control de cupos, gestionar roles y autenticación (JWT/Passport) y enviar notificaciones. Por ahora está resuelto el registro de usuarios; login, JWT, cookies, roles y gestión de eventos/inscripciones quedan para las próximas entregas.

## Tecnologías

- Node.js
- Express
- MongoDB + Mongoose
- bcrypt (hash de contraseñas)
- dotenv
- Módulos ESM (`import` / `export`)

## Instalación

```bash
git clone <URL-del-repositorio>
cd proyecto-eventos
npm install
```

## Configuración de variables de entorno

1. Copiar el archivo de ejemplo:

   ```bash
   cp .env.example .env
   ```

2. Completar los valores en `.env`:

   | Variable     | Descripción                                                              |
   | ------------ | ------------------------------------------------------------------------- |
   | `PORT`       | Puerto en el que se levanta el servidor                                    |
   | `NODE_ENV`   | Entorno de ejecución (`development` \| `production`)                      |
   | `MONGO_URL`  | Cadena de conexión a MongoDB (instancia local o cluster de MongoDB Atlas)  |
   | `JWT_SECRET` | Secreto para firmar JWT (se usará a partir del módulo de login)            |

El archivo `.env` **no** se sube al repositorio (está excluido en `.gitignore`). Necesitás una base de MongoDB accesible (local con `mongod` corriendo, o un cluster de Atlas) para que el registro de usuarios funcione: sin conexión válida a `MONGO_URL`, el servidor lo indica por consola y las rutas que dependen de la base no van a poder guardar datos.

## Cómo ejecutar

```bash
npm start
```

Para desarrollo, con reinicio automático ante cambios:

```bash
npm run dev
```

El servidor queda escuchando en el puerto definido por `PORT` (por defecto `8080`) y se conecta a MongoDB al iniciar.

## Estructura de carpetas

```
proyecto-eventos/
├── src/
│   ├── app.js                        # configura Express (no levanta el server)
│   ├── server.js                     # conecta a MongoDB y levanta el servidor
│   ├── config/
│   │   ├── config.js                 # variables de entorno
│   │   └── db.js                     # conexión a MongoDB (Mongoose)
│   ├── routes/
│   │   ├── health.router.js
│   │   ├── events.router.js
│   │   └── sessions.router.js
│   ├── controllers/                  # reciben el request y arman la respuesta
│   ├── services/                     # lógica de negocio (validaciones, reglas)
│   ├── repositories/                 # capa intermedia entre services y DAO
│   ├── dao/                          # acceso a datos (Mongoose)
│   ├── models/
│   │   ├── User.js                   # first_name, last_name, email, password, role
│   │   └── Event.js                  # campos mínimos
│   ├── middlewares/                  # manejo de errores y rutas no encontradas
│   └── utils/
│       ├── hash.js                   # helper de bcrypt (hash / compare)
│       ├── validators.js             # validaciones de email/password
│       └── errors.js                 # error de aplicación con status code
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Rutas disponibles

| Método | Ruta                     | Descripción                                                  |
| ------ | ------------------------ | ------------------------------------------------------------- |
| GET    | `/api/health`            | Indica que el servidor está activo                             |
| GET    | `/api/events`            | Lista de eventos (por ahora devuelve una lista vacía)          |
| GET    | `/api/sessions`          | Estructura inicial de sessions (sin lógica de auth todavía)    |
| POST   | `/api/sessions/register` | Registra un usuario nuevo (ver detalle abajo)                  |

### `GET /api/health` → `200`

```json
{ "status": "ok", "message": "Servidor activo" }
```

### `GET /api/events` → `200`

```json
{ "status": "success", "payload": [] }
```

### `POST /api/sessions/register`

Registra un usuario. Body esperado (JSON):

| Campo        | Tipo   | Obligatorio | Notas                                              |
| ------------ | ------ | ----------- | --------------------------------------------------- |
| `first_name` | string | sí          |                                                       |
| `last_name`  | string | sí          |                                                       |
| `email`      | string | sí          | Se normaliza (trim + lowercase) antes de guardar     |
| `password`   | string | sí          | Mínimo 6 caracteres. Se guarda hasheada con bcrypt   |

El campo `role` **no se acepta desde el body**: todo usuario se crea con rol `user` (valores posibles del modelo: `user`, `organizer`, `admin`, pero solo se asignan roles distintos desde el backend, no vía este endpoint).

**Request de ejemplo:**

```bash
curl -X POST http://localhost:8080/api/sessions/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Ana",
    "last_name": "Pérez",
    "email": "Ana@Mail.com ",
    "password": "Secreta123"
  }'
```

**Respuesta `201`** (email normalizado, sin password):

```json
{
  "status": "success",
  "payload": {
    "id": "665f2a...",
    "first_name": "Ana",
    "last_name": "Pérez",
    "email": "ana@mail.com",
    "role": "user"
  }
}
```

**Respuesta `400`** — campos faltantes, email inválido o password muy corta:

```json
{ "status": "error", "message": "Faltan campos obligatorios" }
```

**Respuesta `409`** — el email ya está registrado:

```json
{ "status": "error", "message": "El email ya está registrado" }
```

### Casos de prueba recomendados

1. Registro exitoso con datos válidos → `201`.
2. Enviar el request sin `first_name`, `last_name`, `email` o `password` → `400`.
3. Enviar un `email` con formato inválido (ej. `"no-es-un-email"`) → `400`.
4. Repetir un registro con el mismo `email` (aunque cambie may/min o espacios) → `409`.
5. Revisar el documento en MongoDB (`db.users.find()`) y confirmar que `password` es un hash de bcrypt, no texto plano.
6. Confirmar que la respuesta del endpoint nunca incluye el campo `password`.

## Próximos pasos (siguientes entregas)

- Login, JWT, cookies y ruta `current`
- Passport (estrategias local y JWT)
- Roles y autorización
- Gestión completa de eventos (alta, baja, modificación)
- Inscripciones con control de cupos
- Notificaciones
