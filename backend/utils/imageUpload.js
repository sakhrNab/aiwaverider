/**
 * Image Upload Utility
 * 
 * Handles image upload and storage operations
 */

const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const AppError = require('./appError');
const logger = require('./logger');

// Ensure upload directories exist
const createUploadDirs = () => {
  const baseUploadDir = path.join(__dirname, '../uploads');
  const dirs = ['posts', 'avatars', 'agents', 'temp'];
  
  if (!fs.existsSync(baseUploadDir)) {
    fs.mkdirSync(baseUploadDir);
  }
  
  dirs.forEach(dir => {
    const dirPath = path.join(baseUploadDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath);
    }
  });
};

// Create dirs on module load
try {
  createUploadDirs();
} catch (error) {
  logger.error('Failed to create upload directories:', error);
}

/**
 * Upload an image file
 * 
 * @param {object} file - The file object from multer
 * @param {string} folder - The folder to save the image in (posts, avatars, agents)
 * @param {object} options - Additional options like width and height
 * @returns {Promise<string>} - The URL of the uploaded image
 */
const uploadImage = async (file, folder = 'temp', options = {}) => {
  try {
    if (!file) {
      throw new AppError('No file provided', 400);
    }
    
    const validFolders = ['posts', 'avatars', 'agents', 'temp'];
    if (!validFolders.includes(folder)) {
      folder = 'temp';
    }
    
    const filename = `${uuidv4()}.webp`;
    const uploadPath = path.join(__dirname, '../uploads', folder, filename);
    
    // Process image with sharp
    let imageProcessor = sharp(file.buffer)
      .webp({ quality: 80 });
    
    // Apply resizing if options provided
    if (options.width || options.height) {
      imageProcessor = imageProcessor.resize({
        width: options.width,
        height: options.height,
        fit: options.fit || 'cover',
        position: options.position || 'center'
      });
    }
    
    // Save the processed image
    await imageProcessor.toFile(uploadPath);
    
    // Return the relative URL
    return `/uploads/${folder}/${filename}`;
  } catch (error) {
    logger.error('Error uploading image:', error);
    throw new AppError('Failed to upload image', 500, error);
  }
};

/**
 * Delete an image
 * 
 * @param {string} imageUrl - The URL of the image to delete
 * @returns {Promise<boolean>} - True if deletion was successful
 */
const deleteImage = async (imageUrl) => {
  try {
    if (!imageUrl || typeof imageUrl !== 'string') {
      return false;
    }
    
    // If it's an external URL, don't try to delete
    if (imageUrl.startsWith('http')) {
      return true;
    }
    
    // Parse the image path from the URL
    const urlPath = imageUrl.replace(/^\/uploads\//, '');
    const imagePath = path.join(__dirname, '../uploads', urlPath);
    
    // Check if file exists before trying to delete
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('Error deleting image:', error);
    return false;
  }
};

module.exports = {
  uploadImage,
  deleteImage
}; 