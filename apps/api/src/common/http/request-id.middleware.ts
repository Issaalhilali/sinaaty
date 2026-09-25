import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { uuidv7 } from 'uuidv7';

export const REQUEST_ID_HEADER = 'x-request-id';

/** Attaches a UUIDv7 request id (or honours an incoming one) and echoes it in the response. */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.header(REQUEST_ID_HEADER);
    const id = incoming && /^[\w-]{8,64}$/.test(incoming) ? incoming : uuidv7();
    (req as Request & { id: string }).id = id;
    res.setHeader(REQUEST_ID_HEADER, id);
    next();
  }
}
