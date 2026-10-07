import { toUserSummaryDTO } from './user.dto.js';

// DTO del evento. `organizer` hoy siempre llega como ObjectId (nunca se
// popula en el código actual), pero se pasa igual por toUserSummaryDTO: si
// en el futuro se agrega un populate ahí, el filtrado ya está resuelto acá
// sin tocar el resto del código.
export function toEventDTO(event) {
  return {
    id: event._id,
    title: event.title,
    description: event.description,
    category: event.category,
    date: event.date,
    location: event.location,
    capacity: event.capacity,
    price: event.price,
    organizer: toUserSummaryDTO(event.organizer),
    status: event.status,
  };
}

// Versión resumida, para cuando un Event aparece poblado dentro de otro
// documento (el campo `event` de un Ticket en GET /my-tickets).
export function toEventSummaryDTO(event) {
  if (!event || typeof event !== 'object' || event._id === undefined) return event;
  return {
    id: event._id,
    title: event.title,
    date: event.date,
    location: event.location,
  };
}

export default { toEventDTO, toEventSummaryDTO };
