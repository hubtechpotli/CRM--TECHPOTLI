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
const PID_FILE = path.join(__dirname, '..', '.pgdata', 'server.pid');

function stopStaleEmbeddedProcesses() {
  try {
    const output = execSync(
      'powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name = \'postgres.exe\'\\" | Where-Object { $_.CommandLine -like \'*embedded-postgres*\' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"',
      { stdio: 'pipe' },
    );
    void output;
  } catch {
    // no stale processes
  }
}

async function main() {
  stopStaleEmbeddedProcesses();

  const dataDir = path.join(__dirname, '..', '.pgdata');

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: DB_USER,
    password: DB_PASSWORD,
    port: DB_PORT,
    persistent: true,
  });

  if (!fs.existsSync(path.join(dataDir, 'PG_VERSION'))) {
    console.log('First run — initialising database cluster...');
    await pg.initialise();
  }

  await pg.start();

  try {
    await pg.createDatabase(DB_NAME);
    console.log(`Created database: ${DB_NAME}`);
  } catch {
    // database already exists
  }

  console.log('');
  console.log('PostgreSQL is running (no Docker required)');
  console.log('-------------------------------------------');
  console.log(`Port:     ${DB_PORT}`);
  console.log(`Database: ${DB_NAME}`);
  console.log(`User:     ${DB_USER}`);
  console.log(`Password: ${DB_PASSWORD}`);
  console.log('');
  console.log('DATABASE_URL for backend/.env:');
  console.log(
    `postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}?schema=public`,
  );
  console.log('');
  console.log('Next steps (new terminal):');
  console.log('  cd backend');
  console.log('  npx prisma migrate deploy');
  console.log('  npx prisma db seed');
  console.log('  npx prisma studio');
  console.log('');
  console.log('Press Ctrl+C to stop the database server.');
  console.log('');

  const shutdown = async () => {
    console.log('\nStopping PostgreSQL...');
    try {
      await pg.stop();
    } catch {
      // ignore
    }
    if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep process alive
  await new Promise(() => {});
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
