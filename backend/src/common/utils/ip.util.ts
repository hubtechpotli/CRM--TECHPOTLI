export function ipMatchesCidr(ip: string, cidr: string): boolean {
  const normalized = ip === '::1' ? '127.0.0.1' : ip.replace(/^::ffff:/, '');
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
