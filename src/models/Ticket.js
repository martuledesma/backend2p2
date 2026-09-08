import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// 'pending' queda reservado para una futura integración de pago (no forma
// parte del flujo de esta entrega, que confirma la inscripción al toque).
export const TICKET_STATUSES = ['confirmed', 'pending', 'cancelled'];

const ticketSchema = new Schema(
  {
    // Solo referencias: nunca se embebe el objeto completo de user ni event.
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    event: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    status: {
      type: String,
      enum: TICKET_STATUSES,
      default: 'confirmed',
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    reservationCode: {
      type: String,
      required: true,
      unique: true,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  // timestamps agrega createdAt (requerido por la consigna) y updatedAt.
  { timestamps: true },
);

export const Ticket = model('Ticket', ticketSchema);

export default Ticket;
