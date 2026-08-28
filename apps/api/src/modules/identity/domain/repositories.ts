import type { OtpChallenge, OtpPurpose } from './otp';
import type { RefreshTokenRecord } from './refresh-token';
import type { User } from './user';

/** Domain PORTS — implemented by Prisma repositories in infrastructure/. */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
  findByNationalIdHash(hash: string): Promise<User | null>;
  /** Active platform staff holding one of the given roles — e.g. the finance desk for approval notifications. */
  listIdsByPlatformRole(roles: string[]): Promise<string[]>;
  /** Create or activate a user by phone (OTP login). */
  upsertByPhone(phone: string): Promise<User>;
  /** Create or update a Nafath-verified user. */
  upsertByNafath(input: { nationalIdHash: string; nationalIdEnc: Buffer; nafathSub: string; fullNameAr?: string; phone?: string }): Promise<User>;
  touchLogin(userId: string): Promise<void>;
  /** The name the user types about himself. Never overwrites a Nafath-verified name — that one is legal. */
  updateProfile(userId: string, p: { fullNameAr?: string; email?: string | null; nameChangedAt?: Date }): Promise<User>;
}

export interface OtpRepository {
  create(input: { phone: string; purpose: OtpPurpose; codeHash: string; expiresAt: Date }): Promise<OtpChallenge>;
  findLatestActive(phone: string, purpose: OtpPurpose, now: Date): Promise<(OtpChallenge & { codeHash: string }) | null>;
  countRecent(phone: string, since: Date): Promise<number>;
  incrementAttempts(id: string): Promise<void>;
  consume(id: string): Promise<void>;
}

export interface RefreshTokenRepository {
  create(input: { userId: string; deviceId: string | null; tokenHash: string; familyId: string; expiresAt: Date }): Promise<RefreshTokenRecord>;
  findByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  revoke(id: string): Promise<void>;
  revokeFamily(familyId: string): Promise<number>;
  revokeAllForUser(userId: string): Promise<number>;
}

export interface DeviceRepository {
  upsert(input: { userId: string; platform: string; deviceName?: string; pushToken?: string; appFlavor?: string; appVersion?: string; existingId?: string }): Promise<{ id: string }>;
  revoke(userId: string, deviceId: string): Promise<boolean>;
  list(userId: string): Promise<Array<{ id: string; platform: string; deviceName: string | null; appFlavor: string | null; lastSeenAt: Date | null }>>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const OTP_REPOSITORY = Symbol('OTP_REPOSITORY');
export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');
export const DEVICE_REPOSITORY = Symbol('DEVICE_REPOSITORY');
