import { Module } from '@nestjs/common';
import { AssistUseCases } from './application/assist.use-cases';
import { AssistController } from './interface/http/assist.controller';

@Module({ providers: [AssistUseCases], controllers: [AssistController], exports: [AssistUseCases] })
export class AssistModule {}
