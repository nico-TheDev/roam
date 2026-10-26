// Form rules shared by the auth screens. Each returns an error message, or undefined when valid.

export const MIN_PASSWORD_LENGTH = 8;

export const validateName = (name: string) =>
  name.trim().length < 2 ? "Enter your full name" : undefined;

export const validateEmail = (email: string) =>
  /^\S+@\S+\.\S+$/.test(email.trim()) ? undefined : "Enter a valid email address";

export const validatePassword = (password: string) =>
  password.length < MIN_PASSWORD_LENGTH ? `Use at least ${MIN_PASSWORD_LENGTH} characters` : undefined;
