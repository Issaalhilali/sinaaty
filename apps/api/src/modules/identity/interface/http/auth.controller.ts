import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { NafathCallbackDto, NafathInitiateDto, OtpRequestDto, OtpVerifyDto, RefreshDto, RegisterDeviceDto } from '../../application/dto/auth.dto';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { NafathCompleteUseCase } from '../../application/use-cases/nafath-complete.use-case';
import { NafathInitiateUseCase } from '../../application/use-cases/nafath-initiate.use-case';
import { RefreshSessionUseCase } from '../../application/use-cases/refresh-session.use-case';
import { RequestOtpUseCase } from '../../application/use-cases/request-otp.use-case';
import { VerifyOtpUseCase } from '../../application/use-cases/verify-otp.use-case';
import { NafathForceStateUseCase } from '../../application/use-cases/nafath-force-state.use-case';
import type { AuthUser } from '../../domain/auth-user';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { zod } from './zod.pipe';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly requestOtp: RequestOtpUseCase,
    private readonly verifyOtp: VerifyOtpUseCase,
    private readonly nafathInitiate: NafathInitiateUseCase,
    private readonly nafathComplete: NafathCompleteUseCase,
    private readonly refresh: RefreshSessionUseCase,
    private readonly logout: LogoutUseCase,
    private readonly nafathForce: NafathForceStateUseCase,
  ) {}

  @Public() @Post('otp/request') @HttpCode(200) @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Send a 6-digit OTP to a Saudi mobile number (login for operational roles)' })
  otpRequest(@Body(zod(OtpRequestDto)) dto: OtpRequestDto) { return this.requestOtp.execute(dto); }

  @Public() @Post('otp/verify') @HttpCode(200) @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Verify OTP → access + refresh tokens (creates the user on first login)' })
  otpVerify(@Body(zod(OtpVerifyDto)) dto: OtpVerifyDto) { return this.verifyOtp.execute(dto); }

  @Public() @Post('nafath/initiate') @HttpCode(200) @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Start Nafath login: returns transaction_id + the 2-digit number to confirm in the Nafath app' })
  nafathStart(@Body(zod(NafathInitiateDto)) dto: NafathInitiateDto) { return this.nafathInitiate.execute(dto); }

  @Public() @Get('nafath/status/:transactionId')
  @ApiOperation({ summary: 'Poll Nafath: {status: pending} or {status: approved, tokens…} (tokens are issued once)' })
  nafathStatus(@Param('transactionId') id: string, @Query('platform') platform?: 'ios' | 'android' | 'web') {
    return this.nafathComplete.execute(id, platform ? { platform } : undefined);
  }

  @Public() @Post('nafath/callback') @HttpCode(200)
  @ApiOperation({ summary: 'Provider callback (mock: forces a transaction state; secured by NAFATH_CALLBACK_SECRET header)' })
  nafathCallback(@Body(zod(NafathCallbackDto)) dto: NafathCallbackDto, @Headers('x-nafath-secret') secret?: string) {
    return this.nafathForce.execute(dto, secret);
  }

  @Public() @Post('refresh') @HttpCode(200)
  @ApiOperation({ summary: 'Rotate refresh token (family reuse detection revokes the whole family)' })
  refreshTokens(@Body(zod(RefreshDto)) dto: RefreshDto) { return this.refresh.execute(dto.refresh_token); }

  @Post('logout') @HttpCode(200) @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke this session (or all sessions with everywhere=true)' })
  doLogout(@CurrentUser() user: AuthUser, @Body() body: { refresh_token?: string; everywhere?: boolean }) {
    return this.logout.execute(user.id, body?.refresh_token, body?.everywhere === true);
  }
}
export { RegisterDeviceDto };
