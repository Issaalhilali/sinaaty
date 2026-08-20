import { forwardRef, Module } from '@nestjs/common';
import { AppConfig } from '../../config';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { DownloadMediaUseCase } from './application/download-media.use-case';
import { OBJECT_STORAGE_PORT } from './application/storage.port';
import { PresignUploadUseCase } from './application/presign-upload.use-case';
import { StorageMockAdapter } from './infrastructure/storage.mock.adapter';
import { MediaPrismaRepository } from './infrastructure/media.prisma-repository';
import { MEDIA_REPOSITORY } from './domain/media';
import { MediaController } from './interface/http/media.controller';

@Module({
  imports: [forwardRef(() => WorkOrdersModule)],
  controllers: [MediaController],
  providers: [PresignUploadUseCase, DownloadMediaUseCase, DownloadMediaUseCase, StorageMockAdapter, { provide: MEDIA_REPOSITORY, useClass: MediaPrismaRepository }, { provide: OBJECT_STORAGE_PORT, inject: [AppConfig, StorageMockAdapter], useFactory: (c: AppConfig, mock: StorageMockAdapter) => { if (c.get('INTEGRATION_STORAGE') !== 'mock') throw new Error('S3 live storage adapter not implemented yet — set INTEGRATION_STORAGE=mock'); return mock; } }],
  exports: [OBJECT_STORAGE_PORT],
})
export class MediaModule {}
