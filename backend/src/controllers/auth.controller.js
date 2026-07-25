import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretmedicalkeychangeinproduction';
const TOKEN_EXPIRY = '7d'; // Maintain user session active for 7 days

/**
 * AuthController
 * Manages secure user creation and authentication sessions.
 */
export const signup = async (req, res) => {
  const { name, email, password } = req.body;

  // 1. Inputs validation
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'All fields (name, email, password) are required.'
    });
  }

  try {
    // 2. Check if user already exists
    const userCheck = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A user account with this email address already exists.'
      });
    }

    // 3. Hash password using industry standard salt rounds (10)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Save new user to the database
    const newUser = await query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
      [name, email.toLowerCase(), passwordHash]
    );

    const user = newUser.rows[0];

    // 5. Generate secure JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: {
        token,
        user
      }
    });

  } catch (error) {
    console.error('[Auth Service Error] Signup operation failed:', error.message);
    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred during signup.'
    });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  // 1. Validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required.'
    });
  }

  try {
    // 2. Find user
    const userQuery = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userQuery.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = userQuery.rows[0];

    // 3. Compare passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // 4. Create Token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    // Exclude password hash from response
    delete user.password_hash;

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user
      }
    });

  } catch (error) {
    console.error('[Auth Service Error] Login operation failed:', error.message);
    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred during login.'
    });
  }
};

export default {
  signup,
  login
};
