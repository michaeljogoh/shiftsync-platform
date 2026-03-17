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
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    ApiCreatedResponse({ description })(target, propertyKey, descriptor);
    defaultBadRequest()(target, propertyKey, descriptor);
    defaultUnauthorized()(target, propertyKey, descriptor);
    defaultForbidden()(target, propertyKey, descriptor);
    defaultConflict()(target, propertyKey, descriptor);
  } as MethodDecorator;
}

/** Apply common response decorators for a get-by-id style endpoint */
export function ApiGetResponses() {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    defaultNotFound()(target, propertyKey, descriptor);
    defaultUnauthorized()(target, propertyKey, descriptor);
    defaultForbidden()(target, propertyKey, descriptor);
  } as MethodDecorator;
}

/** Single decorators for ad-hoc use */
export const ApiResponses = {
  BadRequest: defaultBadRequest,
  Unauthorized: defaultUnauthorized,
  Forbidden: defaultForbidden,
  NotFound: defaultNotFound,
  Conflict: defaultConflict,
};
