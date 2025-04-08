/**
 * Tests for Auth Service
 */

const { jest: jestConfig } = require('@jest/globals');

// Mock bcrypt first, before other imports
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true)
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockImplementation((payload, secret, options) => {
    // Create an object that mimics a JWT token with encoded payload
    return `mock_${payload.id}_token_${options.expiresIn}`;
  }),
  verify: jest.fn().mockImplementation((token, secret) => {
    // Parse our mocked token format to extract the user ID
    const parts = token.split('_');
    return { id: parts[1] };
  })
}));

// After mocking, import required modules
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Create mocks for dependencies
const mockUserService = {
  createUser: jest.fn(),
  getUserByEmail: jest.fn(),
  getUserById: jest.fn(),
  updateLoginInfo: jest.fn(),
  incrementLoginAttempts: jest.fn(),
  updateUserById: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Mock the user service and logger
jest.mock('../../../services/user/userService', () => mockUserService);
jest.mock('../../../utils/logger', () => mockLogger);

// Import the Auth Service after mocking
const AuthService = require('../../../services/auth/authService');

describe('Auth Service', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('should create a new user and return sanitized user data', async () => {
      // Setup
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser'
      };

      const createdUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashed_password',
        role: 'user'
      };

      mockUserService.createUser.mockResolvedValue(createdUser);
      
      // Execute
      const result = await AuthService.signup(userData);
      
      // Verify
      expect(mockUserService.createUser).toHaveBeenCalledWith({
        ...userData,
        provider: 'local'
      });
      
      // Ensure password is not in the returned user data
      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user'
      });
      expect(result.password).toBeUndefined();
    });

    it('should handle errors during user creation', async () => {
      // Setup
      const userData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const error = new Error('Email already in use');
      mockUserService.createUser.mockRejectedValue(error);
      
      // Execute & Verify
      await expect(AuthService.signup(userData)).rejects.toThrow('Email already in use');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should authenticate a user and return tokens', async () => {
      // Setup
      const email = 'test@example.com';
      const password = 'password123';
      
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed_password',
        username: 'testuser',
        role: 'user',
        isActive: true
      };

      mockUserService.getUserByEmail.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);
      
      // Execute
      const result = await AuthService.login(email, password);
      
      // Verify
      expect(mockUserService.getUserByEmail).toHaveBeenCalledWith(email);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, user.password);
      expect(mockUserService.updateLoginInfo).toHaveBeenCalledWith(user.id);
      
      // Verify tokens were generated
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresIn).toBeDefined();
      
      // Verify user data is returned without password
      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(user.id);
      expect(result.user.password).toBeUndefined();
    });

    it('should throw error for invalid password', async () => {
      // Setup
      const email = 'test@example.com';
      const password = 'wrong_password';
      
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed_password'
      };

      mockUserService.getUserByEmail.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(false);
      
      // Execute & Verify
      await expect(AuthService.login(email, password)).rejects.toThrow('Invalid password');
      expect(mockUserService.incrementLoginAttempts).toHaveBeenCalledWith(user.id);
      expect(mockUserService.updateLoginInfo).not.toHaveBeenCalled();
    });

    it('should throw error for inactive account', async () => {
      // Setup
      const email = 'test@example.com';
      const password = 'password123';
      
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed_password',
        isActive: false
      };

      mockUserService.getUserByEmail.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);
      
      // Execute & Verify
      await expect(AuthService.login(email, password)).rejects.toThrow('Account is not active');
    });
  });

  describe('refreshToken', () => {
    it('should refresh an access token', async () => {
      // Setup
      const refreshToken = 'mock_user-123_token_7d';
      
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user'
      };

      mockUserService.getUserById.mockResolvedValue(user);
      
      // Execute
      const result = await AuthService.refreshToken(refreshToken);
      
      // Verify
      expect(jwt.verify).toHaveBeenCalledWith(refreshToken, expect.any(String));
      expect(mockUserService.getUserById).toHaveBeenCalledWith('user-123');
      
      // Verify tokens
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(user.id);
    });

    it('should throw error for missing refresh token', async () => {
      // Execute & Verify
      await expect(AuthService.refreshToken(null)).rejects.toThrow('Refresh token is required');
    });

    it('should handle token verification errors', async () => {
      // Setup
      const refreshToken = 'invalid_token';
      
      // Mock jwt.verify to throw an error
      jwt.verify.mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });
      
      // Execute & Verify
      await expect(AuthService.refreshToken(refreshToken)).rejects.toThrow('Invalid token');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('verifyToken', () => {
    it('should verify an access token and return user data', async () => {
      // Setup
      const token = 'mock_user-123_token_24h';
      
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user'
      };

      mockUserService.getUserById.mockResolvedValue(user);
      
      // Execute
      const result = await AuthService.verifyToken(token);
      
      // Verify
      expect(jwt.verify).toHaveBeenCalledWith(token, expect.any(String));
      expect(mockUserService.getUserById).toHaveBeenCalledWith('user-123');
      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(user.id);
    });

    it('should throw error for missing token', async () => {
      // Execute & Verify
      await expect(AuthService.verifyToken(null)).rejects.toThrow('Access token is required');
    });
  });

  describe('requestPasswordReset', () => {
    it('should generate a reset token for valid email', async () => {
      // Setup
      const email = 'test@example.com';
      
      const user = {
        id: 'user-123',
        email: 'test@example.com'
      };

      mockUserService.getUserByEmail.mockResolvedValue(user);
      
      // Execute
      const result = await AuthService.requestPasswordReset(email);
      
      // Verify
      expect(mockUserService.getUserByEmail).toHaveBeenCalledWith(email);
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: user.id, action: 'password-reset' },
        expect.any(String),
        { expiresIn: '1h' }
      );
      expect(result.success).toBeTruthy();
    });

    it('should not reveal if email does not exist', async () => {
      // Setup
      const email = 'nonexistent@example.com';
      
      mockUserService.getUserByEmail.mockRejectedValue(new Error('User not found'));
      
      // Execute
      const result = await AuthService.requestPasswordReset(email);
      
      // Verify
      expect(result.success).toBeTruthy();
      expect(result.message).toContain('If your email is registered');
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      // Setup
      const token = 'mock_user-123_token_1h';
      const newPassword = 'new_password123';
      
      // Override the default jwt.verify mock for this test
      jwt.verify.mockImplementationOnce(() => ({
        id: 'user-123',
        action: 'password-reset'
      }));
      
      // Execute
      const result = await AuthService.resetPassword(token, newPassword);
      
      // Verify
      expect(jwt.verify).toHaveBeenCalledWith(token, expect.any(String));
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(mockUserService.updateUserById).toHaveBeenCalledWith('user-123', { password: 'hashed_password' });
      expect(result.success).toBeTruthy();
    });

    it('should reject token with wrong action', async () => {
      // Setup
      const token = 'mock_user-123_token_1h';
      const newPassword = 'new_password123';
      
      // Override jwt.verify to return a payload with wrong action
      jwt.verify.mockImplementationOnce(() => ({
        id: 'user-123',
        action: 'not-password-reset'
      }));
      
      // Execute & Verify
      await expect(AuthService.resetPassword(token, newPassword)).rejects.toThrow('Invalid reset token');
      expect(mockUserService.updateUserById).not.toHaveBeenCalled();
    });
  });

  describe('_generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      // Setup
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'user'
      };
      
      // Execute
      const result = AuthService._generateTokens(user);
      
      // Verify
      expect(jwt.sign).toHaveBeenCalledTimes(2);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresIn).toBeDefined();
    });
  });

  describe('_sanitizeUserData', () => {
    it('should remove sensitive fields from user data', () => {
      // Setup
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashed_password',
        resetToken: 'secret_token',
        loginAttempts: 0,
        role: 'user'
      };
      
      // Execute
      const result = AuthService._sanitizeUserData(user);
      
      // Verify
      expect(result.id).toBe(user.id);
      expect(result.email).toBe(user.email);
      expect(result.username).toBe(user.username);
      expect(result.role).toBe(user.role);
      
      // Sensitive fields should be removed
      expect(result.password).toBeUndefined();
      expect(result.resetToken).toBeUndefined();
      expect(result.loginAttempts).toBeUndefined();
    });

    it('should handle null user data', () => {
      // Execute
      const result = AuthService._sanitizeUserData(null);
      
      // Verify
      expect(result).toBeNull();
    });
  });
}); 