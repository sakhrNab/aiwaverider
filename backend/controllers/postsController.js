/**
 * Posts Controller
 * Handles HTTP requests for post-related operations
 */
const postService = require('../services/post/postService');
const { sanitizeHtml } = require('../utils/sanitizer');
const { uploadImage, deleteImage } = require('../utils/imageUpload');
const AppError = require('../utils/appError');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * Get all posts with optional category filtering
 */
const getPosts = asyncHandler(async (req, res) => {
  const { category = 'All', limit = 10, startAfter = null } = req.query;
  const result = await postService.getPosts(category, limit, startAfter);
  res.status(200).json(result);
});

/**
 * Get a post by ID
 */
const getPostById = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const post = await postService.getPostById(postId);
  
  if (!post) {
    throw new AppError('Post not found', 404);
  }
  
  res.status(200).json(post);
});

/**
 * Create a new post
 */
const createPost = asyncHandler(async (req, res) => {
  const { title, content, category } = req.body;
  const userId = req.user.id;
  
  // Handle image upload if present
  let imageUrl = null;
  if (req.file) {
    imageUrl = await uploadImage(req.file, 'posts');
  }
  
  // Sanitize HTML content
  const sanitizedContent = sanitizeHtml(content);
  
  const post = await postService.createPost({
    title,
    content: sanitizedContent,
    category,
    userId,
    imageUrl
  });
  
  res.status(201).json(post);
});

/**
 * Update a post
 */
const updatePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { title, content, category } = req.body;
  const userId = req.user.id;
  
  // Get existing post to check ownership
  const existingPost = await postService.getPostById(postId);
  
  if (!existingPost) {
    throw new AppError('Post not found', 404);
  }
  
  // Handle image upload if present
  let imageUrl = existingPost.imageUrl;
  if (req.file) {
    // Delete old image if it exists
    if (existingPost.imageUrl) {
      await deleteImage(existingPost.imageUrl);
    }
    imageUrl = await uploadImage(req.file, 'posts');
  } else if (req.body.deleteImage === 'true' && existingPost.imageUrl) {
    await deleteImage(existingPost.imageUrl);
    imageUrl = null;
  }
  
  // Sanitize HTML content
  const sanitizedContent = content ? sanitizeHtml(content) : existingPost.content;
  
  const updatedPost = await postService.updatePost(
    postId,
    userId,
    {
      title: title || existingPost.title,
      content: sanitizedContent,
      category: category || existingPost.category,
      imageUrl
    }
  );
  
  res.status(200).json(updatedPost);
});

/**
 * Delete a post
 */
const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;
  
  // Get existing post to check ownership and image
  const existingPost = await postService.getPostById(postId);
  
  if (!existingPost) {
    throw new AppError('Post not found', 404);
  }
  
  // Delete image if it exists
  if (existingPost.imageUrl) {
    await deleteImage(existingPost.imageUrl);
  }
  
  await postService.deletePost(postId, userId);
  
  res.status(200).json({ message: 'Post deleted successfully' });
});

/**
 * Toggle like status on a post
 */
const toggleLike = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;
  
  const updatedPost = await postService.toggleLike(postId, userId);
  
  if (!updatedPost) {
    throw new AppError('Post not found', 404);
  }
  
  res.status(200).json(updatedPost);
});

/**
 * Get posts from multiple categories
 */
const getMultiCategoryPosts = asyncHandler(async (req, res) => {
  const { categories, limit = 5 } = req.query;
  
  if (!categories) {
    throw new AppError('Categories are required', 400);
  }
  
  const categoriesArray = Array.isArray(categories) ? categories : categories.split(',');
  const result = await postService.getMultiCategoryPosts(categoriesArray, limit);
  
  res.status(200).json(result);
});

/**
 * Get comments for a specific post
 */
const getPostComments = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { limit = 50, startAfter = null } = req.query;
  
  const comments = await postService.getPostComments(postId, limit, startAfter);
  
  res.status(200).json(comments);
});

/**
 * Add a comment to a post
 */
const addComment = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;
  
  if (!content) {
    throw new AppError('Comment content is required', 400);
  }
  
  const comment = await postService.addComment({
    postId,
    userId,
    content,
    username: req.user.username,
    avatarUrl: req.user.avatarUrl
  });
  
  res.status(201).json(comment);
});

/**
 * Update a comment
 */
const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;
  
  if (!content) {
    throw new AppError('Comment content is required', 400);
  }
  
  const updatedComment = await postService.updateComment(commentId, userId, content);
  
  res.status(200).json(updatedComment);
});

/**
 * Delete a comment
 */
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.id;
  
  await postService.deleteComment(commentId, userId);
  
  res.status(200).json({ message: 'Comment deleted successfully' });
});

/**
 * Like a comment
 */
const likeComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.id;
  
  const updatedComment = await postService.toggleCommentLike(commentId, userId);
  
  if (!updatedComment) {
    throw new AppError('Comment not found', 404);
  }
  
  res.status(200).json(updatedComment);
});

/**
 * Unlike a comment (for backward compatibility)
 */
const unlikeComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.id;
  
  const updatedComment = await postService.toggleCommentLike(commentId, userId);
  
  if (!updatedComment) {
    throw new AppError('Comment not found', 404);
  }
  
  res.status(200).json(updatedComment);
});

/**
 * Get comments for multiple posts
 */
const getBatchComments = asyncHandler(async (req, res) => {
  let postIds;
  
  // Support both GET and POST methods
  if (req.method === 'GET') {
    postIds = req.query.postIds;
    if (typeof postIds === 'string') {
      postIds = postIds.split(',');
    }
  } else {
    postIds = req.body.postIds;
  }
  
  if (!postIds || !Array.isArray(postIds)) {
    throw new AppError('Post IDs are required', 400);
  }
  
  const comments = await postService.getBatchComments(postIds);
  
  res.status(200).json(comments);
});

module.exports = {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  toggleLike,
  getMultiCategoryPosts,
  getBatchComments,
  getPostComments,
  addComment,
  likeComment,
  unlikeComment,
  deleteComment,
  updateComment
};
