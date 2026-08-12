import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Helper to sanitize CLOUDINARY_URL
const sanitizeCloudinary = () => {
  if (process.env.CLOUDINARY_URL) {
    const url = process.env.CLOUDINARY_URL.trim();
    if (url === '' || url === 'your_cloudinary_url_here' || !url.startsWith('cloudinary://')) {
      delete process.env.CLOUDINARY_URL;
    }
  }
};

// Automatic environment file resolver based on NODE_ENV
const loadEnvironment = () => {
  const env = process.env.NODE_ENV || 'development';
  const specificEnvFile = env === 'production' ? '.env.production' : '.env.development';

  // 1. Try environment-specific file (.env.development or .env.production)
  if (fs.existsSync(path.resolve(specificEnvFile))) {
    dotenv.config({ path: path.resolve(specificEnvFile) });
  } else if (fs.existsSync(path.resolve('.env'))) {
    // 2. Fallback to standard .env if specific file is not present
    dotenv.config({ path: path.resolve('.env') });
  } else {
    // 3. System environment variables (e.g. AWS Lambda environment)
    dotenv.config();
  }

  sanitizeCloudinary();
};

// Intercept future dotenv.config() invocations
const originalConfig = dotenv.config;
dotenv.config = function (options) {
  const res = originalConfig.call(this, options);
  sanitizeCloudinary();
  return res;
};

// Initial environment loading
loadEnvironment();
