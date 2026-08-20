import { Body, Controller, HttpCode, Param, Post, Put } from '@nestjs/common';
import { AppConfig } from '../../../../config';
import { AppError } from '../../../../common/errors';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PresignDto } from '../../application/media.dto';
import { PresignUploadUseCase } from '../../application/presign-upload.use-case';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { CurrentUser, Public, zod } from '../../../identity/interface/http';

@ApiTags('media') @Controller('media')
export class MediaController {
  constructor(private readonly presign: PresignUploadUseCase, private readonly config: AppConfig) {}
  @Post('presign') @HttpCode(200) @ApiBearerAuth() @ApiOperation({ summary: 'Register a file and get a presigned PUT URL (client uploads directly to storage)' })
  presignUpload(@CurrentUser() user: AuthUser, @Body(zod(PresignDto)) dto: PresignDto) { return this.presign.execute(user.id, dto); }
  @Public() @Put('mock-upload/:bucket/:key') @ApiOperation({ summary: '[mock storage] accepts the upload and discards it' })
  mockUpload(@Param('bucket') _b: string, @Param('key') _k: string) {
    // Unauthenticated by design (it stands in for object storage). It must not answer once real storage is wired.
    if (this.config.get('INTEGRATION_STORAGE') !== 'mock') throw new AppError('NOT_FOUND');
    return { ok: true };
  }
}
