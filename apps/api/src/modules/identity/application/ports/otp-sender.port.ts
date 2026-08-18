export interface OtpSenderPort {
  /** Sends the code via SMS. Mock logs it and (in dev/test) returns it for automation. */
  send(phone: string, code: string): Promise<{ debugCode?: string }>;
}
export const OTP_SENDER_PORT = Symbol('OTP_SENDER_PORT');
