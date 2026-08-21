import { forwardRef, Module } from '@nestjs/common';
import { AppConfig } from '../../config';
import { DisputesModule } from '../disputes/disputes.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { DownloadMediaUseCase } from './application/download-media.use-case';
import { OBJECT_STORAGE_PORT } from './application/storage.port';
import { PresignUploadUseCase } from './application/presign-upload.use-case';
import { StorageMockAdapter } from './infrastructure/storage.mock.adapter';
import { StorageS3Adapter } from './infrastructure/storage.s3.adapter';
import { MediaPrismaRepository } from './infrastructure/media.prisma-repository';
import { MEDIA_REPOSITORY } from './domain/media';
import { MediaController } from './interface/http/media.controller';

@Module({
  imports: [forwardRef(() => WorkOrdersModule), forwardRef(() => DisputesModule)],
  controllers: [MediaController],
  providers: [PresignUploadUseCase, DownloadMediaUseCase, DownloadMediaUseCase, StorageMockAdapter, { provide: MEDIA_REPOSITORY, useClass: MediaPrismaRepository }, { provide: OBJECT_STORAGE_PORT, inject: [AppConfig, StorageMockAdapter], useFactory: (c: AppConfig, mock: StorageMockAdapter) => (c.get('INTEGRATION_STORAGE') === 'live' ? new StorageS3Adapter(c) : mock) }],
  exports: [OBJECT_STORAGE_PORT],
})
export class MediaModule {}
