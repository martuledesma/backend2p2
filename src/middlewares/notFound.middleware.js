// Middleware para rutas no encontradas (404).
export const notFoundHandler = (req, res) => {
  res.status(404).json({ status: 'error', message: 'Recurso no encontrado' });
};

export default notFoundHandler;
