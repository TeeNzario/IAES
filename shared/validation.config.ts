/**
 * Centralized validation configuration for user fields.
 * Shared between frontend and backend for consistent validation.
 */
export const USER_VALIDATION_CONFIG = {
  firstName: {
    min: 1,
    max: 50,
  },
  lastName: {
    min: 1,
    max: 50,
  },
  email: {
    max: 100,
  },
  password: {
    min: 8,
  },
  studentCode: {
    max: 50,
  },
} as const;

// Type for the config
export type UserValidationConfig = typeof USER_VALIDATION_CONFIG;

// Thai error messages
export const USER_VALIDATION_MESSAGES = {
  firstName: {
    required: "กรุณากรอกชื่อ",
    maxLength: `ชื่อต้องไม่เกิน ${USER_VALIDATION_CONFIG.firstName.max} ตัวอักษร`,
  },
  lastName: {
    required: "กรุณากรอกนามสกุล",
    maxLength: `นามสกุลต้องไม่เกิน ${USER_VALIDATION_CONFIG.lastName.max} ตัวอักษร`,
  },
  email: {
    required: "กรุณากรอกอีเมล",
    maxLength: `อีเมลต้องไม่เกิน ${USER_VALIDATION_CONFIG.email.max} ตัวอักษร`,
    invalid: "รูปแบบอีเมลไม่ถูกต้อง",
    duplicate: "อีเมลนี้ถูกใช้งานแล้ว",
  },
  password: {
    required: "กรุณากรอกรหัสผ่าน",
    minLength: `รหัสผ่านต้องมีอย่างน้อย ${USER_VALIDATION_CONFIG.password.min} ตัวอักษร`,
    mismatch: "รหัสผ่านไม่ตรงกัน",
  },
  studentCode: {
    required: "กรุณากรอกรหัสนักศึกษา",
    maxLength: `รหัสนักศึกษาต้องไม่เกิน ${USER_VALIDATION_CONFIG.studentCode.max} ตัวอักษร`,
    duplicate: "รหัสนักศึกษานี้มีอยู่แล้ว",
  },
} as const;
