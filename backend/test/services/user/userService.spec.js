/**
 * Tests for User Service
 */

const { jest: jestConfig } = require('@jest/globals');

// Mock bcrypt first, before other imports
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true)
}));

// After mocking, import bcrypt
const bcrypt = require('bcryptjs');

// Create mocks
const mockUserRepository = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  updatePassword: jest.fn(),
  countAdminUsers: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Mock the repositories
jest.mock('../../../repositories/userRepository', () => mockUserRepository);
jest.mock('../../../utils/logger', () => mockLogger);

// Import the service after mocking
const UserService = require('../../../services/user/userService');

describe('User Service', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserById', () => {
    it('should get a user by ID', async () => {
      // Setup
      const mockUser = { id: 'user-123', email: 'test@example.com', username: 'testuser' };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      
      // Execute
      const user = await UserService.getUserById('user-123');
      
      // Verify
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
      expect(user).toEqual(mockUser);
    });

    it('should throw an error if user is not found', async () => {
      // Setup
      mockUserRepository.findById.mockResolvedValue(null);
      
      // Execute & Verify
      await expect(UserService.getUserById('non-existent')).rejects.toThrow('User not found');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('non-existent');
    });
  });

  describe('getUserByEmail', () => {
    it('should get a user by email', async () => {
      // Setup
      const mockUser = { id: 'user-123', email: 'test@example.com', username: 'testuser' };
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      
      // Execute
      const user = await UserService.getUserByEmail('test@example.com');
      
      // Verify
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(user).toEqual(mockUser);
    });

    it('should throw an error if user is not found by email', async () => {
      // Setup
      mockUserRepository.findByEmail.mockResolvedValue(null);
      
      // Execute & Verify
      await expect(UserService.getUserByEmail('nonexistent@example.com')).rejects.toThrow('User not found');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('nonexistent@example.com');
    });
  });

  describe('getAllUsers', () => {
    it('should get all users with pagination and filtering', async () => {
      // Setup
      const mockResult = {
        users: [
          { id: 'user-1', email: 'user1@example.com' },
          { id: 'user-2', email: 'user2@example.com' }
        ],
        totalCount: 2,
        page: 1,
        totalPages: 1
      };
      mockUserRepository.findAll.mockResolvedValue(mockResult);
      
      const options = {
        limit: 10,
        offset: 0,
        filters: { role: 'user' }
      };
      
      // Execute
      const result = await UserService.getAllUsers(options);
      
      // Verify
      expect(mockUserRepository.findAll).toHaveBeenCalledWith(options);
      expect(result).toEqual(mockResult);
    });
  });

  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      // Setup
      const userData = {
        email: 'new@example.com',
        username: 'newuser',
        password: 'password123',
        role: 'user'
      };

      const createdUser = {
        id: 'user-123',
        email: 'new@example.com',
        username: 'newuser',
        role: 'user'
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(createdUser);
      
      // Execute
      const result = await UserService.createUser(userData);
      
      // Verify
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        ...userData,
        password: 'hashed_password'
      });
      expect(result).toEqual(createdUser);
    });

    it('should throw an error if email is already in use', async () => {
      // Setup
      const userData = {
        email: 'existing@example.com',
        username: 'newuser',
        password: 'password123'
      };

      mockUserRepository.findByEmail.mockResolvedValue({ id: 'existing-user', email: 'existing@example.com' });
      
      // Execute & Verify
      await expect(UserService.createUser(userData)).rejects.toThrow('Email already in use');
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('should update a user with valid data', async () => {
      // Setup
      const userId = 'user-123';
      const updateData = {
        username: 'updateduser',
        firstName: 'Updated',
        lastName: 'User'
      };

      const existingUser = {
        id: userId,
        email: 'test@example.com',
        username: 'oldusername'
      };

      const updatedUser = {
        ...existingUser,
        ...updateData
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.update.mockResolvedValue(updatedUser);
      
      // Execute
      const result = await UserService.updateUser(userId, updateData);
      
      // Verify
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, updateData);
      expect(result).toEqual(updatedUser);
    });

    it('should throw an error if user is not found', async () => {
      // Setup
      mockUserRepository.findById.mockResolvedValue(null);
      
      // Execute & Verify
      await expect(UserService.updateUser('non-existent', { username: 'test' })).rejects.toThrow('User not found');
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('should throw an error if updating to an email that is already in use', async () => {
      // Setup
      const userId = 'user-123';
      const updateData = {
        email: 'existing@example.com'
      };

      const existingUser = {
        id: userId,
        email: 'test@example.com'
      };

      const emailUser = {
        id: 'other-user',
        email: 'existing@example.com'
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.findByEmail.mockResolvedValue(emailUser);
      
      // Execute & Verify
      await expect(UserService.updateUser(userId, updateData)).rejects.toThrow('Email already in use');
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      // Setup
      const userId = 'user-123';
      const existingUser = {
        id: userId,
        email: 'test@example.com',
        role: 'user'
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.delete.mockResolvedValue({ success: true });
      
      // Execute
      await UserService.deleteUser(userId);
      
      // Verify
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.delete).toHaveBeenCalledWith(userId);
    });

    it('should throw an error if user is not found', async () => {
      // Setup
      mockUserRepository.findById.mockResolvedValue(null);
      
      // Execute & Verify
      await expect(UserService.deleteUser('non-existent')).rejects.toThrow('User not found');
      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw an error when trying to delete the last admin user', async () => {
      // Setup
      const userId = 'admin-123';
      const existingUser = {
        id: userId,
        email: 'admin@example.com',
        role: 'admin'
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.countAdminUsers.mockResolvedValue(1);
      
      // Execute & Verify
      await expect(UserService.deleteUser(userId)).rejects.toThrow('Cannot delete the last admin user');
      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('should change a user password', async () => {
      // Setup
      const userId = 'user-123';
      const currentPassword = 'oldpassword';
      const newPassword = 'newpassword';
      
      const existingUser = {
        id: userId,
        email: 'test@example.com',
        password: 'hashed_old_password'
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      bcrypt.compare.mockResolvedValue(true);
      mockUserRepository.updatePassword.mockResolvedValue({ success: true });
      
      // Execute
      await UserService.changePassword(userId, currentPassword, newPassword);
      
      // Verify
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(bcrypt.compare).toHaveBeenCalledWith(currentPassword, existingUser.password);
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(mockUserRepository.updatePassword).toHaveBeenCalledWith(userId, 'hashed_password');
    });

    it('should throw an error if user is not found', async () => {
      // Setup
      mockUserRepository.findById.mockResolvedValue(null);
      
      // Execute & Verify
      await expect(UserService.changePassword('non-existent', 'old', 'new')).rejects.toThrow('User not found');
      expect(mockUserRepository.updatePassword).not.toHaveBeenCalled();
    });

    it('should throw an error if current password is incorrect', async () => {
      // Setup
      const userId = 'user-123';
      const existingUser = {
        id: userId,
        email: 'test@example.com',
        password: 'hashed_password'
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      bcrypt.compare.mockResolvedValue(false);
      
      // Execute & Verify
      await expect(UserService.changePassword(userId, 'wrongpassword', 'newpassword')).rejects.toThrow('Current password is incorrect');
      expect(mockUserRepository.updatePassword).not.toHaveBeenCalled();
    });
  });

  describe('updateLoginInfo', () => {
    it('should update login info after successful login', async () => {
      // Setup
      const userId = 'user-123';
      const updateData = {
        lastLogin: expect.any(Date),
        loginAttempts: 0
      };

      const existingUser = {
        id: userId,
        email: 'test@example.com',
        loginAttempts: 2
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue({ ...existingUser, ...updateData });
      
      // Execute
      await UserService.updateLoginInfo(userId);
      
      // Verify
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, expect.objectContaining({
        lastLogin: expect.any(Date),
        loginAttempts: 0
      }));
    });
  });

  describe('incrementLoginAttempts', () => {
    it('should increment login attempts', async () => {
      // Setup
      const userId = 'user-123';
      const existingUser = {
        id: userId,
        email: 'test@example.com',
        loginAttempts: 2,
        isActive: true
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue({ 
        ...existingUser, 
        loginAttempts: 3 
      });
      
      // Execute
      await UserService.incrementLoginAttempts(userId);
      
      // Verify
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, {
        loginAttempts: 3
      });
    });

    it('should lock account if max login attempts reached', async () => {
      // Setup
      const userId = 'user-123';
      const existingUser = {
        id: userId,
        email: 'test@example.com',
        loginAttempts: 4,
        isActive: true
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue({ 
        ...existingUser, 
        loginAttempts: 5,
        isActive: false,
        accountLocked: true,
        accountLockedReason: 'Too many failed login attempts',
        accountLockedDate: expect.any(Date)
      });
      
      // Execute
      await UserService.incrementLoginAttempts(userId);
      
      // Verify
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, expect.objectContaining({
        loginAttempts: 5,
        isActive: false,
        accountLocked: true,
        accountLockedReason: 'Too many failed login attempts',
        accountLockedDate: expect.any(Date)
      }));
    });
  });
}); 