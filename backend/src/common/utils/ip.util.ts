export function normalizeClientIp(ip: string): string {
  const trimmed = ip.trim();
  if (trimmed === '::1') return '127.0.0.1';
  return trimmed.replace(/^::ffff:/, '');
}

export function parseEnvOfficeCidrs(): string[] {
  const raw = process.env.ALLOWED_OFFICE_IPS?.trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
}

export function ipMatchesCidr(ip: string, cidr: string): boolean {
  const normalized = normalizeClientIp(ip);
  if (!cidr.includes('/')) {
    return normalized === cidr || normalized === cidr.replace('/32', '');
  }
  const [range, bitsStr] = cidr.split('/');
  const bits = parseInt(bitsStr, 10);
  const ipNum = ipv4ToInt(normalized);
  const rangeNum = ipv4ToInt(range);
  if (ipNum === null || rangeNum === null) return normalized === range;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipNum & mask) === (rangeNum & mask);
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = parseInt(p, 10);
    if (Number.isNaN(v) || v < 0 || v > 255) return null;
    n = (n << 8) + v;
  }
  return n >>> 0;
}

export function parseUserAgent(ua: string): { device: string; browser: string } {
  let browser = 'Unknown';
  let device = 'Desktop';
  if (/mobile/i.test(ua)) device = 'Mobile';
  else if (/tablet/i.test(ua)) device = 'Tablet';
  if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua)) browser = 'Safari';
  else if (/Edge/i.test(ua)) browser = 'Edge';
  return { device, browser };
}
