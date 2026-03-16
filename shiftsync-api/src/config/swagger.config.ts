import { DocumentBuilder } from '@nestjs/swagger';

/**
 * Swagger/OpenAPI document configuration.
 * Used in main.ts; UI is served at /api/docs in non-production.
 */
export const swaggerConfig = new DocumentBuilder()
  .setTitle('ShiftSync API')
  .setDescription(
    'Workforce scheduling API. All routes are under **/api/v1**. Authenticate with Bearer token except for login/refresh.',
  )
  .setVersion('1.0')
  .addBearerAuth()
  .addTag('Auth', 'Login, refresh, session, notification preferences')
  .addTag('Users', 'User CRUD, skills, certifications')
  .addTag('Locations', 'Locations and manager assignments')
  .addTag('Skills', 'Skills CRUD')
  .addTag('Availability', 'Availability windows and exceptions')
  .addTag('Shifts', 'Shifts CRUD, publish, assignments')
  .addTag('Assignments', 'Create/remove shift assignments')
  .addTag('Swaps', 'Swap/drop requests and actions')
  .addTag('Notifications', 'In-app notifications')
  .addTag('Audit', 'Audit logs and export')
  .addTag('Analytics', 'Overtime, hours, fairness')
  .addTag('Health', 'Health check')
  .build();
