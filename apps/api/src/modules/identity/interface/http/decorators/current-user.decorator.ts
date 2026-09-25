import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../../../domain/auth-user';

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const req = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
  return req.user;
});
