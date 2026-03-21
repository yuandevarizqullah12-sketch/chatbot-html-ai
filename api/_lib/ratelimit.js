// Simple in-memory rate limiter (per minute)
const requests = new Map(); // key -> { count, resetTime }

export default function rateLimit(identifier, maxRequestsPerMinute = 30) {
  const now = Date.now();
  const minute = 60 * 1000;
  const record = requests.get(identifier);
  if (!record || now > record.resetTime) {
    requests.set(identifier, { count: 1, resetTime: now + minute });
    return { allowed: true, remaining: maxRequestsPerMinute - 1 };
  }
  if (record.count >= maxRequestsPerMinute) {
    const waitSeconds = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, remaining: 0, wait: waitSeconds };
  }
  record.count++;
  return { allowed: true, remaining: maxRequestsPerMinute - record.count };
}