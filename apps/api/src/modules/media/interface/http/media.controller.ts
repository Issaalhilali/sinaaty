import { Body, Controller, Get, Header, HttpCode, Param, Post, Put, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppConfig } from '../../../../config';
import { AppError } from '../../../../common/errors';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PresignDto } from '../../application/media.dto';
import { DownloadMediaUseCase } from '../../application/download-media.use-case';
import { PresignUploadUseCase } from '../../application/presign-upload.use-case';
import { placeholderPng } from '../../application/placeholder-png';
import { DevObjectStore } from '../../infrastructure/dev-object-store';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { CurrentUser, Public, zod } from '../../../identity/interface/http';

@ApiTags('media') @Controller('media')
export class MediaController {
  constructor(private readonly presign: PresignUploadUseCase, private readonly download: DownloadMediaUseCase, private readonly config: AppConfig, private readonly dev: DevObjectStore) {}
  @Post('presign') @HttpCode(200) @ApiBearerAuth() @ApiOperation({ summary: 'Register a file and get a presigned PUT URL (client uploads directly to storage)' })
  presignUpload(@CurrentUser() user: AuthUser, @Body(zod(PresignDto)) dto: PresignDto) { return this.presign.execute(user.id, dto); }
  @Get(':id/download') @ApiBearerAuth() @ApiOperation({ summary: 'Short-lived download URL — only for callers who may read what the file is attached to' })
  downloadUrl(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.download.execute(user, id); }

  // CORP relaxed like real object storage (S3 sends none): helmet's same-origin default blocked the
  // admin on :3001 from embedding these images (ERR_BLOCKED_BY_RESPONSE) — access is governed by the
  // signed link that mints this URL, never by the response origin.
  @Public() @Get('mock-download/:bucket/:key') @Header('cache-control', 'private, max-age=300') @Header('cross-origin-resource-policy', 'cross-origin')
  @ApiOperation({ summary: '[mock storage] serves a deterministic placeholder image (no bytes are kept in dev)' })
  mockDownload(@Param('bucket') bucket: string, @Param('key') key: string, @Res() res: Response) {
    if (this.config.get('INTEGRATION_STORAGE') !== 'mock') throw new AppError('NOT_FOUND');
    // ما رُفع فعلاً أولاً — والنائبة الملوّنة تبقى لما لم يُرفع (بذور، أو تشغيلة سابقة)
    const stored = this.dev.get(bucket, key);
    res.setHeader('content-type', stored && key.endsWith('.jpg') ? 'image/jpeg' : 'image/png');
    res.send(stored ?? placeholderPng(key));
  }

  @Public() @Put('mock-upload/:bucket/:key') @ApiOperation({ summary: '[mock storage] accepts the upload and discards it' })
  async mockUpload(@Param('bucket') bucket: string, @Param('key') key: string, @Req() req: Request) {
    // Unauthenticated by design (it stands in for object storage). It must not answer once real storage is wired.
    if (this.config.get('INTEGRATION_STORAGE') !== 'mock') throw new AppError('NOT_FOUND');
    // البايتات: من rawBody إن فسّرها إكسبريس، وإلا من التيار — **ما لم يكن قد استُهلك**.
    // انتظار تيارٍ منتهٍ لا ينتهي أبداً: علّق ذلك حزمة الاختبارات كاملةً حتى المهلة.
    const r = req as unknown as { rawBody?: Buffer; body?: unknown; readableEnded?: boolean; readable?: boolean };
    let bytes: Buffer = Buffer.isBuffer(r.rawBody) ? r.rawBody : Buffer.alloc(0);
    if (!bytes.length && Buffer.isBuffer(r.body)) bytes = r.body;
    if (!bytes.length && typeof r.body === 'string' && r.body.length) bytes = Buffer.from(r.body);
    if (!bytes.length && r.readable && !r.readableEnded) {
      bytes = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
      });
    }
    if (bytes.length) this.dev.put(bucket, key, bytes);
    return { ok: true };
  }
}
