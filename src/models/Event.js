// Modelo base de Event. Campos mínimos para esta entrega.
// En próximas entregas se ampliará con cupos, inscripciones, categoría, etc.
export class Event {
  constructor({ id, title, description, date, location }) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.date = date;
    this.location = location;
  }
}

export default Event;
