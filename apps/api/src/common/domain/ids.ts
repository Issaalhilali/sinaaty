import { uuidv7 } from 'uuidv7';

/** Time-ordered UUIDv7 for every app-generated primary key (CLAUDE.md §5.1). */
export const newId = (): string => uuidv7();
export const isUuid = (s: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
