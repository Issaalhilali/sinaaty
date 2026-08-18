import { Injectable } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import type { OtpSenderPort } from '../../application/ports/otp-sender.port';

/** Dev/test SMS: logs the code (masked phone) and returns it so tests/mobile dev can auto-fill. */
@Injectable()
export class OtpSenderMockAdapter implements OtpSenderPort {
  constructor(private readonly logger: Logger) {}
  send(phone: string, code: string): Promise<{ debugCode?: string }> {
    this.logger.log({ phone: `${phone.slice(0, 7)}*****`, code }, '[mock sms] OTP');
    return Promise.resolve({ debugCode: code });
  }
}
