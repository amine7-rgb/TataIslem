const DEFAULT_CLIENT_URL = 'http://localhost:5173';

const normalizeOrigin = (value) => {
  const candidate = String(value || '').trim();

  if (!candidate) {
    return null;
  }

  try {
    const url = new URL(candidate);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
};

export const getAllowedOrigins = () => {
  const origins = [
    DEFAULT_CLIENT_URL,
    'http://127.0.0.1:5173',
    'https://tata-islem.com',
    'https://www.tata-islem.com',
    process.env.CLIENT_URL,
    process.env.PROD_CLIENT_URL,
    ...String(process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((item) => item.trim()),
  ]
    .map(normalizeOrigin)
    .filter(Boolean);

  return [...new Set(origins)];
};

export const resolveClientBaseUrl = (candidateOrigin) => {
  const allowedOrigins = getAllowedOrigins();
  const normalizedCandidate = normalizeOrigin(candidateOrigin);

  if (normalizedCandidate && allowedOrigins.includes(normalizedCandidate)) {
    return normalizedCandidate;
  }

  return normalizeOrigin(process.env.CLIENT_URL) || DEFAULT_CLIENT_URL;
};

export const buildClientRouteUrl = (candidateOrigin, routePath) => {
  const baseUrl = resolveClientBaseUrl(candidateOrigin).replace(/\/$/, '');
  const normalizedPath = String(routePath || '').startsWith('/')
    ? routePath
    : `/${String(routePath || '')}`;

  return `${baseUrl}${normalizedPath}`;
};
