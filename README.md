# Plataforma de Eventos e Inscripciones — API

Backend II. API REST con Express organizada por capas para una Plataforma de Eventos e Inscripciones.

- **Pre-entrega 1:** refactor arquitectónico inicial (servidor, capas, estructura de `events` y `sessions`).
- **Pre-entrega 2:** registro seguro de usuarios (`POST /api/sessions/register`) con MongoDB y bcrypt.
- **Pre-entrega 3:** login, JWT, cookie de autenticación, ruta protegida `/current` y logout.

## Temática elegida

**Plataforma de Eventos e Inscripciones.** El proyecto final permitirá crear y publicar eventos, inscribir usuarios con control de cupos, gestionar roles y notificaciones. Hasta esta entrega está resuelto el flujo completo de autenticación (registro, login, sesión vía JWT/cookie, logout); roles avanzados, gestión de eventos e inscripciones quedan para las próximas entregas.

## Tecnologías

- Node.js
- Express
- MongoDB + Mongoose
- bcrypt (hash de contraseñas)
- jsonwebtoken (JWT)
- cookie-parser (lectura de cookies)
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

   | Variable         | Descripción                                                              |
   | ---------------- | ------------------------------------------------------------------------- |
   | `PORT`           | Puerto en el que se levanta el servidor                                    |
   | `NODE_ENV`       | Entorno de ejecución (`development` \| `production`)                      |
   | `MONGO_URL`      | Cadena de conexión a MongoDB (instancia local o cluster de MongoDB Atlas)  |
   | `JWT_SECRET`     | Secreto para firmar los JWT (usar un valor largo y aleatorio, nunca hardcodeado) |
   | `JWT_EXPIRES_IN` | Expiración del JWT (ej. `1h`, `7d`)                                        |

El archivo `.env` **no** se sube al repositorio (está excluido en `.gitignore`). Necesitás una base de MongoDB accesible (local con `mongod` corriendo, o un cluster de Atlas) para que el registro y el login funcionen.

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
│   ├── middlewares/
│   │   ├── auth.middleware.js        # lee la cookie, verifica el JWT, setea req.user
│   │   ├── notFound.middleware.js
│   │   └── errorHandler.middleware.js
│   └── utils/
│       ├── hash.js                   # helper de bcrypt (hash / compare)
│       ├── jwt.js                    # firmar/verificar JWT
│       ├── validators.js             # validaciones de email/password
│       └── errors.js                 # error de aplicación con status code
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Rutas disponibles

| Método | Ruta                      | Auth requerida | Descripción                                       |
| ------ | ------------------------- | :-------------: | -------------------------------------------------- |
| GET    | `/api/health`             | No               | Indica que el servidor está activo                  |
| GET    | `/api/events`             | No               | Lista de eventos (por ahora devuelve lista vacía)   |
| GET    | `/api/sessions`           | No               | Estructura inicial de sessions                      |
| POST   | `/api/sessions/register`  | No               | Registra un usuario nuevo                           |
| POST   | `/api/sessions/login`     | No               | Inicia sesión y setea la cookie `currentUser`       |
| GET    | `/api/sessions/current`   | Sí (cookie)      | Devuelve los datos del usuario autenticado          |
| POST   | `/api/sessions/logout`    | No               | Cierra la sesión (borra la cookie)                  |

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

El campo `role` **no se acepta desde el body**: todo usuario se crea con rol `user` por defecto (valores posibles del modelo: `user`, `organizer`, `admin`).

**Request:**

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

### `POST /api/sessions/login`

Body esperado:

| Campo      | Tipo   | Obligatorio |
| ---------- | ------ | ----------- |
| `email`    | string | sí          |
| `password` | string | sí          |

Si las credenciales son correctas, firma un JWT (payload `{ id, email, role }`, expira según `JWT_EXPIRES_IN`) y lo guarda en una cookie `currentUser` (`httpOnly`, `sameSite: 'lax'`, `maxAge: 3600000` ms, `secure: true` solo cuando `NODE_ENV=production`).

**Request** (con `-c` para guardar la cookie en un archivo):

```bash
curl -c cookies.txt -X POST http://localhost:8080/api/sessions/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "ana@mail.com", "password": "Secreta123" }'
```

**Respuesta `200`** (además setea la cookie `currentUser` HttpOnly):

```json
{ "status": "success", "message": "Login correcto" }
```

**Respuesta `400`** — faltan `email` o `password`:

```json
{ "status": "error", "message": "Faltan campos obligatorios" }
```

**Respuesta `401`** — email inexistente o contraseña incorrecta (mensaje siempre genérico, sin indicar cuál falló):

```json
{ "status": "error", "message": "Credenciales inválidas" }
```

### `GET /api/sessions/current`

Requiere la cookie `currentUser` (la que setea `/login`). El middleware `auth` la lee, verifica el JWT y arma `req.user`.

**Request** (reutilizando la cookie guardada):

```bash
curl -b cookies.txt http://localhost:8080/api/sessions/current
```

**Respuesta `200`:**

```json
{ "status": "success", "payload": { "id": "665f2a...", "email": "ana@mail.com", "role": "user" } }
```

**Respuesta `401`** — sin cookie, o token inválido/manipulado/expirado:

```json
{ "status": "error", "message": "No autenticado" }
```

### `POST /api/sessions/logout`

Elimina la cookie `currentUser`.

**Request:**

```bash
curl -b cookies.txt -X POST http://localhost:8080/api/sessions/logout
```

**Respuesta `200`:**

```json
{ "status": "success", "message": "Sesión cerrada" }
```

Después de un logout, un `GET /api/sessions/current` con esa misma cookie vuelve a devolver `401`.

### Casos de prueba recomendados

1. Registro exitoso → login → `/current` (200) → logout → `/current` (401).
2. Login con un email que no está registrado → `401` "Credenciales inválidas".
3. Login con la contraseña incorrecta → `401` "Credenciales inválidas".
4. `GET /current` sin ninguna cookie → `401` "No autenticado".
5. `GET /current` con un token manipulado (cambiar un carácter del JWT) o expirado (`JWT_EXPIRES_IN` muy corto, ej. `5s`, y esperar) → `401` "No autenticado".
6. Confirmar que ninguna respuesta (register, login, current) incluye el campo `password`.

## Próximos pasos (siguientes entregas)

- Passport (estrategias local y JWT) sobre esta misma base de auth
- Roles y autorización por endpoint (`organizer`, `admin`)
- Gestión completa de eventos (alta, baja, modificación)
- Inscripciones con control de cupos
- Notificaciones
