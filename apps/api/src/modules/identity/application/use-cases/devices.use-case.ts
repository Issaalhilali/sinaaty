import { Inject, Injectable } from '@nestjs/common';
import { DEVICE_REPOSITORY, type DeviceRepository } from '../../domain/repositories';
import type { RegisterDeviceDto } from '../dto/auth.dto';

@Injectable()
export class DevicesUseCase {
  constructor(@Inject(DEVICE_REPOSITORY) private readonly devices: DeviceRepository) {}
  register(userId: string, dto: RegisterDeviceDto, existingId?: string) {
    return this.devices.upsert({ userId, platform: dto.platform, deviceName: dto.device_name, pushToken: dto.push_token, appFlavor: dto.app_flavor, appVersion: dto.app_version, existingId });
  }
  list(userId: string) {
    return this.devices.list(userId);
  }
  revoke(userId: string, deviceId: string) {
    return this.devices.revoke(userId, deviceId);
  }
}
