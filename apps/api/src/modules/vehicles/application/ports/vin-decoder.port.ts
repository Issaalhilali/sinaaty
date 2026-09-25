import type { FuelType } from '@sinaaty/shared-types';
export interface VinDecodeResult {
  vin: string; makeEn: string | null; makeAr: string | null; modelEn: string | null; modelYear: number | null; engine: string | null; fuelType: FuelType | null; trim: string | null; countryOfOrigin: string | null; raw?: unknown; source: 'mock' | 'provider' | 'cache';
}
export interface VinDecoderPort { decode(vin: string): Promise<VinDecodeResult> }
export const VIN_DECODER_PORT = Symbol('VIN_DECODER_PORT');
