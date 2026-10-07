import { ApiError } from '../utils/errors.js';

// Middleware centralizado de manejo de errores: único lugar de la app que
// traduce un error a su respuesta HTTP. Los controllers y services nunca
// formatean la respuesta de error ellos mismos: lanzan un ApiError (o
// propagan uno) y llaman a next(error).
//
// - ApiError -> responde con su statusCode real (400/401/403/404/409/...).
// - Cualquier otro error (bug, falla de Mongo, etc.) -> 500, y se loguea
//   server-side para poder debuggear, sin filtrar detalles internos al cliente.
export const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ status: 'error', message: err.message });
  }
  console.error(err);
  return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
};

export default errorHandler;
