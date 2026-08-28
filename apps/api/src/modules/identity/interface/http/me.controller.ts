import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RegisterDeviceDto, UpdateMeDto } from '../../application/dto/auth.dto';
import { DevicesUseCase } from '../../application/use-cases/devices.use-case';
import { GetMeUseCase } from '../../application/use-cases/get-me.use-case';
import type { AuthUser } from '../../domain/auth-user';
import { CurrentUser } from './decorators/current-user.decorator';
import { zod } from './zod.pipe';

@ApiTags('me') @ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly getMe: GetMeUseCase, private readonly devices: DevicesUseCase) {}

  @Get() @ApiOperation({ summary: 'Current user profile, roles and org memberships' })
  me(@CurrentUser() user: AuthUser) { return this.getMe.execute(user.id); }

  @Patch() @ApiOperation({ summary: 'الملف: الاسم (يُرفض إن كان موثّقاً بنفاذ) والبريد للفواتير — ولا نجمع ما لا نحتاج' })
  updateMe(@CurrentUser() user: AuthUser, @Body(zod(UpdateMeDto)) dto: UpdateMeDto) { return this.getMe.updateProfile(user.id, { fullNameAr: dto.full_name_ar, email: dto.email }); }

  @Get('devices') listDevices(@CurrentUser() user: AuthUser) { return this.devices.list(user.id); }

  @Post('devices') @HttpCode(200) @ApiOperation({ summary: 'Register/refresh this device (push token)' })
  register(@CurrentUser() user: AuthUser, @Body(zod(RegisterDeviceDto)) dto: RegisterDeviceDto) { return this.devices.register(user.id, dto, user.deviceId); }

  @Delete('devices/:id') async revoke(@CurrentUser() user: AuthUser, @Param('id') id: string) { return { revoked: await this.devices.revoke(user.id, id) }; }
}
