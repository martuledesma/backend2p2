const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD_LENGTH = 6;

export function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim());
}

export function isValidPassword(password) {
  return typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH;
}

export function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

export default { isValidEmail, isValidPassword, normalizeEmail, MIN_PASSWORD_LENGTH };
