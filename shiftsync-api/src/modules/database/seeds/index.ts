import 'reflect-metadata';
import { AppDataSource } from '../typeorm.config';

async function run() {
  await AppDataSource.initialize();

  try {
    // TODO: implement DatabaseSeeder in later step
    // Placeholder to satisfy npm run seed
  } finally {
    await AppDataSource.destroy();
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seeding failed', err);
  process.exit(1);
});

