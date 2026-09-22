import { DestroyRef, inject } from '@angular/core';

/** إعادة تحميل مورد كل `ms` ما دام المكوّن حيّاً — بديل refetchInterval. يُستدعى في سياق الحقن (حقل أو منشئ). */
export function poll(res: { reload(): boolean }, ms: number) {
  const id = setInterval(() => res.reload(), ms);
  inject(DestroyRef).onDestroy(() => clearInterval(id));
}
