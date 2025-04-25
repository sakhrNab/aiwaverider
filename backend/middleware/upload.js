// backend/upload.js

const path = require('path');
const multer = require('multer');

// Use memory storage for Firebase Storage uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (ext && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpg, jpeg, png, gif)'));
    }
  }
});

// Export both single-file and multiple-file upload middlewares
module.exports = {
  // For single file upload
  single: (fieldName) => upload.single(fieldName),
  
  // For multiple fields with multiple files
  fields: (fields) => upload.fields(fields),
  
  // For parsing form data without files
  none: () => upload.none(),
  
  // For multiple files in one field
  array: (fieldName, maxCount) => upload.array(fieldName, maxCount)
};

// // backend/middleware/upload.js -- using bitbucket for firebase

// const multer = require('multer');
// const path = require('path');
// const { bucket } = require('../index'); // Adjust the path as necessary

// // Set up multer storage to store files in memory
// const storage = multer.memoryStorage();

// const fileFilter = (req, file, cb) => {
//   // Accept images only
//   if (!file.mimetype.startsWith('image/')) {
//     cb(new Error('Only image files are allowed!'), false);
//   } else {
//     cb(null, true);
//   }
// };

// const upload = multer({ storage, fileFilter });
