import jwt from 'jsonwebtoken';

/**
 * Authentication Middleware
 * Enforces JWT token verification on protected routes.
 * Decodes the user ID and role, making it available in req.user.
 */
export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Authorization token missing or malformed.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretmedicalkeychangeinproduction');
    
    // Attach the authenticated user payload to the request object
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name
    };
    
    next();
  } catch (error) {
    console.warn(`[Auth Warning] Token validation failed: ${error.message}`);
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired authentication token.'
    });
  }
};

export default requireAuth;
