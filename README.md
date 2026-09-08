# Plataforma de Eventos e Inscripciones — API

Backend II. API REST con Express organizada por capas para una Plataforma de Eventos e Inscripciones.

- **Pre-entrega 1:** refactor arquitectónico inicial (servidor, capas, estructura de `events` y `sessions`).
- **Pre-entrega 2:** registro seguro de usuarios (`POST /api/sessions/register`) con MongoDB y bcrypt.
- **Pre-entrega 3:** login, JWT, cookie de autenticación, ruta protegida `/current` y logout.
- **Pre-entrega 4:** autenticación centralizada con Passport.js (estrategias `register`, `login` y `current`). El contrato externo de la API no cambió respecto de la Pre-entrega 3.
- **Pre-entrega 5:** roles y autorización. Middleware reutilizable de autorización por rol, matriz de permisos, rutas de `events` protegidas (crear/modificar/cancelar) y una ruta administrativa (`GET /api/users`), diferenciando siempre `401` (sin sesión) de `403` (sin permiso).
- **Pre-entrega 6:** entidad `Event` completa y lógica de negocio. Modelo ampliado (`category`, `capacity`, `price`, ciclo de vida de `status`), endpoint de detalle (`GET /api/events/:id`), reglas de negocio en la capa de servicio (fecha no pasada, capacidad/precio válidos, eventos cancelados inmodificables, no se puede publicar un evento finalizado) y listado con filtros + paginación + ordenamiento.
- **Pre-entrega 7:** tickets, inscripciones y control de cupos. Entidad `Ticket` (referencias a `user` y `event`, nunca objetos embebidos), inscripción a eventos con las reglas de negocio de la consigna (evento publicado, cupos disponibles, sin duplicados), cancelación que libera el cupo automáticamente, listado de "mis tickets" con los datos del evento resueltos vía `populate`, y email de confirmación con Nodemailer.

## Temática elegida

**Plataforma de Eventos e Inscripciones.** Hasta esta entrega está resuelto: autenticación completa (registro, login, JWT/cookie, logout, con Passport.js), autorización por roles, la entidad `Event` con su ciclo de vida y reglas de negocio, y ahora el flujo completo de inscripciones: un usuario autenticado se inscribe a un evento publicado, el sistema controla el cupo disponible, evita inscripciones duplicadas, permite cancelar (liberando el cupo) y avisa por email cuando la inscripción queda confirmada. Quedan para las próximas entregas: notificaciones adicionales (recordatorios, cambios de estado del evento) y un panel administrativo más completo.

## Tecnologías

- Node.js
- Express
- MongoDB + Mongoose
- bcrypt (hash de contraseñas)
- jsonwebtoken (JWT)
- Passport.js + passport-local + passport-jwt (estrategias de autenticación)
- cookie-parser (lectura de cookies)
- Nodemailer (email de confirmación de inscripción)
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
   | `MAIL_HOST`      | Host SMTP para el envío del email de confirmación de inscripción           |
   | `MAIL_PORT`      | Puerto SMTP (ej. `587`)                                                    |
   | `MAIL_USER`      | Usuario SMTP                                                               |
   | `MAIL_PASS`      | Contraseña SMTP                                                            |
   | `MAIL_FROM`      | Remitente que aparece en los emails enviados                              |

El archivo `.env` **no** se sube al repositorio (está excluido en `.gitignore`). Necesitás una base de MongoDB accesible (local con `mongod` corriendo, o un cluster de Atlas).

Las credenciales de `MAIL_*` **nunca están hardcodeadas** en el código: `src/utils/mailer.js` las lee siempre desde `config.mail` (que a su vez sale de `process.env`). Si no se completan, el servidor sigue funcionando normalmente — la inscripción se confirma igual, solo que el envío del email se omite con un warning en consola. Para probar sin depender de una cuenta de mail real, se puede usar [Ethereal Email](https://ethereal.email): genera un usuario/contraseña SMTP de prueba gratis y, por cada mail enviado, un link de preview para verlo (no llega a ninguna casilla real, pero sirve como evidencia de que el envío funciona).

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

Crear un evento con rol `organizer` o `admin` no alcanza para modificar o cambiar el estado de *cualquier* evento: `events.service.js` valida que `event.organizer` coincida con `req.user.id` antes de aplicar cambios. Si no coincide y el usuario no es `admin`, devuelve `403`. Si el evento no existe, devuelve `404` (nunca `500` para estos casos).

## Entidad `Event` y ciclo de vida

### Modelo

| Campo         | Tipo                  | Obligatorio | Notas                                                        |
| ------------- | --------------------- | :---------: | -------------------------------------------------------------- |
| `title`       | string                |     sí      | se guarda con `trim`                                            |
| `description` | string                |     sí      | se guarda con `trim`                                            |
| `category`    | string                |     sí      | texto libre (ej. `workshop`, `sports`, `music`)                 |
| `date`        | Date                  |     sí      | no puede ser una fecha ya pasada al crear o al actualizar        |
| `location`    | string                |     sí      | se guarda con `trim`                                             |
| `capacity`    | number                |     sí      | debe ser `> 0`                                                   |
| `price`       | number                |     sí      | debe ser `>= 0`                                                  |
| `organizer`   | ObjectId (ref `User`) |     sí      | **referencia**, nunca el objeto de usuario embebido; siempre sale de `req.user.id`, nunca del body |
| `status`      | string (enum)         |     sí      | `draft` (default) → `published` → `cancelled` \| `finished`      |

### Ciclo de vida de `status`

Un evento **nace en `draft`**. Para publicarlo, cancelarlo o marcarlo como finalizado hay que usar `PATCH /api/events/:id/status` — el `status` nunca se cambia por `PUT`.

Reglas aplicadas en `events.service.js` (nunca en las rutas ni en el controller):

- **Un evento cancelado no se puede modificar de ninguna forma** (ni `PUT` de sus campos, ni un nuevo `PATCH /status`) → `400`. La única forma de "revertir" esto sería una corrección manual documentada en la base, fuera del flujo normal de la API.
- **No se puede publicar (`status: "published"`) un evento que ya está `finished`** → `400`.
- El `status` enviado en `PATCH /status` tiene que ser uno de `draft`, `published`, `cancelled`, `finished`; cualquier otro valor → `400`.

### Otras validaciones de negocio (crear y actualizar)

- `date` no puede ser una fecha pasada (ni al crear, ni al actualizar con `PUT`).
- `capacity` tiene que ser un número mayor a `0`.
- `price` tiene que ser un número mayor o igual a `0`.
- `title`, `description`, `category` y `location` son obligatorios al crear.

Todas responden `400` con un mensaje descriptivo — nunca `500`.

## Entidad `Ticket` e inscripciones

### Modelo

| Campo             | Tipo                   | Obligatorio | Notas                                                          |
| ------------------ | ---------------------- | :---------: | ----------------------------------------------------------------- |
| `user`             | ObjectId (ref `User`)  |     sí      | **referencia**, nunca el objeto de usuario embebido                |
| `event`            | ObjectId (ref `Event`) |     sí      | **referencia**, nunca el objeto de evento embebido                 |
| `status`           | string (enum)          |     sí      | `confirmed` (default) \| `pending` (reservado a futuro) \| `cancelled` |
| `quantity`         | number                 |     sí      | debe ser un entero `> 0`; default `1` si no se envía               |
| `reservationCode`  | string                 |     sí      | código único generado por el server (ej. `RES-M4K2X1-A3F9C2`)      |
| `createdAt`        | Date                   | (automático) | vía `timestamps`                                                  |
| `cancelledAt`      | Date                   | `null`      | se completa recién al cancelar                                     |

### Flujo de inscripción

`POST /api/events/:eid/tickets` — cualquier usuario **autenticado** (`user`, `organizer` o `admin`, sin restricción de rol) puede inscribirse a un evento. Todas las validaciones viven en `tickets.service.js`, nunca en la ruta ni en el controller:

1. El evento tiene que existir → si no, `404`.
2. El evento tiene que estar `published` (si está `cancelled` o `finished`, mensaje específico; cualquier otro estado no publicado, mensaje genérico) → `400`.
3. `quantity` (si se envía) tiene que ser un entero `> 0` → `400`. Si no se envía, se asume `1`.
4. Tiene que haber cupo suficiente: `capacity` del evento menos la suma de `quantity` de todos los tickets **no cancelados** de ese evento tiene que ser `>= quantity` solicitada → `400` con un mensaje que incluye cuántos cupos quedan.
5. El usuario no puede tener ya un ticket **activo** (no cancelado) para ese mismo evento → `409` (una inscripción por usuario por evento).

Si todo pasa: se crea el ticket con `status: "confirmed"` y se dispara el email de confirmación (best-effort: si el email falla, la inscripción ya quedó guardada y no se revierte).

### Control de cupos

El cupo ocupado de un evento se calcula sumando `quantity` de **todos los tickets con `status !== "cancelled"`** (es decir, `confirmed` y `pending` cuentan; `cancelled` no). No hay un contador separado que se pueda desincronizar: se recalcula on-demand a partir de los tickets existentes, así que cancelar un ticket libera el cupo automáticamente sin ningún paso extra.

### Cancelación

`PATCH /api/tickets/:tid/cancel` — el dueño del ticket, o un `admin`. Cambia `status` a `cancelled` y completa `cancelledAt`; **el documento nunca se borra** (queda el historial). Si el ticket no existe → `404`; si no es del usuario (y no es admin) → `403`; si ya estaba cancelado → `400`.

### Consultar mis tickets

`GET /api/tickets/my-tickets` — devuelve únicamente los tickets del usuario autenticado, con el campo `event` resuelto vía `populate('event', 'title date location')`: solo esos tres campos del evento (nunca el evento completo, ni el organizer, ni nada de otros usuarios).

### Ver quién se inscribió a un evento

`GET /api/events/:eid/tickets` — el `organizer` dueño de **ese** evento puntual, o un `admin`. Un `organizer` que no es dueño del evento consultado → `403` (mismo criterio de propiedad que `PUT`/`PATCH` sobre eventos). Un `user` común → `403` directamente (el rol no alcanza).

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
│   │   ├── events.router.js          # GET público; POST/PUT/PATCH protegidas; también /:eid/tickets
│   │   ├── sessions.router.js
│   │   ├── users.router.js           # GET /api/users, solo admin
│   │   └── tickets.router.js         # /api/tickets/my-tickets y /api/tickets/:tid/cancel
│   ├── controllers/
│   │   ├── events.controller.js
│   │   ├── sessions.controller.js
│   │   ├── users.controller.js
│   │   ├── tickets.controller.js
│   │   └── health.controller.js
│   ├── services/
│   │   ├── events.service.js         # valida datos y propiedad del recurso (ownership)
│   │   └── tickets.service.js        # reglas de inscripción, cupos y cancelación
│   ├── repositories/                 # capa intermedia entre controllers/services y DAO
│   ├── dao/                          # acceso a datos (Mongoose)
│   ├── models/
│   │   ├── User.js                   # first_name, last_name, email, password, role
│   │   ├── Event.js                  # title, description, category, date, location, capacity, price, organizer, status
│   │   └── Ticket.js                 # user, event, status, quantity, reservationCode, cancelledAt
│   ├── middlewares/
│   │   ├── auth.middleware.js        # autenticación (401)
│   │   ├── authorize.middleware.js   # autorización por rol (403)
│   │   ├── notFound.middleware.js
│   │   └── errorHandler.middleware.js
│   └── utils/
│       ├── hash.js                   # helper de bcrypt (hash / compare)
│       ├── jwt.js                    # firma el JWT (la verificación la hace passport-jwt)
│       ├── validators.js             # validaciones de email/password
│       ├── errors.js                 # error de aplicación con status code
│       └── mailer.js                 # Nodemailer: envía el email de confirmación de inscripción
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
| GET    | `/api/events`                | No               | —                      | Lista eventos, con filtros + paginación + orden    |
| GET    | `/api/events/:id`            | No               | —                      | Detalle de un evento                               |
| POST   | `/api/events`                | Sí               | `organizer`, `admin`  | Crea un evento nuevo (nace en `draft`)             |
| PUT    | `/api/events/:id`            | Sí               | `organizer`*, `admin` | Modifica los campos de un evento (*solo el suyo)   |
| PATCH  | `/api/events/:id/status`     | Sí               | `organizer`*, `admin` | Cambia el estado del evento (*solo el suyo)        |
| POST   | `/api/events/:eid/tickets`   | Sí               | cualquiera             | Inscribirse a un evento                            |
| GET    | `/api/events/:eid/tickets`   | Sí               | `organizer`*, `admin` | Lista inscriptos de un evento (*solo el suyo)      |
| GET    | `/api/tickets/my-tickets`    | Sí               | cualquiera             | Mis tickets (con datos del evento vía `populate`)  |
| PATCH  | `/api/tickets/:tid/cancel`   | Sí               | dueño del ticket*, `admin` | Cancela un ticket (*el propio)                |
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

Pública. Soporta filtros, paginación y ordenamiento por query string:

| Query param | Descripción                                              |
| ----------- | ----------------------------------------------------------- |
| `status`    | filtra por estado exacto (`draft`, `published`, `cancelled`, `finished`) |
| `category`  | filtra por categoría (comparación sin mayúsculas/minúsculas) |
| `location`  | filtra por ubicación (comparación sin mayúsculas/minúsculas) |
| `dateFrom`  | solo eventos con `date >= dateFrom`                         |
| `dateTo`    | solo eventos con `date <= dateTo`                            |
| `page`      | número de página (default `1`)                              |
| `limit`     | resultados por página (default `10`)                        |
| `sort`      | campo por el que ordenar, ej. `date` (ascendente) o `-date` (descendente) |

Ejemplo: `GET /api/events?status=published&category=workshop&page=2&limit=5`

```json
{
  "status": "success",
  "payload": {
    "data": [ { "id": "6690...", "title": "Workshop de Node", "category": "workshop", "status": "published", "...": "..." } ],
    "page": 2,
    "limit": 5,
    "total": 12,
    "totalPages": 3
  }
}
```

### `GET /api/events/:id`

Pública. `200` con el evento si existe:

```json
{ "status": "success", "payload": { "id": "6690...", "title": "Workshop de Node", "status": "draft", "...": "..." } }
```

Si no existe → `404`:

```json
{ "status": "error", "message": "Evento no encontrado" }
```

### `POST /api/events`

Body esperado: `{ "title": "...", "description": "...", "category": "...", "date": "...", "location": "...", "capacity": 20, "price": 0 }` (todos obligatorios salvo que se documenten como opcionales). El `organizer` se toma siempre de `req.user.id` (nunca del body) y el evento **nace en `status: "draft"`**, sin importar qué mande el body.

**Con rol `user`** → `403`:

```json
{ "status": "error", "message": "No tenés permisos para realizar esta acción" }
```

**Con fecha pasada** → `400`:

```json
{ "status": "error", "message": "La fecha del evento no puede ser en el pasado" }
```

**Con `capacity <= 0` o `price < 0`** → `400`:

```json
{ "status": "error", "message": "La capacidad debe ser un número mayor a 0" }
```

**Con rol `organizer` o `admin` y datos válidos** → `201`:

```json
{
  "status": "success",
  "payload": {
    "id": "6690...",
    "title": "Congreso Tech 2026",
    "category": "workshop",
    "date": "2026-11-01T00:00:00.000Z",
    "location": "CABA",
    "capacity": 100,
    "price": 500,
    "organizer": "665f2a...",
    "status": "draft"
  }
}
```

**Sin cookie** → `401`:

```json
{ "status": "error", "message": "No autenticado" }
```

### `PUT /api/events/:id`

Modifica campos del evento (`title`, `description`, `category`, `date`, `location`, `capacity`, `price` — **nunca** `status` ni `organizer`). Mismas validaciones de negocio que al crear sobre los campos enviados (fecha no pasada, `capacity > 0`, `price >= 0`).

Si el usuario es `organizer` y el evento no es suyo → `403`:

```json
{ "status": "error", "message": "No podés modificar un evento que no te pertenece" }
```

Si el evento está `cancelled` → `400`:

```json
{ "status": "error", "message": "No se puede modificar un evento cancelado" }
```

Si el evento no existe → `404`:

```json
{ "status": "error", "message": "Evento no encontrado" }
```

### `PATCH /api/events/:id/status`

Body esperado: `{ "status": "published" }` (o `"cancelled"` / `"finished"` / `"draft"`). Mismas reglas de propiedad que `PUT`, más las reglas de ciclo de vida: no se puede cambiar el estado de un evento `cancelled`, y no se puede `publish` un evento `finished`.

**Estado inválido** (no es uno de los 4 valores permitidos) → `400`:

```json
{ "status": "error", "message": "Estado inválido. Debe ser uno de: draft, published, cancelled, finished" }
```

**Éxito** → `200` con el evento actualizado.

### `POST /api/events/:eid/tickets`

Inscribe al usuario autenticado al evento `:eid`. Body opcional: `{ "quantity": 2 }` (si no se envía, `quantity` es `1`).

**Éxito** → `201`:

```json
{
  "status": "success",
  "payload": {
    "id": "6690...",
    "user": "665f2a...",
    "event": "6690...",
    "status": "confirmed",
    "quantity": 1,
    "reservationCode": "RES-M4K2X1-A3F9C2",
    "createdAt": "2026-09-08T20:00:00.000Z",
    "cancelledAt": null
  }
}
```

**Evento cancelado o finalizado** → `400`:

```json
{ "status": "error", "message": "No te podés inscribir: el evento está cancelado" }
```

**Sin cupo suficiente** → `400`:

```json
{ "status": "error", "message": "No hay cupos suficientes para este evento. Cupos disponibles: 0" }
```

**Inscripción duplicada** (ya tenés un ticket activo para ese evento) → `409`:

```json
{ "status": "error", "message": "Ya tenés una inscripción activa para este evento" }
```

**Evento inexistente** → `404`. **Sin cookie** → `401`.

### `GET /api/tickets/my-tickets` → `200`

```json
{
  "status": "success",
  "payload": [
    {
      "id": "6690...",
      "user": "665f2a...",
      "event": { "_id": "6690...", "title": "Workshop de Node", "date": "2026-11-01T00:00:00.000Z", "location": "CABA" },
      "status": "confirmed",
      "quantity": 1,
      "reservationCode": "RES-M4K2X1-A3F9C2",
      "createdAt": "2026-09-08T20:00:00.000Z",
      "cancelledAt": null
    }
  ]
}
```

### `GET /api/events/:eid/tickets` → `200`

Lista los tickets (de todos los usuarios) inscriptos a ese evento — solo visible para el `organizer` dueño del evento o un `admin`. El campo `user` viene resuelto vía `populate('user', 'first_name last_name email')`: el organizer ve quién se inscribió (nombre y email), pero nunca el password ni ningún otro dato sensible.

**`organizer` de otro evento, o `user` común** → `403`:

```json
{ "status": "error", "message": "No podés ver las inscripciones de un evento que no es tuyo" }
```

### `PATCH /api/tickets/:tid/cancel`

**Éxito** → `200` con el ticket (`status: "cancelled"`, `cancelledAt` completo).

**Ticket ajeno (no admin)** → `403`:

```json
{ "status": "error", "message": "No podés cancelar un ticket que no es tuyo" }
```

**Ya estaba cancelado** → `400`. **Ticket inexistente** → `404`.

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
2. `POST /api/events` con fecha pasada → `400` (error de validación).
3. `POST /api/events` con `capacity: 0` (o `price` negativo) → `400` (error de validación).
4. `organizer` modifica (`PUT`) un evento propio → `200`.
5. `organizer` modifica (`PUT`) un evento ajeno → `403`.
6. `admin` modifica (`PUT`) el evento de otro `organizer` → `200`.
7. `PATCH /api/events/:id/status` sobre un evento ya `cancelled` → `400` (no se puede modificar).
8. `GET /api/events?status=published&category=workshop&page=2&limit=5` → `200`, respuesta con `data`/`page`/`limit`/`total`/`totalPages` y solo eventos que cumplen ambos filtros.
9. `GET /api/events/:id` con un id que no existe → `404`.
10. `GET /api/users` con rol `organizer` → `403`; con rol `admin` → `200`. (Pre-entrega 5, se sigue cumpliendo.)
11. Cualquier ruta privada sin cookie → `401`.
12. Registro exitoso → login → `/current` (200) → logout → `/current` (401) — se sigue cumpliendo igual que en la Pre-entrega 3/4.
13. Confirmar que ninguna respuesta (register, login, current, users) incluye el campo `password`.

### Casos de prueba — tickets e inscripciones (Pre-entrega 7)

1. Inscripción exitosa (`POST /api/events/:eid/tickets`) → `201` y email de confirmación recibido.
2. Inscripción sin sesión → `401`.
3. Inscripción a un evento inexistente → `404`.
4. Inscripción a un evento `cancelled` o `finished` → `400` (error de negocio).
5. Inscripción cuando no hay cupo suficiente → `400` con mensaje claro (incluye cuántos cupos quedan).
6. Segunda inscripción activa del mismo usuario al mismo evento → `409` (duplicada).
7. Cancelación propia (`PATCH /api/tickets/:tid/cancel`) → `200`, y una nueva inscripción de otro usuario ocupa ese cupo liberado.
8. Cancelar un ticket ajeno como `user` → `403`.
9. `GET /api/events/:eid/tickets` como `user` común → `403`.
10. `GET /api/events/:eid/tickets` como `organizer` de **otro** evento (no dueño) → `403`.

## Próximos pasos (siguientes entregas)

- Notificaciones adicionales (recordatorios antes del evento, aviso si el organizer cancela un evento con inscriptos)
- Endpoint administrativo para cambiar el rol de un usuario
- Estrategias adicionales en `passport.config.js` para providers externos (Google, GitHub)
