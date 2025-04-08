/**
 * Post Service
 * Handles business logic for posts
 */
const postRepository = require('../../repositories/post/postRepository');
const AppError = require('../../utils/appError');
const logger = require('../../utils/logger');
const { validateRequiredFields } = require('../../utils/validation');

class PostService {
  async createPost(postData) {
    try {
      // Validate required fields
      validateRequiredFields(postData, ['title', 'content', 'userId', 'category']);

      // Additional validation logic can be added here
      if (postData.title.length < 3) {
        throw new AppError('Post title must be at least 3 characters long', 400);
      }

      return await postRepository.createPost(postData);
    } catch (error) {
      logger.error('Error in PostService.createPost:', error);
      throw error instanceof AppError ? error : new AppError('Error creating post', 500, error);
    }
  }

  async getPosts(category, limit, startAfter) {
    try {
      return await postRepository.getPosts(category, limit, startAfter);
    } catch (error) {
      logger.error('Error in PostService.getPosts:', error);
      throw new AppError('Error fetching posts', 500, error);
    }
  }

  async getPostById(postId) {
    try {
      if (!postId) {
        throw new AppError('Post ID is required', 400);
      }

      const post = await postRepository.getPostById(postId);
      
      if (!post) {
        throw new AppError('Post not found', 404);
      }

      return post;
    } catch (error) {
      logger.error(`Error in PostService.getPostById for postId ${postId}:`, error);
      throw error instanceof AppError ? error : new AppError('Error fetching post', 500, error);
    }
  }

  async updatePost(postId, userId, updates) {
    try {
      if (!postId) {
        throw new AppError('Post ID is required', 400);
      }

      // Ensure we have the post to update
      const post = await postRepository.getPostById(postId);
      
      if (!post) {
        throw new AppError('Post not found', 404);
      }

      // Authorization check - only the post owner can update it
      if (post.userId !== userId) {
        throw new AppError('Unauthorized - only the post owner can update it', 403);
      }

      return await postRepository.updatePost(postId, updates);
    } catch (error) {
      logger.error(`Error in PostService.updatePost for postId ${postId}:`, error);
      throw error instanceof AppError ? error : new AppError('Error updating post', 500, error);
    }
  }

  async deletePost(postId, userId, isAdmin = false) {
    try {
      if (!postId) {
        throw new AppError('Post ID is required', 400);
      }

      // Ensure we have the post to delete
      const post = await postRepository.getPostById(postId);
      
      if (!post) {
        throw new AppError('Post not found', 404);
      }

      // Authorization check - only the post owner or an admin can delete it
      if (!isAdmin && post.userId !== userId) {
        throw new AppError('Unauthorized - only the post owner or an admin can delete it', 403);
      }

      return await postRepository.deletePost(postId);
    } catch (error) {
      logger.error(`Error in PostService.deletePost for postId ${postId}:`, error);
      throw error instanceof AppError ? error : new AppError('Error deleting post', 500, error);
    }
  }

  async toggleLike(postId, userId) {
    try {
      if (!postId || !userId) {
        throw new AppError('Post ID and User ID are required', 400);
      }

      const post = await postRepository.getPostById(postId);
      
      if (!post) {
        throw new AppError('Post not found', 404);
      }

      return await postRepository.toggleLike(postId, userId);
    } catch (error) {
      logger.error(`Error in PostService.toggleLike for postId ${postId}:`, error);
      throw error instanceof AppError ? error : new AppError('Error toggling post like', 500, error);
    }
  }

  async getMultiCategoryPosts(categories, limit) {
    try {
      if (!categories) {
        throw new AppError('Categories are required', 400);
      }

      return await postRepository.getMultiCategoryPosts(categories, limit);
    } catch (error) {
      logger.error('Error in PostService.getMultiCategoryPosts:', error);
      throw error instanceof AppError ? error : new AppError('Error fetching multi-category posts', 500, error);
    }
  }

  async getPostComments(postId, limit, startAfter) {
    try {
      if (!postId) {
        throw new AppError('Post ID is required', 400);
      }

      // Ensure the post exists
      const post = await postRepository.getPostById(postId);
      
      if (!post) {
        throw new AppError('Post not found', 404);
      }

      return await postRepository.getPostComments(postId, limit, startAfter);
    } catch (error) {
      logger.error(`Error in PostService.getPostComments for postId ${postId}:`, error);
      throw error instanceof AppError ? error : new AppError('Error fetching post comments', 500, error);
    }
  }

  async getBatchComments(postIds) {
    try {
      if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
        throw new AppError('Valid post IDs array is required', 400);
      }

      // Process in parallel for better performance
      const commentsPromises = postIds.map(async (postId) => {
        try {
          const comments = await this.getPostComments(postId, 50);
          return [postId, comments];
        } catch (error) {
          logger.warn(`Failed to get comments for post ${postId}:`, error);
          return [postId, []]; // Return empty array for failed posts
        }
      });

      const results = await Promise.all(commentsPromises);
      
      // Convert results array to object with postId as keys
      return results.reduce((acc, [postId, comments]) => {
        acc[postId] = comments;
        return acc;
      }, {});
    } catch (error) {
      logger.error(`Error in PostService.getBatchComments:`, error);
      throw error instanceof AppError ? error : new AppError('Error fetching batch comments', 500, error);
    }
  }

  async addComment(commentData) {
    try {
      // Validate required fields
      validateRequiredFields(commentData, ['postId', 'userId', 'content']);

      // Ensure the post exists
      const post = await postRepository.getPostById(commentData.postId);
      
      if (!post) {
        throw new AppError('Post not found', 404);
      }

      // Ensure the user exists
      const user = await postRepository.getUserById(commentData.userId);
      
      if (!user) {
        throw new AppError('User not found', 404);
      }

      return await postRepository.addComment(commentData);
    } catch (error) {
      logger.error('Error in PostService.addComment:', error);
      throw error instanceof AppError ? error : new AppError('Error adding comment', 500, error);
    }
  }

  async updateComment(commentId, userId, content, isAdmin = false) {
    try {
      if (!commentId || !content) {
        throw new AppError('Comment ID and content are required', 400);
      }

      // Get the comment to check ownership
      const comments = await postRepository.getPostComments(null, null, null);
      const comment = comments.find(c => c.id === commentId);
      
      if (!comment) {
        throw new AppError('Comment not found', 404);
      }

      // Authorization check - only the comment owner or an admin can update it
      if (!isAdmin && comment.userId !== userId) {
        throw new AppError('Unauthorized - only the comment owner or an admin can update it', 403);
      }

      return await postRepository.updateComment(commentId, content);
    } catch (error) {
      logger.error(`Error in PostService.updateComment for commentId ${commentId}:`, error);
      throw error instanceof AppError ? error : new AppError('Error updating comment', 500, error);
    }
  }

  async deleteComment(commentId, userId, isAdmin = false) {
    try {
      if (!commentId) {
        throw new AppError('Comment ID is required', 400);
      }

      // Get the comment to check ownership
      const comments = await postRepository.getPostComments(null, null, null);
      const comment = comments.find(c => c.id === commentId);
      
      if (!comment) {
        throw new AppError('Comment not found', 404);
      }

      // Authorization check - only the comment owner or an admin can delete it
      if (!isAdmin && comment.userId !== userId) {
        throw new AppError('Unauthorized - only the comment owner or an admin can delete it', 403);
      }

      return await postRepository.deleteComment(commentId);
    } catch (error) {
      logger.error(`Error in PostService.deleteComment for commentId ${commentId}:`, error);
      throw error instanceof AppError ? error : new AppError('Error deleting comment', 500, error);
    }
  }

  async toggleCommentLike(commentId, userId) {
    try {
      if (!commentId || !userId) {
        throw new AppError('Comment ID and User ID are required', 400);
      }

      return await postRepository.toggleCommentLike(commentId, userId);
    } catch (error) {
      logger.error(`Error in PostService.toggleCommentLike for commentId ${commentId}:`, error);
      throw error instanceof AppError ? error : new AppError('Error toggling comment like', 500, error);
    }
  }
}

module.exports = new PostService(); 