import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AuditService } from './audit.service';
import { AUDITABLE_KEY } from '../../common/decorators/auditable.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const entityType = this.reflector.get<string>(AUDITABLE_KEY, context.getHandler());
    if (!entityType) return next.handle();

    const request = context.switchToHttp().getRequest();
    const method = request.method;
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = request.user;
    const actorId = user?.id ?? null;
    const ipAddress = request.ip ?? request.connection?.remoteAddress ?? null;
    const userAgent = request.get?.('user-agent') ?? null;

    return next.handle().pipe(
      tap({
        next: (value: unknown) => {
          const body = request.body ?? {};
          const params = request.params ?? {};
          const res = (value ?? {}) as Record<string, unknown>;
          const entityId = params.id ?? body.id ?? res.id;
          let locationId =
            body.locationId ??
            params.locationId ??
            res.locationId ??
            null;
          if (!locationId && entityType === 'location') {
            locationId = params.id ?? null;
          }
          if (entityId) {
            this.auditService
              .create({
                actorId,
                entityType,
                entityId: String(entityId),
                action: `${entityType}.${method.toLowerCase()}`,
                afterState: body as Record<string, unknown>,
                ipAddress,
                userAgent,
                locationId: locationId ? String(locationId) : null,
              })
              .catch((err) => {
                console.error('[AuditInterceptor] Failed to save audit log:', err?.message);
              });
          }
        },
      }),
    );
  }
}
