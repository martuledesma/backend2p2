# Plataforma de Eventos e Inscripciones — API

Backend II. API REST con Express organizada por capas para una Plataforma de Eventos e Inscripciones.

- **Pre-entrega 1:** refactor arquitectónico inicial (servidor, capas, estructura de `events` y `sessions`).
- **Pre-entrega 2:** registro seguro de usuarios (`POST /api/sessions/register`) con MongoDB y bcrypt.
- **Pre-entrega 3:** login, JWT, cookie de autenticación, ruta protegida `/current` y logout.
- **Pre-entrega 4:** autenticación centralizada con Passport.js (estrategias `register`, `login` y `current`). El contrato externo de la API no cambió respecto de la Pre-entrega 3.
- **Pre-entrega 5:** roles y autorización. Middleware reutilizable de autorización por rol, matriz de permisos, rutas de `events` protegidas (crear/modificar/cancelar) y una ruta administrativa (`GET /api/users`), diferenciando siempre `401` (sin sesión) de `403` (sin permiso).

## Temática elegida

**Plataforma de Eventos e Inscripciones.** El proyecto final permitirá crear y publicar eventos, inscribir usuarios con control de cupos y enviar notificaciones. Hasta esta entrega está resuelto: autenticación completa (registro, login, JWT/cookie, logout, todo organizado con Passport.js) y autorización por roles sobre la creación/edición de eventos. Inscripciones y control de cupos quedan para las próximas entregas.

## Tecnologías

- Node.js
- Express
- MongoDB + Mongoose
- bcrypt (hash de contraseñas)
- jsonwebtoken (JWT)
- Passport.js + passport-local + passport-jwt (estrategias de autenticación)
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

El archivo `.env` **no** se sube al repositorio (está excluido en `.gitignore`). Necesitás una base de MongoDB accesible (local con `mongod` corriendo, o un cluster de Atlas).

## Cómo ejecutar

```bash
npm start
```

Para desarrollo, con reinicio automático ante cambios:

```bash
npm run dev
```

El servidor queda escuchando en el puerto definido por `PORT` (por defecto `8080`) y se conecta a MongoDB al iniciar.

## Autenticación con Passport.js

Toda la lógica de autenticación pasa por **estrategias de Passport centralizadas en `src/config/passport.config.js`**. `app.js` solo hace `passport.initialize()`.

| Estrategia | Tipo              | Usada en                       | Qué hace                                                                                    |
| ---------- | ----------------- | ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `register` | `passport-local`  | `POST /api/sessions/register`  | Valida campos, normaliza el email, chequea unicidad, hashea la contraseña con bcrypt y crea el usuario con rol `user` por defecto. |
| `login`    | `passport-local`  | `POST /api/sessions/login`     | Busca el usuario por email y compara la contraseña con bcrypt. No genera el JWT: eso lo hace el controller. |
| `current`  | `passport-jwt`    | `GET /api/sessions/current`    | Lee el JWT desde la cookie `currentUser`, lo valida y deja el payload en `req.user`.            |

**Preparado para más estrategias:** alcanza con agregar `passport.use('google', new GoogleStrategy(...))` en `passport.config.js` y usarlo en el router correspondiente, sin tocar `app.js` ni las estrategias existentes.

## Roles y autorización

### Roles

El modelo `User` tiene un campo `role` con tres valores posibles: `user` (default), `organizer` y `admin`. El registro público (`POST /api/sessions/register`) **nunca** acepta `role` desde el body: todo usuario nuevo se crea como `user`, sin importar qué mande el cliente. Los roles `organizer` y `admin` solo se asignan manualmente (por ejemplo, editando el documento en MongoDB) — no hay, en esta entrega, un endpoint público para promover usuarios.

### Matriz de permisos

| Acción                              | `user` | `organizer` | `admin` |
| ------------------------------------ | :----: | :----------: | :-----: |
| Consultar eventos publicados         |   ✅   |      ✅      |   ✅    |
| Crear eventos                        |   ❌   |      ✅      |   ✅    |
| Modificar/cancelar eventos propios   |   ❌   |      ✅      |   ✅    |
| Modificar/cancelar cualquier evento  |   ❌   |      ❌      |   ✅    |
| Ver todos los usuarios               |   ❌   |      ❌      |   ✅    |

### Middlewares

- **`middlewares/auth.middleware.js`** — autenticación. Lee el JWT desde la cookie `currentUser` (vía la estrategia `current` de Passport), lo valida y puebla `req.user` con `{ id, email, role }`. Si no hay sesión válida, responde **401**. Es el mismo middleware que ya protegía `/api/sessions/current` desde la Pre-entrega 3/4.
- **`middlewares/authorize.middleware.js`** *(nuevo)* — autorización por rol. Recibe los roles permitidos como parámetro (`authorize('organizer', 'admin')`) y compara contra `req.user.role`. Si no coincide, responde **403**. Es genérico y reutilizable: no tiene ningún conocimiento de `events` ni de ninguna ruta específica.

Ambos se combinan en la ruta, siempre en este orden:

```js
router.post('/', auth, authorize('organizer', 'admin'), createEvent);
```

`auth` corre primero (¿hay sesión?) y `authorize` después (¿esa sesión tiene el rol necesario?) — de ahí que la falta de sesión sea siempre `401` y la falta de permiso sea siempre `403`, nunca al revés y nunca el mismo código para ambos casos.

### 401 vs 403 — la diferencia

- **`401 No autenticado`** → no hay cookie, o el JWT es inválido/está manipulado/expiró. El servidor no sabe quién sos.
- **`403 No tenés permisos para realizar esta acción`** → el servidor sabe perfectamente quién sos (la sesión es válida), pero tu rol no alcanza para esa acción puntual. También se usa (con mensaje propio) cuando un `organizer` intenta modificar un evento que no es suyo.

### Propiedad de recursos (ownership)

Crear un evento con rol `organizer` o `admin` no alcanza para modificar o cancelar *cualquier* evento: `events.service.js` valida que `event.organizer` coincida con `req.user.id` antes de aplicar cambios. Si no coincide y el usuario no es `admin`, devuelve `403`. Si el evento no existe, devuelve `404` (nunca `500` para estos casos).

## Estructura de carpetas

```
proyecto-eventos/
├── src/
│   ├── app.js                        # configura Express + passport.initialize()
│   ├── server.js                     # conecta a MongoDB y levanta el servidor
│   ├── config/
│   │   ├── config.js                 # variables de entorno
│   │   ├── db.js                     # conexión a MongoDB (Mongoose)
│   │   └── passport.config.js        # estrategias 'register', 'login' y 'current'
│   ├── routes/
│   │   ├── health.router.js
│   │   ├── events.router.js          # GET público; POST/PUT/PATCH protegidas con auth + authorize
│   │   ├── sessions.router.js
│   │   └── users.router.js           # GET /api/users, solo admin
│   ├── controllers/
│   │   ├── events.controller.js
│   │   ├── sessions.controller.js
│   │   ├── users.controller.js
│   │   └── health.controller.js
│   ├── services/
│   │   └── events.service.js         # valida datos y propiedad del recurso (ownership)
│   ├── repositories/                 # capa intermedia entre controllers/services y DAO
│   ├── dao/                          # acceso a datos (Mongoose)
│   ├── models/
│   │   ├── User.js                   # first_name, last_name, email, password, role
│   │   └── Event.js                  # title, description, date, location, organizer, status
│   ├── middlewares/
│   │   ├── auth.middleware.js        # autenticación (401)
│   │   ├── authorize.middleware.js   # autorización por rol (403)
│   │   ├── notFound.middleware.js
│   │   └── errorHandler.middleware.js
│   └── utils/
│       ├── hash.js                   # helper de bcrypt (hash / compare)
│       ├── jwt.js                    # firma el JWT (la verificación la hace passport-jwt)
│       ├── validators.js             # validaciones de email/password
│       └── errors.js                 # error de aplicación con status code
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

> `sessions` no tiene un `services/sessions.service.js` propio: esa lógica vive dentro de las estrategias de Passport (`passport.config.js`) desde la Pre-entrega 4, para no duplicarla en dos lugares.

## Rutas disponibles

| Método | Ruta                         | Auth requerida | Rol requerido        | Descripción                                     |
| ------ | ---------------------------- | :-------------: | --------------------- | ------------------------------------------------- |
| GET    | `/api/health`                | No               | —                      | Indica que el servidor está activo                 |
| GET    | `/api/events`                | No               | —                      | Lista de eventos publicados                        |
| POST   | `/api/events`                | Sí               | `organizer`, `admin`  | Crea un evento nuevo                               |
| PUT    | `/api/events/:id`            | Sí               | `organizer`*, `admin` | Modifica un evento (*organizer solo el suyo)       |
| PATCH  | `/api/events/:id/cancel`     | Sí               | `organizer`*, `admin` | Cancela un evento (*organizer solo el suyo)        |
| GET    | `/api/sessions`              | No               | —                      | Estructura inicial de sessions                     |
| POST   | `/api/sessions/register`     | No               | —                      | Registra un usuario nuevo                          |
| POST   | `/api/sessions/login`        | No               | —                      | Inicia sesión y setea la cookie `currentUser`      |
| GET    | `/api/sessions/current`      | Sí               | cualquiera             | Devuelve los datos del usuario autenticado         |
| POST   | `/api/sessions/logout`       | No               | —                      | Cierra la sesión (borra la cookie)                 |
| GET    | `/api/users`                 | Sí               | `admin`                | Lista todos los usuarios (sin password)            |

### `GET /api/health` → `200`

```json
{ "status": "ok", "message": "Servidor activo" }
```

### `GET /api/events` → `200`

```json
{ "status": "success", "payload": [] }
```

### `POST /api/events`

Body esperado: `{ "title": "...", "description": "...", "date": "...", "location": "..." }` (`title` es obligatorio). El `organizer` del evento se toma siempre de `req.user.id` (el usuario autenticado), nunca del body.

**Con rol `user`** → `403`:

```json
{ "status": "error", "message": "No tenés permisos para realizar esta acción" }
```

**Con rol `organizer` o `admin`** → `201`:

```json
{
  "status": "success",
  "payload": { "id": "6690...", "title": "Congreso Tech 2026", "organizer": "665f2a...", "status": "published" }
}
```

**Sin cookie** → `401`:

```json
{ "status": "error", "message": "No autenticado" }
```

### `PUT /api/events/:id` y `PATCH /api/events/:id/cancel`

Mismas reglas de auth/rol que crear. Además, si el usuario es `organizer` y el evento no es suyo → `403`:

```json
{ "status": "error", "message": "No podés modificar un evento que no te pertenece" }
```

Si el evento no existe → `404`:

```json
{ "status": "error", "message": "Evento no encontrado" }
```

### `GET /api/users`

Solo `admin`. Con rol `user` u `organizer` (autenticados) → `403` (mismo mensaje genérico de arriba). Sin cookie → `401`. Con `admin` → `200`:

```json
{
  "status": "success",
  "payload": [
    { "id": "665f2a...", "first_name": "Ana", "last_name": "Pérez", "email": "ana@mail.com", "role": "user" }
  ]
}
```

### `POST /api/sessions/register`

Body esperado (JSON):

| Campo        | Tipo   | Obligatorio | Notas                                              |
| ------------ | ------ | ----------- | --------------------------------------------------- |
| `first_name` | string | sí          |                                                       |
| `last_name`  | string | sí          |                                                       |
| `email`      | string | sí          | Se normaliza (trim + lowercase) antes de guardar     |
| `password`   | string | sí          | Mínimo 6 caracteres. Se guarda hasheada con bcrypt   |

El campo `role` **no se acepta desde el body**.

**Respuesta `201`** (email normalizado, sin password):

```json
{
  "status": "success",
  "payload": { "id": "665f2a...", "first_name": "Ana", "last_name": "Pérez", "email": "ana@mail.com", "role": "user" }
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

Body esperado: `{ "email": "...", "password": "..." }`. Si las credenciales son correctas, firma un JWT (`{ id, email, role }`) y lo guarda en una cookie `currentUser` (`httpOnly`, `sameSite: 'lax'`, `maxAge: 3600000` ms, `secure: true` solo en producción).

**Respuesta `200`:**

```json
{ "status": "success", "message": "Login correcto" }
```

**Respuesta `401`** — credenciales inválidas (mensaje siempre genérico):

```json
{ "status": "error", "message": "Credenciales inválidas" }
```

### `GET /api/sessions/current`

**Respuesta `200`:**

```json
{ "status": "success", "payload": { "id": "665f2a...", "email": "ana@mail.com", "role": "user" } }
```

**Respuesta `401`** — sin cookie, o token inválido/manipulado/expirado:

```json
{ "status": "error", "message": "No autenticado" }
```

### `POST /api/sessions/logout`

**Respuesta `200`:**

```json
{ "status": "success", "message": "Sesión cerrada" }
```

### Casos de prueba recomendados

1. `POST /api/events` con rol `user` → `403`.
2. `POST /api/events` con rol `organizer` (o `admin`) → `201`.
3. `GET /api/users` con rol `organizer` → `403`.
4. `GET /api/users` con rol `admin` → `200`.
5. Cualquier ruta privada sin cookie → `401`.
6. `organizer` intentando modificar (`PUT`) o cancelar (`PATCH .../cancel`) un evento de otro `organizer` → `403`.
7. Registro exitoso → login → `/current` (200) → logout → `/current` (401) — se sigue cumpliendo igual que en la Pre-entrega 3/4.
8. Confirmar que ninguna respuesta (register, login, current, users) incluye el campo `password`.

## Próximos pasos (siguientes entregas)

- Inscripciones a eventos con control de cupos
- Notificaciones
- Endpoint administrativo para cambiar el rol de un usuario
- Estrategias adicionales en `passport.config.js` para providers externos (Google, GitHub)
