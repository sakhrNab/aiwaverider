/**
 * Posts Routes
 * Defines the HTTP routes for post-related operations
 * @module routes/posts
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const postsController = require('../controllers/postsController');
const { requireAuth } = require('../middleware/auth');

/**
 * @typedef {object} Post
 * @property {string} id - Post ID
 * @property {string} title - Post title
 * @property {string} content - Post content
 * @property {string} category - Post category
 * @property {string} userId - User ID who created the post
 * @property {string} [imageUrl] - URL to post image
 * @property {Array<string>} [likes] - Array of user IDs who liked the post
 * @property {string} createdAt - Creation timestamp
 * @property {string} updatedAt - Last updated timestamp
 */

/**
 * @typedef {object} Comment
 * @property {string} id - Comment ID
 * @property {string} postId - Associated post ID
 * @property {string} userId - User ID who created the comment
 * @property {string} content - Comment content
 * @property {string} [username] - Username of the commenter
 * @property {string} [avatarUrl] - URL to commenter's avatar
 * @property {Array<string>} [likes] - Array of user IDs who liked the comment
 * @property {string} createdAt - Creation timestamp
 * @property {string} updatedAt - Last updated timestamp
 */

/**
 * @typedef {object} PostResponse
 * @property {Array<Post>} posts - List of posts
 * @property {string} lastPostId - ID of the last post in the current page
 * @property {boolean} hasMore - Whether there are more posts to fetch
 */

/**
 * @typedef {object} ErrorResponse
 * @property {string} error - Error message
 * @property {number} status - HTTP status code
 */

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'), false);
    }
  }
});

/**
 * Health check endpoint
 * @route GET /api/posts/health
 * @group Posts - Post operations
 * @returns {object} 200 - Success response
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Get all posts with optional category filtering
 * @route GET /api/posts
 * @group Posts - Post operations
 * @param {string} category.query - Optional category filter
 * @param {number} limit.query - Number of posts to return
 * @param {string} startAfter.query - Post ID to start after for pagination
 * @returns {PostResponse} 200 - List of posts
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/', postsController.getPosts);

/**
 * Get posts from multiple categories
 * @route GET /api/posts/multi-category
 * @group Posts - Post operations
 * @param {string} categories.query.required - Comma-separated list of categories
 * @param {number} limit.query - Number of posts per category
 * @returns {object} 200 - Posts grouped by category
 * @returns {ErrorResponse} 400 - Bad request if categories not provided
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/multi-category', postsController.getMultiCategoryPosts);

/**
 * Get a post by ID
 * @route GET /api/posts/{postId}
 * @group Posts - Post operations
 * @param {string} postId.path.required - Post ID
 * @returns {Post} 200 - Post details
 * @returns {ErrorResponse} 404 - Post not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/:postId', postsController.getPostById);

/**
 * Get comments for a specific post
 * @route GET /api/posts/{postId}/comments
 * @group Post Comments - Post comment operations
 * @param {string} postId.path.required - Post ID
 * @param {number} limit.query - Number of comments to return
 * @param {string} startAfter.query - Comment ID to start after for pagination
 * @returns {Array<Comment>} 200 - List of comments
 * @returns {ErrorResponse} 404 - Post not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/:postId/comments', postsController.getPostComments);

/**
 * Get comments for multiple posts
 * @route GET /api/posts/comments/batch
 * @group Post Comments - Post comment operations
 * @param {string} postIds.query.required - Comma-separated list of post IDs
 * @returns {object} 200 - Comments grouped by post ID
 * @returns {ErrorResponse} 400 - Bad request if post IDs not provided
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/comments/batch', postsController.getBatchComments);

/**
 * Create a new post
 * @route POST /api/posts
 * @group Posts - Post operations
 * @param {string} title.body.required - Post title
 * @param {string} content.body.required - Post content
 * @param {string} category.body.required - Post category
 * @param {file} image.formData - Post image
 * @security BearerAuth
 * @returns {Post} 201 - Created post
 * @returns {ErrorResponse} 400 - Validation error
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 500 - Server error
 */
router.post('/', requireAuth, upload.single('image'), postsController.createPost);

/**
 * Update a post
 * @route PUT /api/posts/{postId}
 * @group Posts - Post operations
 * @param {string} postId.path.required - Post ID
 * @param {string} title.body - Post title
 * @param {string} content.body - Post content
 * @param {string} category.body - Post category
 * @param {file} image.formData - Post image
 * @param {boolean} deleteImage.body - Whether to delete existing image
 * @security BearerAuth
 * @returns {Post} 200 - Updated post
 * @returns {ErrorResponse} 400 - Validation error
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 403 - Forbidden if not post owner
 * @returns {ErrorResponse} 404 - Post not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.put('/:postId', requireAuth, upload.single('image'), postsController.updatePost);

/**
 * Delete a post
 * @route DELETE /api/posts/{postId}
 * @group Posts - Post operations
 * @param {string} postId.path.required - Post ID
 * @security BearerAuth
 * @returns {object} 200 - Success message
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 403 - Forbidden if not post owner
 * @returns {ErrorResponse} 404 - Post not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.delete('/:postId', requireAuth, postsController.deletePost);

/**
 * Toggle like status on a post
 * @route POST /api/posts/{postId}/like
 * @group Posts - Post operations
 * @param {string} postId.path.required - Post ID
 * @security BearerAuth
 * @returns {Post} 200 - Updated post
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 404 - Post not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.post('/:postId/like', requireAuth, postsController.toggleLike);
router.delete('/:postId/like', requireAuth, postsController.toggleLike); // Same as POST for backward compatibility

/**
 * Add a comment to a post
 * @route POST /api/posts/{postId}/comments
 * @group Post Comments - Post comment operations
 * @param {string} postId.path.required - Post ID
 * @param {string} content.body.required - Comment content
 * @security BearerAuth
 * @returns {Comment} 201 - Created comment
 * @returns {ErrorResponse} 400 - Validation error
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 404 - Post not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.post('/:postId/comments', requireAuth, postsController.addComment);

/**
 * Update a comment
 * @route PUT /api/posts/comments/{commentId}
 * @group Post Comments - Post comment operations
 * @param {string} commentId.path.required - Comment ID
 * @param {string} content.body.required - Comment content
 * @security BearerAuth
 * @returns {Comment} 200 - Updated comment
 * @returns {ErrorResponse} 400 - Validation error
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 403 - Forbidden if not comment owner
 * @returns {ErrorResponse} 404 - Comment not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.put('/comments/:commentId', requireAuth, postsController.updateComment);

/**
 * Delete a comment
 * @route DELETE /api/posts/comments/{commentId}
 * @group Post Comments - Post comment operations
 * @param {string} commentId.path.required - Comment ID
 * @security BearerAuth
 * @returns {object} 200 - Success message
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 403 - Forbidden if not comment owner
 * @returns {ErrorResponse} 404 - Comment not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.delete('/comments/:commentId', requireAuth, postsController.deleteComment);

/**
 * Like a comment
 * @route POST /api/posts/comments/{commentId}/like
 * @group Post Comments - Post comment operations
 * @param {string} commentId.path.required - Comment ID
 * @security BearerAuth
 * @returns {Comment} 200 - Updated comment
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 404 - Comment not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.post('/comments/:commentId/like', requireAuth, postsController.likeComment);

/**
 * Unlike a comment
 * @route DELETE /api/posts/comments/{commentId}/like
 * @group Post Comments - Post comment operations
 * @param {string} commentId.path.required - Comment ID
 * @security BearerAuth
 * @returns {Comment} 200 - Updated comment
 * @returns {ErrorResponse} 401 - Unauthorized
 * @returns {ErrorResponse} 404 - Comment not found
 * @returns {ErrorResponse} 500 - Server error
 */
router.delete('/comments/:commentId/like', requireAuth, postsController.unlikeComment);

/**
 * Get comments for multiple posts (POST method)
 * @route POST /api/posts/comments/batch
 * @group Post Comments - Post comment operations
 * @param {Array<string>} postIds.body.required - Array of post IDs
 * @returns {object} 200 - Comments grouped by post ID
 * @returns {ErrorResponse} 400 - Bad request if post IDs not provided
 * @returns {ErrorResponse} 500 - Server error
 */
router.post('/comments/batch', postsController.getBatchComments);

module.exports = router; 