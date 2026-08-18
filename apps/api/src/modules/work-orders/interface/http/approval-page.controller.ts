import { Body, Controller, Get, Header, HttpCode, Param, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { ApprovalLinkService } from '../../application/approval-link.service';
import { Public, zod } from '../../../identity/interface/http';
import { renderApprovalPage } from './approval-page.html';

const CodeDto = z.object({ code: z.string().regex(/^\d{6}$/) }); type CodeDto = z.infer<typeof CodeDto>;
const DeclineDto = z.object({ reason_ar: z.string().min(3).max(500) }); type DeclineDto = z.infer<typeof DeclineDto>;

/** Public, token-gated approval page: no app install needed. */
@ApiTags('approve (web)') @Public() @Controller('approve')
export class ApprovalPageController {
  constructor(private readonly links: ApprovalLinkService) {}
  @Get(':token') @Header('Cache-Control', 'no-store') @ApiOperation({ summary: 'Arabic RTL web page to review + approve a work order version (from the SMS link)' })
  async page(@Param('token') token: string, @Res() res: Response) { const v = await this.links.view(token); res.setHeader('content-type', 'text/html; charset=utf-8'); res.send(renderApprovalPage(token, v)); }
  @Get(':token/data') data(@Param('token') token: string) { return this.links.view(token); }
  @Post(':token/otp') @HttpCode(200) otp(@Param('token') token: string) { return this.links.sendOtp(token); }
  @Post(':token/complete') @HttpCode(200) complete(@Param('token') token: string, @Body(zod(CodeDto)) dto: CodeDto, @Req() req: Request) { return this.links.complete(token, dto.code, req.ip ?? null); }
  @Post(':token/decline') @HttpCode(200) decline(@Param('token') token: string, @Body(zod(DeclineDto)) dto: DeclineDto) { return this.links.decline(token, dto.reason_ar); }
}
