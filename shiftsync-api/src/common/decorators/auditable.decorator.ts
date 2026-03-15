import { SetMetadata } from '@nestjs/common';

export const AUDITABLE_KEY = 'auditable';

export const Auditable = (entityType: string) =>
  SetMetadata(AUDITABLE_KEY, entityType);
