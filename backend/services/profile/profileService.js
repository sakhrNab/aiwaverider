const profileRepository = require('../../repositories/profileRepository');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Profile Service
 * Implements business logic for user profile operations
 */
class ProfileService {
  /**
   * Get a user profile by ID
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} The sanitized user profile
   * @throws {AppError} If user ID is not provided or profile not found
   */
  async getProfileById(userId) {
    try {
      if (!userId) {
        throw new AppError('User ID is required', 400);
      }

      const profile = await profileRepository.getProfileById(userId);
      
      if (!profile) {
        throw new AppError('Profile not found', 404);
      }
      
      // Return sanitized profile (remove sensitive data)
      return this.sanitizeProfileData(profile);
    } catch (error) {
      logger.error(`Error in ProfileService.getProfileById: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update a user profile
   * @param {string} userId - The user ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} The updated profile
   * @throws {AppError} If user ID or update data is not provided
   */
  async updateProfile(userId, updateData) {
    try {
      if (!userId) {
        throw new AppError('User ID is required', 400);
      }
      
      if (!updateData || Object.keys(updateData).length === 0) {
        throw new AppError('Update data is required', 400);
      }

      // Check if profile exists
      const existingProfile = await profileRepository.getProfileById(userId);
      if (!existingProfile) {
        throw new AppError('Profile not found', 404);
      }
      
      // Check if username is being updated and if it's already taken
      if (updateData.username && updateData.username !== existingProfile.username) {
        const isUsernameTaken = await profileRepository.isUsernameTaken(updateData.username, userId);
        if (isUsernameTaken) {
          throw new AppError('Username is already taken', 409);
        }
      }
      
      // Add searchField for improved querying
      if (updateData.firstName || updateData.lastName || updateData.displayName) {
        const firstName = updateData.firstName || existingProfile.firstName || '';
        const lastName = updateData.lastName || existingProfile.lastName || '';
        const displayName = updateData.displayName || existingProfile.displayName || '';
        
        updateData.searchField = `${firstName} ${lastName} ${displayName}`.toLowerCase();
      }
      
      // Add updatedAt timestamp
      updateData.updatedAt = new Date();
      
      // Update profile
      const updatedProfile = await profileRepository.updateProfile(userId, updateData);
      
      // Return sanitized profile (remove sensitive data)
      return this.sanitizeProfileData(updatedProfile);
    } catch (error) {
      logger.error(`Error in ProfileService.updateProfile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user avatar
   * @param {string} userId - The user ID
   * @param {string} photoURL - The URL of the photo
   * @returns {Promise<Object>} The updated profile
   * @throws {AppError} If user ID or photo URL is not provided
   */
  async updateAvatar(userId, photoURL) {
    try {
      if (!userId) {
        throw new AppError('User ID is required', 400);
      }
      
      if (!photoURL) {
        throw new AppError('Photo URL is required', 400);
      }

      // Check if profile exists
      const profile = await profileRepository.getProfileById(userId);
      if (!profile) {
        throw new AppError('Profile not found', 404);
      }
      
      // Update avatar
      const updatedProfile = await profileRepository.updateAvatar(userId, photoURL);
      
      // Return sanitized profile (remove sensitive data)
      return this.sanitizeProfileData(updatedProfile);
    } catch (error) {
      logger.error(`Error in ProfileService.updateAvatar: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user interests
   * @param {string} userId - The user ID
   * @param {Array<string>} interests - Array of interests
   * @returns {Promise<Object>} The updated profile
   * @throws {AppError} If user ID is not provided or interests is not an array
   */
  async updateInterests(userId, interests) {
    try {
      if (!userId) {
        throw new AppError('User ID is required', 400);
      }
      
      if (!Array.isArray(interests)) {
        throw new AppError('Interests must be an array', 400);
      }

      // Check if profile exists
      const profile = await profileRepository.getProfileById(userId);
      if (!profile) {
        throw new AppError('Profile not found', 404);
      }
      
      // Update interests
      const updatedProfile = await profileRepository.updateInterests(userId, interests);
      
      // Return sanitized profile
      return this.sanitizeProfileData(updatedProfile);
    } catch (error) {
      logger.error(`Error in ProfileService.updateInterests: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update notification settings
   * @param {string} userId - The user ID
   * @param {Object} settings - Notification settings
   * @returns {Promise<Object>} The updated profile
   * @throws {AppError} If user ID is not provided or settings is not an object
   */
  async updateNotificationSettings(userId, settings) {
    try {
      if (!userId) {
        throw new AppError('User ID is required', 400);
      }
      
      if (!settings || typeof settings !== 'object') {
        throw new AppError('Notification settings must be an object', 400);
      }

      // Check if profile exists
      const profile = await profileRepository.getProfileById(userId);
      if (!profile) {
        throw new AppError('Profile not found', 404);
      }
      
      // Update notification settings
      const updatedProfile = await profileRepository.updateNotificationSettings(userId, settings);
      
      // Return sanitized profile
      return this.sanitizeProfileData(updatedProfile);
    } catch (error) {
      logger.error(`Error in ProfileService.updateNotificationSettings: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sanitize profile data by removing sensitive information
   * @param {Object} profile - The user profile
   * @returns {Object} The sanitized profile
   */
  sanitizeProfileData(profile) {
    if (!profile) return null;
    
    // Create a copy of the profile
    const sanitizedProfile = { ...profile };
    
    // Remove sensitive data
    delete sanitizedProfile.password;
    delete sanitizedProfile.passwordResetToken;
    delete sanitizedProfile.passwordResetExpires;
    delete sanitizedProfile.loginAttempts;
    delete sanitizedProfile.lastLoginAttempt;
    
    return sanitizedProfile;
  }
}

module.exports = new ProfileService(); 