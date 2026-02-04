import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import type { User, UserRole } from '@prisma/client';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials extends LoginCredentials {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  walletAddress?: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'passwordHash'>;
}

const JWT_SECRET = process.env.JWT_SECRET || 'tars-secret-key-2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'tars-refresh-secret-2026';
const SALT_ROUNDS = 12;

// In-memory fallback users when database is unavailable
const DEMO_USERS: { [email: string]: { password: string; role: UserRole; firstName: string; lastName: string } } = {
  'admin@tars.io': { password: 'password123', role: 'ADMIN', firstName: 'System', lastName: 'Admin' },
  'agent1@tars.io': { password: 'password123', role: 'AGENT', firstName: 'Agent', lastName: 'One' },
  'agent2@tars.io': { password: 'password123', role: 'AGENT', firstName: 'Agent', lastName: 'Two' },
  'agent3@tars.io': { password: 'password123', role: 'AGENT', firstName: 'Agent', lastName: 'Three' },
  'validator1@tars.io': { password: 'password123', role: 'VALIDATOR', firstName: 'Validator', lastName: 'One' },
  'validator2@tars.io': { password: 'password123', role: 'VALIDATOR', firstName: 'Validator', lastName: 'Two' },
  'validator3@tars.io': { password: 'password123', role: 'VALIDATOR', firstName: 'Validator', lastName: 'Three' },
  'authority@tars.io': { password: 'password123', role: 'HIGHER_AUTHORITY', firstName: 'Higher', lastName: 'Authority' },
  'whistleblower@tars.io': { password: 'password123', role: 'AGENT', firstName: 'Anonymous', lastName: 'Whistleblower' },
};

// Track if we're in fallback mode
let useFallbackAuth = false;

// Default credentials for admin
const DEFAULT_ADMIN = {
  email: 'admin@tars.io',
  password: 'password123',
  role: 'ADMIN' as UserRole,
  firstName: 'System',
  lastName: 'Admin'
};

export class AuthService {
  
  static async initializeDefaultUsers(): Promise<void> {
    try {
      // Check if we can query any user to verify database connection
      const existingAdmin = await prisma.user.findFirst({
        where: { 
          OR: [
            { role: 'ADMIN' },
            { role: 'HIGHER_AUTHORITY' }
          ]
        }
      });

      if (!existingAdmin) {
        // Create default admin user if no admin exists
        const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, SALT_ROUNDS);
        
        await prisma.user.create({
          data: {
            email: DEFAULT_ADMIN.email,
            passwordHash: hashedPassword,
            role: DEFAULT_ADMIN.role,
            firstName: DEFAULT_ADMIN.firstName,
            lastName: DEFAULT_ADMIN.lastName,
          }
        });
        
        console.log('🔐 Default admin user created');
      } else {
        console.log(`✅ Found existing admin: ${existingAdmin.email}`);
      }
      useFallbackAuth = false;
      console.log('✅ Database authentication ready');
    } catch (error) {
      console.warn('⚠️ Database auth failed, using in-memory fallback for demo users');
      useFallbackAuth = true;
    }
  }

  // Fallback login for demo users
  static async loginWithFallback(credentials: LoginCredentials): Promise<AuthTokens> {
    const { email, password } = credentials;
    const emailLower = email.toLowerCase();
    
    const demoUser = DEMO_USERS[emailLower];
    if (!demoUser || demoUser.password !== password) {
      throw new Error('Invalid credentials');
    }

    const user = {
      id: crypto.randomUUID(),
      email: emailLower,
      role: demoUser.role,
      firstName: demoUser.firstName,
      lastName: demoUser.lastName,
      walletAddress: null,
      isActive: true,
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const refreshToken = crypto.randomBytes(32).toString('hex');

    return {
      accessToken,
      refreshToken,
      user
    };
  }

  static async registerUser(credentials: RegisterCredentials): Promise<AuthTokens> {
    const { email, password, firstName, lastName, role = 'AGENT', walletAddress } = credentials;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        role,
        firstName,
        lastName,
        walletAddress,
      }
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);
    
    return tokens;
  }

  static async loginUser(credentials: LoginCredentials, ipAddress?: string, userAgent?: string): Promise<AuthTokens> {
    const { email, password } = credentials;

    // Use fallback if database is unavailable
    if (useFallbackAuth) {
      console.log('🔄 Using fallback authentication');
      return this.loginWithFallback(credentials);
    }

    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user || !user.isActive) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // Generate tokens
      const tokens = await this.generateTokens(user, ipAddress, userAgent);
      
      return tokens;
    } catch (error: any) {
      // If database error, try fallback
      if (error.code?.startsWith('P') || error.message?.includes('database') || error.message?.includes('connection')) {
        console.log('🔄 Database error, switching to fallback authentication');
        useFallbackAuth = true;
        return this.loginWithFallback(credentials);
      }
      throw error;
    }
  }

  static async generateTokens(user: User, ipAddress?: string, userAgent?: string): Promise<AuthTokens> {
    const accessToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = crypto.randomBytes(32).toString('hex');

    // Store session in database
    await prisma.userSession.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        ipAddress,
        userAgent,
      }
    });

    // Clean up expired sessions
    await this.cleanupExpiredSessions(user.id);

    const { passwordHash, ...userWithoutPassword } = user;

    return {
      accessToken,
      refreshToken,
      user: userWithoutPassword
    };
  }

  static async refreshToken(refreshToken: string): Promise<AuthTokens | null> {
    const session = await prisma.userSession.findUnique({
      where: { refreshToken },
      include: { user: true }
    });

    if (!session || !session.isActive || session.expiresAt < new Date()) {
      return null;
    }

    // Generate new tokens
    const tokens = await this.generateTokens(session.user, session.ipAddress || undefined, session.userAgent || undefined);

    // Deactivate old session
    await prisma.userSession.update({
      where: { id: session.id },
      data: { isActive: false }
    });

    return tokens;
  }

  static async verifyToken(token: string): Promise<User | null> {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      
      const session = await prisma.userSession.findUnique({
        where: { token },
        include: { user: true }
      });

      if (!session || !session.isActive || session.expiresAt < new Date()) {
        return null;
      }

      // Update last used timestamp
      await prisma.userSession.update({
        where: { id: session.id },
        data: { lastUsedAt: new Date() }
      });

      return session.user;
    } catch (error) {
      return null;
    }
  }

  static async logoutUser(token: string): Promise<boolean> {
    try {
      await prisma.userSession.updateMany({
        where: { token },
        data: { isActive: false }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  static async logoutAllSessions(userId: string): Promise<boolean> {
    try {
      await prisma.userSession.updateMany({
        where: { userId },
        data: { isActive: false }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  static async cleanupExpiredSessions(userId?: string): Promise<void> {
    const where = userId ? { userId, expiresAt: { lt: new Date() } } : { expiresAt: { lt: new Date() } };
    
    await prisma.userSession.deleteMany({ where });
  }

  static async getUserSessions(userId: string): Promise<any[]> {
    return prisma.userSession.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        createdAt: true,
        lastUsedAt: true,
        ipAddress: true,
        userAgent: true,
      },
      orderBy: { lastUsedAt: 'desc' }
    });
  }
}