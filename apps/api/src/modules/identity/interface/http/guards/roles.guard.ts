import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppError } from '../../../../../common/errors';
import { type AuthUser, isPlatformStaff, membership } from '../../../domain/auth-user';
import { ROLES_KEY, type RolesSpec } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const spec = this.reflector.getAllAndOverride<RolesSpec | undefined>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!spec) return true;
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = req.user;
    if (!user) throw new AppError('UNAUTHORIZED');
    if (spec.nafath && !user.nafathVerified) throw new AppError('FORBIDDEN', { messageAr: 'هذا الإجراء يتطلب توثيق الهوية عبر نفاذ.', messageEn: 'This action requires Nafath-verified identity.' });
    if (user.platformRole === 'super_admin') return true;
    if (spec.platform?.includes(user.platformRole)) return true;
    if (spec.org) {
      const raw = req.params[spec.orgParam ?? 'orgId'];
      const orgId = Array.isArray(raw) ? raw[0] : raw;
      const m = orgId ? membership(user, orgId) : undefined;
      if (m && spec.org.includes(m.role)) return true;
    }
    if (!spec.platform && !spec.org && isPlatformStaff(user)) return true;
    // Flake hunt (docs/backlog.md): a super_admin token intermittently 403s. That is only possible if
    // the request was evaluated as some OTHER user — so outside production the refusal names who the
    // server thought was calling, and the next occurrence carries its own diagnosis.
    // console, not pino: pino runs silent in e2e and this must reach the jest output
    if (process.env['NODE_ENV'] === 'test') console.error(`[roles.guard] refused user=${user.id} role=${user.platformRole} path=${req.path}`);
    throw new AppError('FORBIDDEN', process.env['NODE_ENV'] === 'production' ? {} : { details: { as: user.id, role: user.platformRole, orgs: user.orgs.length } });
  }
}
