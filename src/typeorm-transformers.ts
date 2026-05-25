import { FindOperator } from 'typeorm';

export const utcDateTimeTransformer = {
  to: (value: Date | FindOperator<Date> | null | undefined) => {
    if (!value) return value;
    if (typeof value === 'string') return value;
    if (value instanceof FindOperator) return value;
    if (value instanceof Date) return value.toISOString();
    return value;
  },
  from: (value: string | null) => {
    if (!value) return value;
    return new Date(value);
  },
};

export const dateTransformer = {
  to: (value: Date | null) => value,
  from: (value: string | null) => (value ? new Date(value) : null),
};
