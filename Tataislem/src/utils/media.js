export const getImageUrl = (imagePath) => {
  const fallback = '/assets/images/default.jpg';

  if (!imagePath || typeof imagePath !== 'string') {
    return fallback;
  }

  const path = imagePath.trim();

  if (!path) {
    return fallback;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.replace(/\\/g, '/').replace(/^\/+/, '');

  if (normalizedPath.startsWith('api/uploads/')) {
    return `/${normalizedPath}`;
  }

  if (normalizedPath.startsWith('uploads/')) {
    return `/api/${normalizedPath}`;
  }

  return `/api/uploads/${normalizedPath}`;
};
