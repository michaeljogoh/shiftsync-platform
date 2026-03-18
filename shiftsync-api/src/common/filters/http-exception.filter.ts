import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import type { ErrorResponse } from '../errors/error-response.types';
import {
  buildErrorResponse,
  normalizeMessage,
} from '../errors/error-response.types';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const path = request.url ?? request.path ?? request.originalUrl ?? '';

    let payload: ErrorResponse;

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const res = exception.getResponse();
      const isObject = typeof res === 'object' && res !== null;
      const body = isObject ? (res as Record<string, unknown>) : { message: String(res) };

      const rawMessage = body.message as string | string[] | undefined;
      const message = normalizeMessage(rawMessage);
      const error = (body.error as string) ?? this.defaultErrorForStatus(statusCode);
      let details = body.details as Record<string, unknown> | unknown[] | undefined;
      if (Array.isArray(rawMessage) && rawMessage.length > 0 && details == null) {
        details = { validationErrors: rawMessage };
      }
      const suggestions = body.suggestions as Array<{ userId: string; name: string; reason: string }> | undefined;

      payload = buildErrorResponse(statusCode, message, {
        error,
        details,
        suggestions,
        path,
      });
    } else {
      const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
      const message = isProduction
        ? 'An unexpected error occurred'
        : (exception instanceof Error ? exception.message : String(exception));
      const details =
        !isProduction && exception instanceof Error && exception.stack
          ? ({ stack: exception.stack } as Record<string, unknown>)
          : undefined;

      payload = buildErrorResponse(statusCode, message, {
        error: 'Internal Server Error',
        details,
        path,
      });

      this.logger.error(
        exception instanceof Error ? exception.message : exception,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(payload.statusCode).json(payload);
  }

  private defaultErrorForStatus(status: number): string {
    const map: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      500: 'Internal Server Error',
    };
    return map[status] ?? 'Error';
  }
}
