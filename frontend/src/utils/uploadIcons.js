// uploadIcons.js - Tool for uploading AI tools icons to Firebase Storage
import firebase from 'firebase/compat/app';
import 'firebase/compat/storage';
import { db } from './firebase';
import { FIREBASE } from '../config/config';

// Import icons
import adsIcon from '../assets/ai-tools/ads-icon.svg';
import mindmapIcon from '../assets/ai-tools/mindmap-icon.svg';
import viralIcon from '../assets/ai-tools/viral-icon.svg';
import hedraIcon from '../assets/ai-tools/hedra-icon.svg';
import eraserIcon from '../assets/ai-tools/eraser-icon.svg';
import promptIcon from '../assets/ai-tools/prompt-icon.svg';
import relightIcon from '../assets/ai-tools/relight-icon.svg';
import textEffectsIcon from '../assets/ai-tools/text-effects-icon.svg';

// Map icon paths to keywords
const iconMap = {
  "ADS": adsIcon,
  "MAP": mindmapIcon,
  "VIRAL": viralIcon,
  "HEDRA": hedraIcon,
  "ERASER": eraserIcon,
  "Magic": promptIcon,
  "RELIGHT": relightIcon,
  "MATCH": textEffectsIcon
};

/**
 * Utility function to convert a file URL to a Blob
 */
const urlToBlob = async (url) => {
  const response = await fetch(url);
  const blob = await response.blob();
  return blob;
};

/**
 * Uploads a single icon to Firebase Storage
 */
const uploadIcon = async (keyword, iconPath) => {
  try {
    // Convert image path to blob
    const blob = await urlToBlob(iconPath);
    
    // Generate a unique filename
    const fileName = `ai_tools/${keyword.toLowerCase()}_icon_${Date.now()}.svg`;
    const storageRef = firebase.storage().ref();
    const iconRef = storageRef.child(fileName);
    
    // Upload the file
    const snapshot = await iconRef.put(blob);
    
    // Get the download URL
    const downloadUrl = await snapshot.ref.getDownloadURL();
    
    console.log(`[UploadIcons] Successfully uploaded ${keyword} icon: ${downloadUrl}`);
    
    return {
      keyword,
      url: downloadUrl,
      success: true
    };
  } catch (error) {
    console.error(`[UploadIcons] Error uploading ${keyword} icon:`, error);
    return {
      keyword,
      success: false,
      error: error.message
    };
  }
};

/**
 * Upload all icons to Firebase Storage
 */
export const uploadAllIcons = async () => {
  // Check if we have valid Firebase config
  if (!FIREBASE.API_KEY || !FIREBASE.STORAGE_BUCKET) {
    console.error('[UploadIcons] Firebase not configured properly');
    return {
      success: false,
      results: {},
      error: 'Firebase configuration missing'
    };
  }

  console.log('[UploadIcons] Starting to upload AI tool icons to Firebase Storage...');
  
  const results = {};
  const uploadPromises = [];
  
  // Start all uploads in parallel
  for (const [keyword, iconPath] of Object.entries(iconMap)) {
    uploadPromises.push(
      uploadIcon(keyword, iconPath)
        .then(result => {
          results[keyword] = result;
          return result;
        })
    );
  }
  
  // Wait for all uploads to complete
  await Promise.all(uploadPromises);
  
  // Count successes and failures
  const successes = Object.values(results).filter(r => r.success).length;
  const failures = Object.values(results).length - successes;
  
  console.log(`[UploadIcons] Upload complete: ${successes} succeeded, ${failures} failed`);
  console.log('[UploadIcons] Icon URLs available for use:');
  
  // Generate icon URL map code
  let iconUrlMapCode = 'const iconURLMap = {\n';
  for (const [keyword, result] of Object.entries(results)) {
    if (result.success) {
      iconUrlMapCode += `  "${keyword}": "${result.url}",\n`;
    } else {
      iconUrlMapCode += `  "${keyword}": null, // Upload failed: ${result.error}\n`;
    }
  }
  iconUrlMapCode += '};';
  
  console.log(iconUrlMapCode);
  
  return {
    success: successes > 0,
    results,
    iconUrlMapCode
  };
};

// Function to export to the window object for console access
export const initializeIconUploaderConsole = () => {
  window.uploadAIToolIcons = uploadAllIcons;
  console.log('[UploadIcons] Icon uploader function is now available in console.');
  console.log('[UploadIcons] Run window.uploadAIToolIcons() to upload icons to Firebase Storage.');
};

// Auto-initialize when this module is imported
initializeIconUploaderConsole();

export default uploadAllIcons; 