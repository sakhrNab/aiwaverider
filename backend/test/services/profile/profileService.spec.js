const { jest: jestConfig } = require('../../../jest.config');

// Mock the repository
const mockProfileRepository = {
  getProfileById: jest.fn(),
  updateProfile: jest.fn(),
  updateAvatar: jest.fn(),
  updateInterests: jest.fn(),
  isUsernameTaken: jest.fn(),
  updateNotificationSettings: jest.fn()
};

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Mock AppError
class MockAppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Mock the dependencies
jest.mock('../../../repositories/profileRepository', () => mockProfileRepository);
jest.mock('../../../utils/logger', () => mockLogger);
jest.mock('../../../middleware/errorHandler', () => ({
  AppError: MockAppError
}));

// Import the service after mocking dependencies
const profileService = require('../../../services/profile/profileService');

describe('Profile Service', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfileById', () => {
    it('should get a profile by ID', async () => {
      // Setup mock data
      const userId = 'user123';
      const mockProfile = {
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        role: 'user',
        password: 'hashedpassword', // This should be removed in sanitized output
        passwordResetToken: 'sometoken', // This should be removed in sanitized output
      };

      // Setup repository mock
      mockProfileRepository.getProfileById.mockResolvedValue(mockProfile);

      // Execute
      const result = await profileService.getProfileById(userId);

      // Verify
      expect(mockProfileRepository.getProfileById).toHaveBeenCalledWith(userId);
      expect(result).toHaveProperty('id', userId);
      expect(result).toHaveProperty('email', 'test@example.com');
      expect(result).toHaveProperty('username', 'testuser');
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('passwordResetToken');
    });

    it('should throw an error if userId is not provided', async () => {
      await expect(profileService.getProfileById()).rejects.toThrow('User ID is required');
    });

    it('should throw an error if profile is not found', async () => {
      const userId = 'nonexistent';
      mockProfileRepository.getProfileById.mockResolvedValue(null);

      await expect(profileService.getProfileById(userId)).rejects.toThrow('Profile not found');
    });

    it('should handle repository errors', async () => {
      const userId = 'user123';
      const error = new Error('Database error');
      mockProfileRepository.getProfileById.mockRejectedValue(error);

      await expect(profileService.getProfileById(userId)).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('should update a profile with valid data', async () => {
      // Setup
      const userId = 'user123';
      const updateData = {
        firstName: 'Updated',
        lastName: 'User',
        displayName: 'Updated User'
      };
      const existingProfile = {
        id: userId,
        username: 'testuser',
        email: 'test@example.com'
      };
      const updatedProfile = {
        id: userId,
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Updated',
        lastName: 'User',
        displayName: 'Updated User'
      };

      mockProfileRepository.getProfileById.mockResolvedValue(existingProfile);
      mockProfileRepository.updateProfile.mockResolvedValue(updatedProfile);

      // Execute
      const result = await profileService.updateProfile(userId, updateData);

      // Verify
      expect(mockProfileRepository.getProfileById).toHaveBeenCalledWith(userId);
      expect(mockProfileRepository.updateProfile).toHaveBeenCalledWith(userId, expect.objectContaining({
        firstName: 'Updated',
        lastName: 'User',
        displayName: 'Updated User',
        searchField: expect.any(String)
      }));
      expect(result).toEqual(expect.objectContaining({
        id: userId,
        firstName: 'Updated',
        lastName: 'User',
        displayName: 'Updated User'
      }));
    });

    it('should throw an error if userId is not provided', async () => {
      await expect(profileService.updateProfile(null, { firstName: 'Test' })).rejects.toThrow('User ID is required');
    });

    it('should throw an error if update data is not provided', async () => {
      await expect(profileService.updateProfile('user123', null)).rejects.toThrow('Update data is required');
      await expect(profileService.updateProfile('user123', {})).rejects.toThrow('Update data is required');
    });

    it('should throw an error if profile is not found', async () => {
      mockProfileRepository.getProfileById.mockResolvedValue(null);
      await expect(profileService.updateProfile('nonexistent', { firstName: 'Test' })).rejects.toThrow('Profile not found');
    });

    it('should check if username is taken when updating username', async () => {
      const userId = 'user123';
      const updateData = { username: 'newusername' };
      const existingProfile = {
        id: userId,
        username: 'testuser',
        email: 'test@example.com'
      };

      mockProfileRepository.getProfileById.mockResolvedValue(existingProfile);
      mockProfileRepository.isUsernameTaken.mockResolvedValue(true);

      await expect(profileService.updateProfile(userId, updateData)).rejects.toThrow('Username is already taken');
      expect(mockProfileRepository.isUsernameTaken).toHaveBeenCalledWith('newusername', userId);
    });
  });

  describe('updateAvatar', () => {
    it('should update a user avatar', async () => {
      // Setup
      const userId = 'user123';
      const photoURL = 'https://example.com/avatar.jpg';
      const existingProfile = {
        id: userId,
        username: 'testuser',
        email: 'test@example.com'
      };
      const updatedProfile = {
        id: userId,
        username: 'testuser',
        email: 'test@example.com',
        photoURL
      };

      mockProfileRepository.getProfileById.mockResolvedValue(existingProfile);
      mockProfileRepository.updateAvatar.mockResolvedValue(updatedProfile);

      // Execute
      const result = await profileService.updateAvatar(userId, photoURL);

      // Verify
      expect(mockProfileRepository.getProfileById).toHaveBeenCalledWith(userId);
      expect(mockProfileRepository.updateAvatar).toHaveBeenCalledWith(userId, photoURL);
      expect(result).toEqual(expect.objectContaining({
        id: userId,
        photoURL
      }));
    });

    it('should throw an error if userId is not provided', async () => {
      await expect(profileService.updateAvatar(null, 'https://example.com/avatar.jpg')).rejects.toThrow('User ID is required');
    });

    it('should throw an error if photoURL is not provided', async () => {
      await expect(profileService.updateAvatar('user123', null)).rejects.toThrow('Photo URL is required');
    });

    it('should throw an error if profile is not found', async () => {
      mockProfileRepository.getProfileById.mockResolvedValue(null);
      await expect(profileService.updateAvatar('nonexistent', 'https://example.com/avatar.jpg')).rejects.toThrow('Profile not found');
    });
  });

  describe('updateInterests', () => {
    it('should update user interests', async () => {
      // Setup
      const userId = 'user123';
      const interests = ['Tech', 'AI', 'Music'];
      const existingProfile = {
        id: userId,
        username: 'testuser',
        email: 'test@example.com'
      };
      const updatedProfile = {
        id: userId,
        username: 'testuser',
        email: 'test@example.com',
        interests
      };

      mockProfileRepository.getProfileById.mockResolvedValue(existingProfile);
      mockProfileRepository.updateInterests.mockResolvedValue(updatedProfile);

      // Execute
      const result = await profileService.updateInterests(userId, interests);

      // Verify
      expect(mockProfileRepository.getProfileById).toHaveBeenCalledWith(userId);
      expect(mockProfileRepository.updateInterests).toHaveBeenCalledWith(userId, interests);
      expect(result).toEqual(expect.objectContaining({
        id: userId,
        interests
      }));
    });

    it('should throw an error if userId is not provided', async () => {
      await expect(profileService.updateInterests(null, ['Tech'])).rejects.toThrow('User ID is required');
    });

    it('should throw an error if interests is not an array', async () => {
      await expect(profileService.updateInterests('user123', 'Tech')).rejects.toThrow('Interests must be an array');
      await expect(profileService.updateInterests('user123', { category: 'Tech' })).rejects.toThrow('Interests must be an array');
    });

    it('should throw an error if profile is not found', async () => {
      mockProfileRepository.getProfileById.mockResolvedValue(null);
      await expect(profileService.updateInterests('nonexistent', ['Tech'])).rejects.toThrow('Profile not found');
    });
  });

  describe('updateNotificationSettings', () => {
    it('should update notification settings', async () => {
      // Setup
      const userId = 'user123';
      const notificationSettings = {
        email: true,
        push: false,
        marketing: false
      };
      const existingProfile = {
        id: userId,
        username: 'testuser',
        email: 'test@example.com'
      };
      const updatedProfile = {
        id: userId,
        username: 'testuser',
        email: 'test@example.com',
        notifications: notificationSettings
      };

      mockProfileRepository.getProfileById.mockResolvedValue(existingProfile);
      mockProfileRepository.updateNotificationSettings.mockResolvedValue(updatedProfile);

      // Execute
      const result = await profileService.updateNotificationSettings(userId, notificationSettings);

      // Verify
      expect(mockProfileRepository.getProfileById).toHaveBeenCalledWith(userId);
      expect(mockProfileRepository.updateNotificationSettings).toHaveBeenCalledWith(userId, notificationSettings);
      expect(result).toEqual(expect.objectContaining({
        id: userId,
        notifications: notificationSettings
      }));
    });

    it('should throw an error if userId is not provided', async () => {
      await expect(profileService.updateNotificationSettings(null, { email: true })).rejects.toThrow('User ID is required');
    });

    it('should throw an error if notification settings is not an object', async () => {
      await expect(profileService.updateNotificationSettings('user123', 'invalid')).rejects.toThrow('Notification settings must be an object');
      await expect(profileService.updateNotificationSettings('user123', null)).rejects.toThrow('Notification settings must be an object');
    });

    it('should throw an error if profile is not found', async () => {
      mockProfileRepository.getProfileById.mockResolvedValue(null);
      await expect(profileService.updateNotificationSettings('nonexistent', { email: true })).rejects.toThrow('Profile not found');
    });
  });
}); 