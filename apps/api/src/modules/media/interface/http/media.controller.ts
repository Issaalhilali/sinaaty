import { Body, Controller, Get, Header, HttpCode, Param, Post, Put, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AppConfig } from '../../../../config';
import { AppError } from '../../../../common/errors';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PresignDto } from '../../application/media.dto';
import { DownloadMediaUseCase } from '../../application/download-media.use-case';
import { PresignUploadUseCase } from '../../application/presign-upload.use-case';
import { placeholderPng } from '../../application/placeholder-png';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { CurrentUser, Public, zod } from '../../../identity/interface/http';

@ApiTags('media') @Controller('media')
export class MediaController {
  constructor(private readonly presign: PresignUploadUseCase, private readonly download: DownloadMediaUseCase, private readonly config: AppConfig) {}
  @Post('presign') @HttpCode(200) @ApiBearerAuth() @ApiOperation({ summary: 'Register a file and get a presigned PUT URL (client uploads directly to storage)' })
  presignUpload(@CurrentUser() user: AuthUser, @Body(zod(PresignDto)) dto: PresignDto) { return this.presign.execute(user.id, dto); }
  @Get(':id/download') @ApiBearerAuth() @ApiOperation({ summary: 'Short-lived download URL — only for callers who may read what the file is attached to' })
  downloadUrl(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.download.execute(user, id); }

  // CORP relaxed like real object storage (S3 sends none): helmet's same-origin default blocked the
  // admin on :3001 from embedding these images (ERR_BLOCKED_BY_RESPONSE) — access is governed by the
  // signed link that mints this URL, never by the response origin.
  @Public() @Get('mock-download/:bucket/:key') @Header('cache-control', 'private, max-age=300') @Header('cross-origin-resource-policy', 'cross-origin')
  @ApiOperation({ summary: '[mock storage] serves a deterministic placeholder image (no bytes are kept in dev)' })
  mockDownload(@Param('bucket') _b: string, @Param('key') key: string, @Res() res: Response) {
    if (this.config.get('INTEGRATION_STORAGE') !== 'mock') throw new AppError('NOT_FOUND');
    res.setHeader('content-type', 'image/png');
    res.send(placeholderPng(key));
  }

  @Public() @Put('mock-upload/:bucket/:key') @ApiOperation({ summary: '[mock storage] accepts the upload and discards it' })
  mockUpload(@Param('bucket') _b: string, @Param('key') _k: string) {
    // Unauthenticated by design (it stands in for object storage). It must not answer once real storage is wired.
    if (this.config.get('INTEGRATION_STORAGE') !== 'mock') throw new AppError('NOT_FOUND');
    return { ok: true };
  }
}
