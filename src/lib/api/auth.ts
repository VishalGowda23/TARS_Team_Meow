// TARS Authentication API
// Handles user authentication with the backend service

import { apiClient } from './client';

export interface User {
  id: string;
  email: string;
  role: 'AGENT' | 'VALIDATOR' | 'HIGHER_AUTHORITY' | 'ADMIN';
  walletAddress?: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  firstName?: string;
  lastName?: string;
  role?: 'AGENT' | 'VALIDATOR' | 'HIGHER_AUTHORITY' | 'ADMIN';
  walletAddress?: string;
}

export interface AuthResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  user: User;
}

export class AuthAPI {
  
  // Store tokens in localStorage
  private static getStoredTokens(): { accessToken?: string; refreshToken?: string } {
    if (typeof window === 'undefined') return {};
    
    return {
      accessToken: localStorage.getItem('tars-access-token') || undefined,
      refreshToken: localStorage.getItem('tars-refresh-token') || undefined,
    };
  }

  private static storeTokens(tokens: { accessToken: string; refreshToken: string }): void {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem('tars-access-token', tokens.accessToken);
    localStorage.setItem('tars-refresh-token', tokens.refreshToken);
  }

  private static clearTokens(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem('tars-access-token');
    localStorage.removeItem('tars-refresh-token');
    localStorage.removeItem('tars-user-role');
    localStorage.removeItem('tars-user-email');
    localStorage.removeItem('tars-logged-in');
  }

  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      
      if (response.success) {
        // Store tokens
        this.storeTokens({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken
        });

        // Store user info for backward compatibility
        localStorage.setItem('tars-user-role', response.user.role.toLowerCase());
        localStorage.setItem('tars-user-email', response.user.email);
        localStorage.setItem('tars-logged-in', 'true');

        return response;
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  }

  static async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/register', credentials);
      
      if (response.success) {
        // Store tokens
        this.storeTokens({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken
        });

        // Store user info for backward compatibility
        localStorage.setItem('tars-user-role', response.user.role.toLowerCase());
        localStorage.setItem('tars-user-email', response.user.email);
        localStorage.setItem('tars-logged-in', 'true');

        return response;
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    }
  }

  static async refreshToken(): Promise<AuthResponse | null> {
    try {
      const { refreshToken } = this.getStoredTokens();
      
      if (!refreshToken) {
        return null;
      }

      const response = await apiClient.post('/auth/refresh', { refreshToken });
      
      if (response.success) {
        // Store new tokens
        this.storeTokens({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken
        });

        return response;
      } else {
        this.clearTokens();
        return null;
      }
    } catch (error) {
      this.clearTokens();
      return null;
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      const { accessToken } = this.getStoredTokens();
      
      if (!accessToken) {
        return null;
      }

      const response = await apiClient.get('/auth/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.success) {
        return response.user;
      } else {
        // Try to refresh token
        const refreshResult = await this.refreshToken();
        if (refreshResult) {
          return refreshResult.user;
        } else {
          this.clearTokens();
          return null;
        }
      }
    } catch (error) {
      // Try to refresh token
      const refreshResult = await this.refreshToken();
      if (refreshResult) {
        return refreshResult.user;
      } else {
        this.clearTokens();
        return null;
      }
    }
  }

  static async logout(): Promise<boolean> {
    try {
      const { accessToken } = this.getStoredTokens();
      
      if (accessToken) {
        await apiClient.post('/auth/logout', {}, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
      }
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      this.clearTokens();
    }
    
    return true;
  }

  static isLoggedIn(): boolean {
    if (typeof window === 'undefined') return false;
    
    const { accessToken } = this.getStoredTokens();
    return !!accessToken;
  }

  static getAuthHeaders(): Record<string, string> {
    const { accessToken } = this.getStoredTokens();
    
    if (accessToken) {
      return {
        'Authorization': `Bearer ${accessToken}`
      };
    }
    
    return {};
  }

  // Create predefined users for demo/testing
  static async createDemoUsers(): Promise<void> {
    const demoUsers = [
      {
        email: 'agent1@tars.network',
        password: 'agent123',
        firstName: 'Agent',
        lastName: 'Smith',
        role: 'AGENT' as const
      },
      {
        email: 'agent2@tars.network',
        password: 'agent123',
        firstName: 'Alex',
        lastName: 'Wilson',
        role: 'AGENT' as const
      },
      {
        email: 'agent3@tars.network',
        password: 'agent123',
        firstName: 'Sarah',
        lastName: 'Connor',
        role: 'AGENT' as const
      },
      {
        email: 'validator1@tars.network',
        password: 'validator123',
        firstName: 'Validator',
        lastName: 'Johnson',
        role: 'VALIDATOR' as const
      },
      {
        email: 'validator2@tars.network',
        password: 'validator123',
        firstName: 'Mark',
        lastName: 'Chen',
        role: 'VALIDATOR' as const
      },
      {
        email: 'validator3@tars.network',
        password: 'validator123',
        firstName: 'Emily',
        lastName: 'Parker',
        role: 'VALIDATOR' as const
      },
      {
        email: 'jane.agent@tars.network',
        password: 'jane123',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'AGENT' as const
      },
      {
        email: 'whistleblower@tars.network',
        password: 'whistle123',
        firstName: 'Anonymous',
        lastName: 'Source',
        role: 'AGENT' as const
      }
    ];

    for (const user of demoUsers) {
      try {
        await this.register(user);
        console.log(`✅ Created demo user: ${user.email}`);
      } catch (error) {
        // User probably already exists
        console.log(`ℹ️ Demo user already exists: ${user.email}`);
      }
    }
  }
}