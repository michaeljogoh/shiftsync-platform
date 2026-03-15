import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        PORT: Joi.number().default(3000),
        FRONTEND_URL: Joi.string().uri().required(),
        DATABASE_URL: Joi.string().uri().required(),
        JWT_SECRET: Joi.string().min(16).required(),
        JWT_EXPIRES_IN: Joi.string().default('15m'),
        REFRESH_TOKEN_SECRET: Joi.string().min(16).required(),
        REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('7d'),
        POSTMARK_SERVER_TOKEN: Joi.string().allow('').optional(),
        POSTMARK_FROM_EMAIL: Joi.string().email().allow('').optional(),
        REDIS_URL: Joi.string().uri().optional(),
        ENABLE_EMAIL_NOTIFICATIONS: Joi.string()
          .valid('true', 'false')
          .default('true'),
        OVERTIME_HARD_BLOCK_HOURS: Joi.number().default(12),
        DEFAULT_EDIT_CUTOFF_HOURS: Joi.number().default(48),
      }),
    }),
  ],
})
export class ConfigModule {}
