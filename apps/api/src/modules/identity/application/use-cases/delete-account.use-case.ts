import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '../../../../common/errors';
import { AuditLogWriter } from '../../../../common/audit/audit-log.writer';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../../common/ports/unit-of-work.port';
import { PrismaService } from '../../../../prisma';
import { REFRESH_TOKEN_REPOSITORY, USER_REPOSITORY, type RefreshTokenRepository, type UserRepository } from '../../domain/repositories';

/// حذف الحساب — بوابة المتاجر ونظام حماية البيانات معاً.
///
/// «الحذف» هنا **إخفاء هويةٍ لا محوُ تاريخ**: الفواتير والأوامر والدفاتر سجلاتٌ ماليةٌ يلزمنا
/// حفظها نظاماً (زاتكا: ست سنوات)، فما يُمحى هو ما يدلّ على الشخص — الاسم، البريد، الجوال،
/// رموز الدخول والأجهزة — ويبقى الأثر المالي باسم «حساب محذوف».
///
/// رمز الوصول الجاري يعيش بقية عمره (≤ JWT_ACCESS_TTL: ١٥ دقيقة) بحكم انعدام حالته — لكنه
/// لا يجد صاحبه: `deletedAt` تجعل كل تحميلٍ للمستخدم «غير موجود»، والتجديد مقطوعٌ فوراً.
/// قرارٌ موزونٌ لا سهو: قتلُ الرمز لحظياً يعني فحص قاعدةٍ في كل طلبٍ للمنصة كلها.
///
/// ويُرفض الحذف على التزامٍ مفتوح: أمرُ إصلاحٍ جارٍ أو سندٌ لم يُسدَّد — بابُ هروبٍ من
/// الالتزامات لو فُتح لاستُعمل في يومه الأول. الرسالة تسمّي العائق بالضبط.
@Injectable()
export class DeleteAccountUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogWriter,
  ) {}

  async execute(userId: string) {
    const u = await this.users.findById(userId);
    if (!u) throw new AppError('NOT_FOUND');

    // التزامات مفتوحة؟ — تُفحص في القاعدة مباشرة: عدّادان لا يملكهما مقيمٌ واحد في الذاكرة
    const [openWo, openNotes] = await Promise.all([
      this.prisma.workOrder.count({ where: { customerUserId: userId, status: { notIn: ['closed', 'cancelled', 'delivered', 'abandoned'] } } }),
      this.prisma.promissoryNote.count({ where: { debtorUserId: userId, status: { in: ['issued', 'partially_settled'] } } }),
    ]);
    if (openWo > 0) throw new AppError('CONFLICT', { messageAr: `عندك ${openWo} أمر إصلاح جارٍ — أكمِله أو ألغِه ثم احذف حسابك.`, messageEn: 'You have open repair orders; close or cancel them first.' });
    if (openNotes > 0) throw new AppError('CONFLICT', { messageAr: `عليك ${openNotes} سند لم يُسدَّد — الحذف بعد السداد.`, messageEn: 'You have unsettled promissory notes; deletion after settlement.' });

    await this.uow.run(async (tx) => {
      await this.users.anonymize(userId, tx);
      await this.refreshTokens.revokeAllForUser(userId);
      await this.audit.write(tx, { action: 'user.delete_account', entityType: 'user', entityId: userId, actorUserId: userId, after: { anonymized: true } });
    });
    return { deleted: true };
  }
}
