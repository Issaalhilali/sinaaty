import { Module, forwardRef } from '@nestjs/common';
import { AppConfig } from '../../config';
import { IdentityModule } from '../identity/identity.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { VoiceUseCases } from './application/voice.use-cases';
import { ITEM_EXTRACTION_PORT } from './application/ports/item-extraction.port';
import { SPEECH_PORT } from './application/ports/speech.port';
import { VOICE_REPOSITORY } from './domain/repositories';
import { ClaudeExtractionAdapter, RulesExtractionAdapter } from './infrastructure/ai/claude.extraction.adapter';
import { SpeechMockAdapter } from './infrastructure/speech/speech.mock.adapter';
import { VoicePrismaRepository } from './infrastructure/prisma/voice.prisma-repository';
import { VoiceController } from './interface/http/voice.controller';

/**
 * Step 27 — voice to invoice. Two providers behind ports: speech (no vendor chosen yet) and extraction
 * (Claude, with the offline Arabic rules as both the mock and the fallback).
 */
@Module({
  imports: [IdentityModule, forwardRef(() => WorkOrdersModule)],
  controllers: [VoiceController],
  providers: [
    { provide: VOICE_REPOSITORY, useClass: VoicePrismaRepository },
    SpeechMockAdapter, RulesExtractionAdapter, ClaudeExtractionAdapter,
    {
      provide: SPEECH_PORT,
      inject: [AppConfig, SpeechMockAdapter],
      useFactory: (c: AppConfig, mock: SpeechMockAdapter) => {
        if (c.get('INTEGRATION_SPEECH') !== 'mock') throw new Error('Speech live adapter not implemented — set INTEGRATION_SPEECH=mock (docs/integrations/speech.md)');
        return mock;
      },
    },
    {
      provide: ITEM_EXTRACTION_PORT,
      inject: [AppConfig, RulesExtractionAdapter, ClaudeExtractionAdapter],
      useFactory: (c: AppConfig, rules: RulesExtractionAdapter, claude: ClaudeExtractionAdapter) => (c.get('INTEGRATION_AI') === 'live' ? claude : rules),
    },
    VoiceUseCases,
  ],
})
export class VoiceModule {}
