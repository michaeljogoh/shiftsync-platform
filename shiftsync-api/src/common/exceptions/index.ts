import { HttpException, HttpStatus } from '@nestjs/common';

export class SchedulingConstraintException extends HttpException {
  constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
    public readonly suggestions?: Array<{ userId: string; name: string; reason: string }>,
  ) {
    super(
      {
        statusCode: 422,
        error: 'ConstraintViolation',
        message,
        details,
        suggestions,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class EditCutoffException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: 409,
        error: 'EditCutoff',
        message,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class ConcurrencyConflictException extends HttpException {
  constructor(message: string, public readonly details?: Record<string, unknown>) {
    super(
      {
        statusCode: 409,
        error: 'ConcurrencyConflict',
        message,
        details,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class PermissionDeniedException extends HttpException {
  constructor(message = 'Permission denied') {
    super(
      {
        statusCode: 403,
        error: 'Forbidden',
        message,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class AssignmentConflictException extends HttpException {
  constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
    public readonly suggestions?: Array<{ userId: string; name: string; reason: string }>,
  ) {
    super(
      {
        statusCode: 409,
        error: 'Conflict',
        message,
        details,
        suggestions,
      },
      HttpStatus.CONFLICT,
    );
  }
}
