import { type CanActivate, type ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppError } from '../../../../../common/errors';
import { TOKEN_PORT, type TokenPort } from '../../../application/ports/token.port';
import type { AuthUser } from '../../../domain/auth-user';
import { IS_PUBLIC } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, @Inject(TOKEN_PORT) private readonly tokens: TokenPort) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()])) return true;
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = req.header('authorization') ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) throw new AppError('UNAUTHORIZED');
    const user = await this.tokens.verifyAccess(token);
    if (user.status === 'suspended' || user.status === 'deleted') throw new AppError('USER_SUSPENDED');
    req.user = user;
    return true;
  }
}
