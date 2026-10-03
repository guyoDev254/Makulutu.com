import { registerDecorator, ValidationOptions } from 'class-validator';
import {
  DATE_OF_BIRTH_UNDERAGE,
  isAdultDateOfBirth,
} from './date-of-birth';

export function IsAdultDateOfBirth(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isAdultDateOfBirth',
      target: object.constructor,
      propertyName,
      options: {
        message: DATE_OF_BIRTH_UNDERAGE,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && isAdultDateOfBirth(value);
        },
      },
    });
  };
}
