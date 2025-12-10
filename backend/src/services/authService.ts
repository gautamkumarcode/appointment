import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Tenant } from '../models/Tenant';
import { IUser, User } from '../models/User';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
const SALT_ROUNDS = 10;

export interface RegisterUserDTO {
  email: string;
  password: string;
  name: string;
  tenantId: string;
  role?: 'owner' | 'admin' | 'staff';
}

export interface LoginDTO {
  email: string;
  password: string;
  tenantId?: string;
}

export interface TokenPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export class AuthService {
  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Compare a plain text password with a hashed password
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT access token
   */
  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN as string,
    } as jwt.SignOptions);
  }

  /**
   * Generate JWT refresh token
   */
  generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN as string,
    } as jwt.SignOptions);
  }

  /**
   * Verify and decode JWT token
   */
  verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Register a new user
   */
  async register(data: RegisterUserDTO): Promise<{ user: IUser }> {
    try {
      // Check if tenant exists
      const tenant = await Tenant.findById(data.tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        tenantId: data.tenantId,
        email: data.email.toLowerCase(),
      });

      if (existingUser) {
        throw new Error('User with this email already exists for this tenant');
      }

      // Hash password
      const passwordHash = await this.hashPassword(data.password);

      // Create user
      const user = await User.create({
        tenantId: data.tenantId,
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
        role: data.role || 'owner',
      });

      logger.info(`User registered successfully: ${user.email}`);

      return { user };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(data: LoginDTO): Promise<{ user: IUser }> {
    try {
      // Build query
      const query: { email: string; tenantId?: string } = {
        email: data.email.toLowerCase(),
      };

      if (data.tenantId) {
        query.tenantId = data.tenantId;
      }

      // Find user
      const user = await User.findOne(query);

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await this.comparePassword(data.password, user.passwordHash);

      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      logger.info(`User logged in successfully: ${user.email}`);

      return { user };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const payload = this.verifyToken(refreshToken);

      // Verify user still exists
      const user = await User.findById(payload.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate new tokens
      const tokenPayload: TokenPayload = {
        userId: user._id.toString(),
        tenantId: user.tenantId.toString(),
        email: user.email,
        role: user.role,
      };

      const tokens: AuthTokens = {
        accessToken: this.generateAccessToken(tokenPayload),
        refreshToken: this.generateRefreshToken(tokenPayload),
        expiresIn: JWT_EXPIRES_IN,
      };

      logger.info(`Token refreshed for user: ${user.email}`);

      return tokens;
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<IUser | null> {
    return User.findById(userId).select('-passwordHash');
  }

  /**
   * Get user by email and tenant
   */
  async getUserByEmail(email: string, tenantId: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase(), tenantId }).select('-passwordHash');
  }
}

export const authService = new AuthService();
