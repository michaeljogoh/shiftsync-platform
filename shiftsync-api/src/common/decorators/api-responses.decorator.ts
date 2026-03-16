import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

const defaultBadRequest = () =>
  ApiBadRequestResponse({ description: 'Validation failed or invalid request body' });
const defaultUnauthorized = () =>
  ApiUnauthorizedResponse({ description: 'Missing or invalid access token' });
const defaultForbidden = () =>
  ApiForbiddenResponse({ description: 'Insufficient permissions' });
const defaultNotFound = () =>
  ApiNotFoundResponse({ description: 'Resource not found' });
const defaultConflict = () =>
  ApiConflictResponse({ description: 'Conflict (e.g. duplicate, business rule)' });

/** Apply common response decorators for a create (POST) endpoint */
export function ApiCreateResponses(description = 'Resource created') {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    ApiCreatedResponse({ description })(
      target,
      propertyKey,
    );
    defaultBadRequest()(target, propertyKey);
    defaultUnauthorized()(target, propertyKey);
    defaultForbidden()(target, propertyKey);
    defaultConflict()(target, propertyKey);
  };
}

/** Apply common response decorators for a get-by-id style endpoint */
export function ApiGetResponses() {
  return function (
    target: object,
    propertyKey: string,
  ) {
    defaultNotFound()(target, propertyKey);
    defaultUnauthorized()(target, propertyKey);
    defaultForbidden()(target, propertyKey);
  };
}

/** Single decorators for ad-hoc use */
export const ApiResponses = {
  BadRequest: defaultBadRequest,
  Unauthorized: defaultUnauthorized,
  Forbidden: defaultForbidden,
  NotFound: defaultNotFound,
  Conflict: defaultConflict,
};
