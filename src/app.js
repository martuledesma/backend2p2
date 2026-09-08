import express from 'express';
import cookieParser from 'cookie-parser';

import healthRouter from './routes/health.router.js';
import eventsRouter from './routes/events.router.js';
import sessionsRouter from './routes/sessions.router.js';
import { notFoundHandler } from './middlewares/notFound.middleware.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';

const app = express();

// Middlewares globales
app.use(express.json());
app.use(cookieParser());

// Rutas
app.use('/api/health', healthRouter);
app.use('/api/events', eventsRouter);
app.use('/api/sessions', sessionsRouter);

// Manejo de rutas no encontradas y errores
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
