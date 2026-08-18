import { Injectable } from '@nestjs/common';
import type { VinDecodeResult, VinDecoderPort } from '../../application/ports/vin-decoder.port';
import { modelYearFromVin } from '../../domain/vin';

/** WMI (first 3 chars) → make, for brands common in KSA. Live adapter (Step 6+) replaces/extends this. */
const WMI: Array<[RegExp, string, string, string]> = [
  [/^(JT|4T|5T|2T|JTD|JTE|JTM|JTN|MR0|MHF)/, 'Toyota', 'تويوتا', 'JP/US/TH'],
  [/^(JTH|JTJ|58A)/, 'Lexus', 'لكزس', 'JP'],
  [/^(KMH|KM8|KMF|5NP|MAL)/, 'Hyundai', 'هيونداي', 'KR'],
  [/^(KNA|KND|KNE|KNC|5XX|5XY)/, 'Kia', 'كيا', 'KR'],
  [/^(JN1|JN8|1N4|3N1|5N1|SJN|MNT)/, 'Nissan', 'نيسان', 'JP'],
  [/^(1HG|2HG|JHM|JHL|19X|5FN|MRH)/, 'Honda', 'هوندا', 'JP/US'],
  [/^(1FA|1FT|1FM|1FD|3FA|MAJ|WF0)/, 'Ford', 'فورد', 'US'],
  [/^(1G1|1GC|1GN|2G1|3GN|KL1|KL8)/, 'Chevrolet', 'شيفروليه', 'US/KR'],
  [/^(1GT|1GK|3GT)/, 'GMC', 'جي إم سي', 'US'],
  [/^(WDD|WDB|WDC|W1K|W1N|4JG)/, 'Mercedes-Benz', 'مرسيدس', 'DE'],
  [/^(WBA|WBS|WBY|5UX|WBX)/, 'BMW', 'بي إم دبليو', 'DE'],
  [/^(JA3|JA4|JMY|MMB|MMC|4A3)/, 'Mitsubishi', 'ميتسوبيشي', 'JP'],
  [/^(MPA|JAA|JAC|MP1)/, 'Isuzu', 'إيسوزو', 'JP/TH'],
  [/^(LS5|LS4|LGX)/, 'Changan', 'شانجان', 'CN'],
  [/^(LSJ|SDP)/, 'MG', 'إم جي', 'CN'],
];
const MODELS: Record<string, string> = { '4T1B11HK': 'Camry', '4T1BF1FK': 'Camry', 'JTDBR32E': 'Corolla', 'JTEBU5JR': 'Land Cruiser', 'MR0FR22G': 'Hilux', 'KMHD84LF': 'Elantra', 'KNAFK4A6': 'Cerato', '1HGCV1F3': 'Accord', 'JN1BJ0HR': 'Sunny' };

@Injectable()
export class VinDecoderMockAdapter implements VinDecoderPort {
  decode(vin: string): Promise<VinDecodeResult> {
    const hit = WMI.find(([re]) => re.test(vin));
    const modelKey = Object.keys(MODELS).find((k) => vin.startsWith(k));
    const year = modelYearFromVin(vin);
    return Promise.resolve({ vin, makeEn: hit?.[1] ?? null, makeAr: hit?.[2] ?? null, modelEn: modelKey ? MODELS[modelKey]! : null, modelYear: year, engine: hit ? '2.5L' : null, fuelType: hit ? 'petrol' : null, trim: null, countryOfOrigin: hit?.[3] ?? null, source: 'mock' });
  }
}
