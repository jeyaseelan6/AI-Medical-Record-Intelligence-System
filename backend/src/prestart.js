import dotenv from 'dotenv';

// Helper to sanitize CLOUDINARY_URL
const sanitizeCloudinary = () => {
  if (process.env.CLOUDINARY_URL) {
    const url = process.env.CLOUDINARY_URL.trim();
    if (url === '' || url === 'your_cloudinary_url_here' || !url.startsWith('cloudinary://')) {
      delete process.env.CLOUDINARY_URL;
    }
  }
};

// Intercept all future dotenv.config() invocations
const originalConfig = dotenv.config;
dotenv.config = function (options) {
  const res = originalConfig.call(this, options);
  sanitizeCloudinary();
  return res;
};

// Initial sanitization for the startup process
dotenv.config();
sanitizeCloudinary();
