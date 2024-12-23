// backend/middleware/upload.js

const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    cb(new Error('Only image files are allowed!'), false);
  } else {
    cb(null, true);
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;



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

// module.exports = upload;
