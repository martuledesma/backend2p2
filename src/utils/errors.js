// Error de aplicación con un status code HTTP asociado, para que los
// controllers puedan responder de forma consistente ante fallos de negocio
// (validación, duplicados, etc.) sin usar try/catch genéricos por todos lados.
export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export default ApiError;
