import { isPopulatedDoc } from './dto.helpers.js';

// DTO del usuario completo (registro, listado admin). Nunca incluye
// password, ni siquiera hasheada.
export function toUserDTO(user) {
  return {
    id: user._id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    role: user.role,
  };
}

// DTO de GET /api/sessions/current: la fuente es el payload del JWT
// (req.user), que ya solo tiene { id, email, role, iat, exp } — nunca pasó
// por la base de datos en esta request.
export function toCurrentUserDTO(jwtPayload) {
  return {
    id: jwtPayload.id,
    email: jwtPayload.email,
    role: jwtPayload.role,
  };
}

// DTO para cuando un User aparece poblado (`.populate()`) dentro de otro
// documento (p. ej. el campo `user` de un Ticket). Si no vino poblado (es
// solo el ObjectId), se devuelve tal cual. Si vino poblado, se filtra a
// mano: segunda barrera además del `select` del populate, para que nunca
// se filtre password aunque algún día cambie esa query.
export function toUserSummaryDTO(user) {
  if (!isPopulatedDoc(user)) return user;
  return {
    id: user._id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
  };
}

export default { toUserDTO, toCurrentUserDTO, toUserSummaryDTO };
