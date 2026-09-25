import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/// مخزن التطوير على القرص — لأن «المخزن الوهمي» كان يرمي ما يُرفع إليه ويخدم مربعاً ملوّناً
/// مشتقاً من اسم الملف. النتيجة: كل صورة رفعها أحد ظهرت لوناً غريباً، فبدت البيئة كاذبة وهي
/// سليمة. البايتات تُحفظ الآن تحت مجلد مؤقت (خارج المستودع) ويُخدم ما رُفع بعينه.
/// الإنتاج لا يمر من هنا إطلاقاً: S3 حقيقي خلف نفس الميناء.
@Injectable()
export class DevObjectStore {
  private readonly root = join(tmpdir(), 'sinaaty-dev-media');
  private path(bucket: string, key: string) {
    return join(this.root, `${bucket}__${createHash('sha256').update(key).digest('hex')}.bin`);
  }
  put(bucket: string, key: string, bytes: Buffer) {
    mkdirSync(this.root, { recursive: true });
    writeFileSync(this.path(bucket, key), bytes);
  }
  get(bucket: string, key: string): Buffer | null {
    const p = this.path(bucket, key);
    return existsSync(p) ? readFileSync(p) : null;
  }
}
