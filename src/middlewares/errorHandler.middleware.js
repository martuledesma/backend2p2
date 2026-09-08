// Middleware centralizado de manejo de errores.
export const errorHandler = (err, req, res, next) => {
  console.error(err);
  res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
};

export default errorHandler;
