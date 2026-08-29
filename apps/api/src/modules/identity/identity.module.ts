import { Module } from '@nestjs/common';
import { AppConfig } from '../../config';
import { DEVICE_REPOSITORY, OTP_REPOSITORY, REFRESH_TOKEN_REPOSITORY, USER_REPOSITORY } from './domain/repositories';
import { HASHER_PORT, NAFATH_DEV_HOOK_PORT, NAFATH_PORT, OTP_SENDER_PORT, TOKEN_PORT } from './application/ports';
import { NafathForceStateUseCase } from './application/use-cases/nafath-force-state.use-case';
import { SessionService } from './application/session.service';
import { RequestOtpUseCase } from './application/use-cases/request-otp.use-case';
import { VerifyOtpUseCase } from './application/use-cases/verify-otp.use-case';
import { NafathInitiateUseCase } from './application/use-cases/nafath-initiate.use-case';
import { NafathCompleteUseCase } from './application/use-cases/nafath-complete.use-case';
import { RefreshSessionUseCase } from './application/use-cases/refresh-session.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { DevicesUseCase } from './application/use-cases/devices.use-case';
import { DeleteAccountUseCase } from './application/use-cases/delete-account.use-case';
import { GetMeUseCase } from './application/use-cases/get-me.use-case';
import { UserPrismaRepository } from './infrastructure/prisma/user.prisma-repository';
import { OtpPrismaRepository } from './infrastructure/prisma/otp.prisma-repository';
import { RefreshTokenPrismaRepository } from './infrastructure/prisma/refresh-token.prisma-repository';
import { DevicePrismaRepository } from './infrastructure/prisma/device.prisma-repository';
import { JoseTokenAdapter } from './infrastructure/token/jose-token.adapter';
import { HasherAdapter } from './infrastructure/hasher.adapter';
import { OtpSenderMockAdapter } from './infrastructure/otp/otp-sender.mock.adapter';
import { NafathMockAdapter } from './infrastructure/nafath/nafath.mock.adapter';
import { AuthController } from './interface/http/auth.controller';
import { MeController } from './interface/http/me.controller';
import { JwtAuthGuard } from './interface/http/guards/jwt-auth.guard';
import { RolesGuard } from './interface/http/guards/roles.guard';

/**
 * Composition root. Ports → adapters by env (INTEGRATION_NAFATH / INTEGRATION_SMS = mock|live).
 * Live adapters are added when contracts are confirmed (docs/integrations/*.md); until then `live`
 * fails fast at boot rather than silently using a mock.
 */
const notImplemented = (name: string) => () => { throw new Error(`${name} live adapter not implemented yet — set INTEGRATION_*=mock`); };

@Module({
  controllers: [AuthController, MeController],
  providers: [
    SessionService, RequestOtpUseCase, VerifyOtpUseCase, NafathInitiateUseCase, NafathCompleteUseCase, RefreshSessionUseCase, LogoutUseCase, DevicesUseCase, GetMeUseCase, DeleteAccountUseCase, NafathForceStateUseCase,
    JwtAuthGuard, RolesGuard,
    { provide: USER_REPOSITORY, useClass: UserPrismaRepository },
    { provide: OTP_REPOSITORY, useClass: OtpPrismaRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: RefreshTokenPrismaRepository },
    { provide: DEVICE_REPOSITORY, useClass: DevicePrismaRepository },
    { provide: TOKEN_PORT, useClass: JoseTokenAdapter },
    { provide: HASHER_PORT, useClass: HasherAdapter },
    NafathMockAdapter,
    { provide: NAFATH_PORT, inject: [AppConfig, NafathMockAdapter], useFactory: (c: AppConfig, mock: NafathMockAdapter) => (c.get('INTEGRATION_NAFATH') === 'mock' ? mock : notImplemented('Nafath')()) },
    { provide: NAFATH_DEV_HOOK_PORT, inject: [AppConfig, NafathMockAdapter], useFactory: (c: AppConfig, mock: NafathMockAdapter) => (c.get('INTEGRATION_NAFATH') === 'mock' ? mock : { force: () => false }) },
    { provide: OTP_SENDER_PORT, inject: [AppConfig, OtpSenderMockAdapter], useFactory: (c: AppConfig, mock: OtpSenderMockAdapter) => (c.get('INTEGRATION_SMS') === 'mock' ? mock : notImplemented('SMS')()) },
    OtpSenderMockAdapter,
  ],
  exports: [JwtAuthGuard, RolesGuard, TOKEN_PORT, USER_REPOSITORY, OTP_REPOSITORY, HASHER_PORT, NAFATH_PORT],
})
export class IdentityModule {}
