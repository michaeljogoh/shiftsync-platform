import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number;
    let body: Record<string, unknown>;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      body =
        typeof res === 'object' && res !== null
          ? { ...(res as Record<string, unknown>) }
          : { message: String(res) };
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      body = {
        statusCode,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      };
    }

    const payload = {
      ...body,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (statusCode >= 500) {
      this.logger.error(exception);
    }

    response.status(statusCode).json(payload);
  }
}
