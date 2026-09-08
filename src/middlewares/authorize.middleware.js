/**
 * Middleware de autorización por roles. Recibe la lista de roles permitidos
 * y devuelve un middleware reutilizable: compara contra req.user.role
 * (que dejó `auth`) y responde 403 si no coincide.
 *
 * Se usa siempre DESPUÉS de `auth` en la cadena de la ruta:
 *   router.post('/', auth, authorize('organizer', 'admin'), createEvent);
 *
 * 401 (sin sesión) es responsabilidad de `auth`. Este middleware asume que
 * ya hay una sesión válida y solo decide si el rol alcanza — por eso, si
 * por algún motivo llega sin req.user, también responde 401 en vez de
 * asumir permisos.
 */
export const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ status: 'error', message: 'No autenticado' });
  }

  if (!allowedRoles.includes(req.user.role)) {
    return res
      .status(403)
      .json({ status: 'error', message: 'No tenés permisos para realizar esta acción' });
  }

  next();
};

export default authorize;
