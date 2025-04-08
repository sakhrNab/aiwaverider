const { jest: jestConfig } = require('../../jest.config');

// Mock Firebase
const mockCollection = {
  doc: jest.fn(),
  where: jest.fn()
};

const mockDocRef = {
  get: jest.fn(),
  update: jest.fn()
};

const mockQueryRef = {
  get: jest.fn()
};

mockCollection.doc.mockReturnValue(mockDocRef);
mockCollection.where.mockReturnValue(mockQueryRef);

const mockDb = {
  collection: jest.fn(() => mockCollection)
};

// Mock user document
const mockUserDoc = {
  id: 'test-user-id',
  exists: true,
  data: jest.fn(() => ({
    email: 'test@example.com',
    username: 'testuser',
    displayName: 'Test User',
    role: 'user',
    photoURL: 'https://example.com/photo.jpg'
  }))
};

// Mock database responses
const mockSnapshot = {
  empty: false,
  docs: [mockUserDoc]
};

const emptySnapshot = {
  empty: true,
  docs: []
};

// Mock the Firebase config
jest.mock('../../config/firebase', () => ({
  db: mockDb
}));

// Import repository after mocks
const profileRepository = require('../../repositories/profileRepository');

describe('Profile Repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDocRef.get.mockResolvedValue(mockUserDoc);
    mockQueryRef.get.mockResolvedValue(mockSnapshot);
  });

  describe('getProfileById', () => {
    it('should get a profile by ID', async () => {
      // Execute
      const result = await profileRepository.getProfileById('test-user-id');

      // Verify
      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockCollection.doc).toHaveBeenCalledWith('test-user-id');
      expect(mockDocRef.get).toHaveBeenCalled();
      expect(result).toEqual({
        id: 'test-user-id',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        role: 'user',
        photoURL: 'https://example.com/photo.jpg'
      });
    });

    it('should return null if profile not found', async () => {
      // Setup mock for nonexistent user
      mockDocRef.get.mockResolvedValueOnce({ exists: false });

      // Execute
      const result = await profileRepository.getProfileById('nonexistent-id');

      // Verify
      expect(result).toBeNull();
    });

    it('should handle errors', async () => {
      // Setup mock to throw an error
      const error = new Error('Database error');
      mockDocRef.get.mockRejectedValueOnce(error);

      // Execute and verify
      await expect(profileRepository.getProfileById('test-user-id')).rejects.toThrow('Database error');
    });
  });

  describe('updateProfile', () => {
    it('should update a profile', async () => {
      // Setup
      const updateData = {
        displayName: 'Updated Name',
        bio: 'New bio'
      };
      
      // Execute
      await profileRepository.updateProfile('test-user-id', updateData);

      // Verify
      expect(mockCollection.doc).toHaveBeenCalledWith('test-user-id');
      expect(mockDocRef.update).toHaveBeenCalledWith(updateData);
    });

    it('should handle errors', async () => {
      // Setup mock to throw an error
      const error = new Error('Update error');
      mockDocRef.update.mockRejectedValueOnce(error);

      // Execute and verify
      await expect(profileRepository.updateProfile('test-user-id', { bio: 'Test' })).rejects.toThrow('Update error');
    });
  });

  describe('updateAvatar', () => {
    it('should update a user avatar', async () => {
      // Setup
      const photoURL = 'https://example.com/new-photo.jpg';
      
      // Execute
      await profileRepository.updateAvatar('test-user-id', photoURL);

      // Verify
      expect(mockCollection.doc).toHaveBeenCalledWith('test-user-id');
      expect(mockDocRef.update).toHaveBeenCalledWith({ photoURL });
    });

    it('should handle errors', async () => {
      // Setup mock to throw an error
      const error = new Error('Avatar update error');
      mockDocRef.update.mockRejectedValueOnce(error);

      // Execute and verify
      await expect(
        profileRepository.updateAvatar('test-user-id', 'https://example.com/image.jpg')
      ).rejects.toThrow('Avatar update error');
    });
  });

  describe('updateInterests', () => {
    it('should update user interests', async () => {
      // Setup
      const interests = ['Music', 'Technology', 'Art'];
      
      // Execute
      await profileRepository.updateInterests('test-user-id', interests);

      // Verify
      expect(mockCollection.doc).toHaveBeenCalledWith('test-user-id');
      expect(mockDocRef.update).toHaveBeenCalledWith({ interests });
    });

    it('should handle errors', async () => {
      // Setup mock to throw an error
      const error = new Error('Interests update error');
      mockDocRef.update.mockRejectedValueOnce(error);

      // Execute and verify
      await expect(
        profileRepository.updateInterests('test-user-id', ['Music'])
      ).rejects.toThrow('Interests update error');
    });
  });

  describe('isUsernameTaken', () => {
    it('should return true if username is taken', async () => {
      // Execute
      const result = await profileRepository.isUsernameTaken('testuser');

      // Verify
      expect(mockCollection.where).toHaveBeenCalledWith('username', '==', 'testuser');
      expect(mockQueryRef.get).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if username is not taken', async () => {
      // Setup mock for empty result
      mockQueryRef.get.mockResolvedValueOnce(emptySnapshot);

      // Execute
      const result = await profileRepository.isUsernameTaken('newuser');

      // Verify
      expect(result).toBe(false);
    });

    it('should exclude current user when checking if username is taken', async () => {
      // Setup mock document with the same user ID
      const sameUserSnapshot = {
        empty: false,
        docs: [{
          id: 'test-user-id',
          data: () => ({ username: 'testuser' })
        }]
      };
      mockQueryRef.get.mockResolvedValueOnce(sameUserSnapshot);

      // Execute - should return false because the only match is the current user
      const result = await profileRepository.isUsernameTaken('testuser', 'test-user-id');

      // Verify
      expect(result).toBe(false);
    });

    it('should handle errors', async () => {
      // Setup mock to throw an error
      const error = new Error('Username check error');
      mockQueryRef.get.mockRejectedValueOnce(error);

      // Execute and verify
      await expect(profileRepository.isUsernameTaken('testuser')).rejects.toThrow('Username check error');
    });
  });

  describe('updateNotificationSettings', () => {
    it('should update notification settings', async () => {
      // Setup
      const settings = {
        email: true,
        push: false,
        marketing: false
      };
      
      // Execute
      await profileRepository.updateNotificationSettings('test-user-id', settings);

      // Verify
      expect(mockCollection.doc).toHaveBeenCalledWith('test-user-id');
      expect(mockDocRef.update).toHaveBeenCalledWith({ notifications: settings });
    });

    it('should handle errors', async () => {
      // Setup mock to throw an error
      const error = new Error('Notification settings update error');
      mockDocRef.update.mockRejectedValueOnce(error);

      // Execute and verify
      await expect(
        profileRepository.updateNotificationSettings('test-user-id', { email: true })
      ).rejects.toThrow('Notification settings update error');
    });
  });
}); 