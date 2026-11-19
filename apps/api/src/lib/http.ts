import { ApiErrors } from '@eatandcalc/shared';
import type { z } from 'zod';

/** Error with an HTTP status; `withUser` turns it into `{ error: message }`. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Parses a JSON request body with a shared zod schema; 400 on invalid input. */
export async function parseBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.infer<S>> {
  const json: unknown = await request.json().catch(() => undefined);
  const result = schema.safeParse(json);
  if (!result.success) throw new HttpError(400, ApiErrors.validation);
  return result.data;
}
