import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';
import { validateEnv } from './env.schema';
import { AppConfig } from './app-config.service';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // **البيئة الحقيقية تسبق الملف.** الـ`validate` في Nest يستقبل ما قرأه من ملفّات `.env`
      // وحدها، ونتيجته هي مصدر `ConfigService` الأول — فمتغيّرٌ مُصدَّر في الصدفة كان يخسر أمام
      // سطرٍ في ملفٍ متتبَّع. ظهر في الاختبارات: `INTEGRATION_*=mock` المفروضة في إعداد الـe2e
      // كانت بلا أثر، فأقلعت الحزمة بمزوّدٍ حيّ. والترتيب الصحيح هو المتوقَّع في كل مكان:
      // الملف قاعدةٌ للتطوير، والبيئة تعلوه (وفي الحاويات لا ملف أصلاً).
      validate: (fromFiles: Record<string, unknown>) => validateEnv({ ...fromFiles, ...process.env }),
      envFilePath: ['.env', '.env.local'],
    }),
  ],
  providers: [AppConfig, ConfigService],
  exports: [AppConfig],
})
export class ConfigModule {}
