import 'reflect-metadata';
import { AppDataSource } from '../typeorm.config';
import { runSeed } from './database-seeder';

async function run() {
  await AppDataSource.initialize();

  try {
    await runSeed(AppDataSource);
  } finally {
    await AppDataSource.destroy();
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seeding failed', err);
  process.exit(1);
});

