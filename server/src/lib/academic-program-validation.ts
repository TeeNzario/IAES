import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { FACULTY_MAP } from './faculty-map';

const VALID_FACULTY_CODES = new Set(Object.keys(FACULTY_MAP).map(Number));
const CURRICULUM_ID_REGEX = /^CUR(00[1-9]|0[1-6][0-9])$/;

export function IsKnownFacultyCode(validationOptions?: ValidationOptions) {
  return function (target: object, propertyName: string) {
    registerDecorator({
      name: 'isKnownFacultyCode',
      target: target.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return Number.isInteger(value) && VALID_FACULTY_CODES.has(value as number);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} ต้องเป็นรหัสสำนักวิชาที่ระบบรองรับ`;
        },
      },
    });
  };
}

export function IsCanonicalCurriculumId(
  validationOptions?: ValidationOptions,
) {
  return function (target: object, propertyName: string) {
    registerDecorator({
      name: 'isCanonicalCurriculumId',
      target: target.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && CURRICULUM_ID_REGEX.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} ต้องเป็นรหัสหลักสูตร CUR001-CUR069`;
        },
      },
    });
  };
}
