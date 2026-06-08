/**
 * Send a test email via Resend (same as Resend quickstart).
 * Usage: set RESEND_API_KEY in backend/.env, then:
 *   npm run mail:test
 * Optional: TEST_EMAIL_TO=you@example.com npm run mail:test
 */
import * as fs from 'fs';
import * as path from 'path';
import { Resend } from 'resend';

function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnvFile();

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 're_xxxxxxxxx') {
    console.error('Set RESEND_API_KEY in backend/.env (replace re_xxxxxxxxx with your real key).');
    process.exit(1);
  }

  const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const to = process.env.TEST_EMAIL_TO || 'onboarding@techpotli.com';

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: 'Hello World',
    html: '<p>Congrats on sending your <strong>first email</strong>!</p>',
  });

  if (error) {
    console.error('Resend error:', error);
    process.exit(1);
  }

  console.log('Email sent successfully.');
  console.log('  id:', data?.id);
  console.log('  from:', from);
  console.log('  to:', to);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
