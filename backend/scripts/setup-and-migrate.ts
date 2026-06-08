/* eslint-disable @typescript-eslint/no-require-imports */
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const EmbeddedPostgres = require('embedded-postgres').default;

const DB_PORT = 5433;
const DB_USER = 'techpotli';
const DB_PASSWORD = 'techpotli';
const DB_NAME = 'techpotli_os';
const DATABASE_URL = `postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}?schema=public`;

async function main() {
  const backendDir = path.join(__dirname, '..');
  const dataDir = path.join(backendDir, '.pgdata');

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: DB_USER,
    password: DB_PASSWORD,
    port: DB_PORT,
    persistent: true,
  });

  const isInitialized = fs.existsSync(path.join(dataDir, 'PG_VERSION'));

  if (!isInitialized) {
    console.log('Initialising embedded PostgreSQL...');
    await pg.initialise();
  } else {
    console.log('Using existing embedded PostgreSQL data directory...');
  }

  await pg.start();

  try {
    await pg.createDatabase(DB_NAME);
    console.log(`Created database: ${DB_NAME}`);
  } catch {
    console.log(`Database ${DB_NAME} already exists`);
  }

  console.log(`PostgreSQL running on port ${DB_PORT}`);

  const env = { ...process.env, DATABASE_URL };

  console.log('Applying migrations...');
  execSync('npx prisma migrate deploy', {
    cwd: backendDir,
    env,
    stdio: 'inherit',
  });

  console.log('Running seed...');
  execSync('npx prisma db seed', {
    cwd: backendDir,
    env,
    stdio: 'inherit',
  });

  console.log('Verifying seed data...');
  execSync('npx ts-node scripts/verify-seed.ts', {
    cwd: backendDir,
    env,
    stdio: 'inherit',
  });

  try {
    await pg.stop();
  } catch {
    console.log('Postgres stopped (with warnings — safe to ignore).');
  }
  console.log('Setup complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
