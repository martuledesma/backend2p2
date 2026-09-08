import express from 'express';
import cookieParser from 'cookie-parser';
import passport from './config/passport.config.js';

import healthRouter from './routes/health.router.js';
import eventsRouter from './routes/events.router.js';
import sessionsRouter from './routes/sessions.router.js';
import usersRouter from './routes/users.router.js';
import { notFoundHandler } from './middlewares/notFound.middleware.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';

const app = express();

// Middlewares globales. Las estrategias de Passport están centralizadas en
// config/passport.config.js: acá solo se inicializa.
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Rutas
app.use('/api/health', healthRouter);
app.use('/api/events', eventsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/users', usersRouter);

// Manejo de rutas no encontradas y errores
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
