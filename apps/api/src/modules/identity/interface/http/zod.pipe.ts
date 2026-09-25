import { type PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';

/** Parses request bodies with Zod; ZodError → VALIDATION envelope via the global filter. */
export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}
  transform(value: unknown): T { return this.schema.parse(value); }
}
export const zod = <T>(schema: ZodSchema<T>) => new ZodPipe(schema);
