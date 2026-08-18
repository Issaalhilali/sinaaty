import { Global, Module } from '@nestjs/common';
import { OutboxHandlerRegistry } from './outbox/outbox-handler.registry';
import { OutboxProcessor } from './outbox/outbox.processor';
@Global()
@Module({ providers: [OutboxHandlerRegistry, OutboxProcessor], exports: [OutboxHandlerRegistry, OutboxProcessor] })
export class IntegrationsModule {}
