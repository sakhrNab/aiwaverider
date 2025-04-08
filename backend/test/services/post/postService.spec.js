const postService = require('../../../services/post/postService');
const postRepository = require('../../../repositories/post/postRepository');
const AppError = require('../../../utils/appError');

// Mock Firebase admin
jest.mock('firebase-admin', () => {
  const firestore = () => ({
    collection: () => ({
      doc: jest.fn().mockReturnThis(),
      add: jest.fn().mockReturnThis(),
      get: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      startAfter: jest.fn().mockReturnThis()
    })
  });

  return {
    firestore,
    initializeApp: jest.fn(),
    credential: {
      cert: jest.fn()
    },
    apps: ['fakeApp']
  };
});

// Mock dependencies
jest.mock('../../../repositories/post/postRepository');
jest.mock('../../../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Post Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createPost', () => {
    const validPostData = {
      title: 'Test Post',
      content: 'This is a test post content',
      userId: 'user123',
      category: 'Technology'
    };

    it('should create a post when valid data is provided', async () => {
      const expectedPost = { id: 'post123', ...validPostData };
      postRepository.createPost.mockResolvedValue(expectedPost);

      const result = await postService.createPost(validPostData);

      expect(postRepository.createPost).toHaveBeenCalledWith(validPostData);
      expect(result).toEqual(expectedPost);
    });

    it('should throw an error when required fields are missing', async () => {
      const invalidData = { title: 'Test Post', userId: 'user123' };

      await expect(postService.createPost(invalidData)).rejects.toThrow(AppError);
      expect(postRepository.createPost).not.toHaveBeenCalled();
    });

    it('should throw an error when title is too short', async () => {
      const invalidData = { ...validPostData, title: 'AB' };

      await expect(postService.createPost(invalidData)).rejects.toThrow(
        'Post title must be at least 3 characters long'
      );
      expect(postRepository.createPost).not.toHaveBeenCalled();
    });

    it('should propagate repository errors with proper wrapping', async () => {
      const repoError = new Error('Database connection failed');
      postRepository.createPost.mockRejectedValue(repoError);

      await expect(postService.createPost(validPostData)).rejects.toThrow(AppError);
    });
  });

  describe('getPosts', () => {
    it('should return posts with default parameters', async () => {
      const expectedResult = {
        posts: [{ id: 'post1', title: 'Test Post' }],
        lastPostId: 'post1',
        hasMore: false
      };
      postRepository.getPosts.mockResolvedValue(expectedResult);

      const result = await postService.getPosts();

      expect(postRepository.getPosts).toHaveBeenCalledWith('All', 10, null);
      expect(result).toEqual(expectedResult);
    });

    it('should return posts with specified parameters', async () => {
      const expectedResult = {
        posts: [{ id: 'post1', title: 'Test Post' }],
        lastPostId: 'post1',
        hasMore: false
      };
      postRepository.getPosts.mockResolvedValue(expectedResult);

      const result = await postService.getPosts('Technology', 5, 'lastId');

      expect(postRepository.getPosts).toHaveBeenCalledWith('Technology', 5, 'lastId');
      expect(result).toEqual(expectedResult);
    });

    it('should handle errors and wrap them properly', async () => {
      const repoError = new Error('Database query failed');
      postRepository.getPosts.mockRejectedValue(repoError);

      await expect(postService.getPosts()).rejects.toThrow(AppError);
      expect(postRepository.getPosts).toHaveBeenCalled();
    });
  });

  describe('getPostById', () => {
    it('should return a post when valid ID is provided', async () => {
      const expectedPost = { id: 'post123', title: 'Test Post' };
      postRepository.getPostById.mockResolvedValue(expectedPost);

      const result = await postService.getPostById('post123');

      expect(postRepository.getPostById).toHaveBeenCalledWith('post123');
      expect(result).toEqual(expectedPost);
    });

    it('should throw an error when post ID is not provided', async () => {
      await expect(postService.getPostById()).rejects.toThrow('Post ID is required');
      expect(postRepository.getPostById).not.toHaveBeenCalled();
    });

    it('should throw a not found error when post does not exist', async () => {
      postRepository.getPostById.mockResolvedValue(null);

      await expect(postService.getPostById('nonexistent')).rejects.toThrow('Post not found');
      expect(postRepository.getPostById).toHaveBeenCalledWith('nonexistent');
    });

    it('should handle repository errors properly', async () => {
      const repoError = new Error('Database query failed');
      postRepository.getPostById.mockRejectedValue(repoError);

      await expect(postService.getPostById('post123')).rejects.toThrow(AppError);
      expect(postRepository.getPostById).toHaveBeenCalled();
    });
  });

  describe('updatePost', () => {
    const updates = { title: 'Updated Title', content: 'Updated content' };

    it('should update a post when user is the owner', async () => {
      const post = { id: 'post123', userId: 'user123', title: 'Original Title' };
      const updatedPost = { ...post, ...updates };
      
      postRepository.getPostById.mockResolvedValue(post);
      postRepository.updatePost.mockResolvedValue(updatedPost);

      const result = await postService.updatePost('post123', 'user123', updates);

      expect(postRepository.getPostById).toHaveBeenCalledWith('post123');
      expect(postRepository.updatePost).toHaveBeenCalledWith('post123', updates);
      expect(result).toEqual(updatedPost);
    });

    it('should throw an error when post ID is not provided', async () => {
      await expect(postService.updatePost(null, 'user123', updates)).rejects.toThrow('Post ID is required');
      expect(postRepository.getPostById).not.toHaveBeenCalled();
      expect(postRepository.updatePost).not.toHaveBeenCalled();
    });

    it('should throw a not found error when post does not exist', async () => {
      postRepository.getPostById.mockResolvedValue(null);

      await expect(postService.updatePost('nonexistent', 'user123', updates)).rejects.toThrow('Post not found');
      expect(postRepository.getPostById).toHaveBeenCalledWith('nonexistent');
      expect(postRepository.updatePost).not.toHaveBeenCalled();
    });

    it('should throw an unauthorized error when user is not the owner', async () => {
      const post = { id: 'post123', userId: 'otherUser', title: 'Original Title' };
      postRepository.getPostById.mockResolvedValue(post);

      await expect(postService.updatePost('post123', 'user123', updates)).rejects.toThrow('Unauthorized');
      expect(postRepository.getPostById).toHaveBeenCalledWith('post123');
      expect(postRepository.updatePost).not.toHaveBeenCalled();
    });

    it('should allow updates when user is admin even if not the owner', async () => {
      const post = { id: 'post123', userId: 'otherUser', title: 'Original Title' };
      const updatedPost = { ...post, ...updates };
      
      postRepository.getPostById.mockResolvedValue(post);
      postRepository.updatePost.mockResolvedValue(updatedPost);

      const result = await postService.updatePost('post123', 'admin123', updates, true);

      expect(postRepository.getPostById).toHaveBeenCalledWith('post123');
      expect(postRepository.updatePost).toHaveBeenCalledWith('post123', updates);
      expect(result).toEqual(updatedPost);
    });
  });

  describe('deletePost', () => {
    it('should delete a post when user is the owner', async () => {
      const post = { id: 'post123', userId: 'user123', title: 'Test Post' };
      
      postRepository.getPostById.mockResolvedValue(post);
      postRepository.deletePost.mockResolvedValue(true);

      const result = await postService.deletePost('post123', 'user123');

      expect(postRepository.getPostById).toHaveBeenCalledWith('post123');
      expect(postRepository.deletePost).toHaveBeenCalledWith('post123');
      expect(result).toBe(true);
    });

    it('should throw an error when post ID is not provided', async () => {
      await expect(postService.deletePost(null, 'user123')).rejects.toThrow('Post ID is required');
      expect(postRepository.getPostById).not.toHaveBeenCalled();
      expect(postRepository.deletePost).not.toHaveBeenCalled();
    });

    it('should throw a not found error when post does not exist', async () => {
      postRepository.getPostById.mockResolvedValue(null);

      await expect(postService.deletePost('nonexistent', 'user123')).rejects.toThrow('Post not found');
      expect(postRepository.getPostById).toHaveBeenCalledWith('nonexistent');
      expect(postRepository.deletePost).not.toHaveBeenCalled();
    });

    it('should throw an unauthorized error when user is not the owner', async () => {
      const post = { id: 'post123', userId: 'otherUser', title: 'Test Post' };
      postRepository.getPostById.mockResolvedValue(post);

      await expect(postService.deletePost('post123', 'user123')).rejects.toThrow('Unauthorized');
      expect(postRepository.getPostById).toHaveBeenCalledWith('post123');
      expect(postRepository.deletePost).not.toHaveBeenCalled();
    });

    it('should allow deletion when user is admin even if not the owner', async () => {
      const post = { id: 'post123', userId: 'otherUser', title: 'Test Post' };
      
      postRepository.getPostById.mockResolvedValue(post);
      postRepository.deletePost.mockResolvedValue(true);

      const result = await postService.deletePost('post123', 'admin123', true);

      expect(postRepository.getPostById).toHaveBeenCalledWith('post123');
      expect(postRepository.deletePost).toHaveBeenCalledWith('post123');
      expect(result).toBe(true);
    });
  });

  describe('toggleLike', () => {
    it('should toggle like status for a post', async () => {
      const post = { id: 'post123', title: 'Test Post', likes: ['user456'] };
      const updatedPost = { ...post, likes: ['user456', 'user123'] };
      
      postRepository.getPostById.mockResolvedValue(post);
      postRepository.toggleLike.mockResolvedValue(updatedPost);

      const result = await postService.toggleLike('post123', 'user123');

      expect(postRepository.getPostById).toHaveBeenCalledWith('post123');
      expect(postRepository.toggleLike).toHaveBeenCalledWith('post123', 'user123');
      expect(result).toEqual(updatedPost);
    });

    it('should throw an error when post ID is not provided', async () => {
      await expect(postService.toggleLike(null, 'user123')).rejects.toThrow('Post ID and User ID are required');
      expect(postRepository.getPostById).not.toHaveBeenCalled();
      expect(postRepository.toggleLike).not.toHaveBeenCalled();
    });

    it('should throw an error when user ID is not provided', async () => {
      await expect(postService.toggleLike('post123')).rejects.toThrow('Post ID and User ID are required');
      expect(postRepository.getPostById).not.toHaveBeenCalled();
      expect(postRepository.toggleLike).not.toHaveBeenCalled();
    });

    it('should throw a not found error when post does not exist', async () => {
      postRepository.getPostById.mockResolvedValue(null);

      await expect(postService.toggleLike('nonexistent', 'user123')).rejects.toThrow('Post not found');
      expect(postRepository.getPostById).toHaveBeenCalledWith('nonexistent');
      expect(postRepository.toggleLike).not.toHaveBeenCalled();
    });
  });

  describe('getMultiCategoryPosts', () => {
    const categories = 'Technology,Science';
    const expectedResult = {
      Technology: { posts: [{ id: 'post1' }], postIds: ['post1'] },
      Science: { posts: [{ id: 'post2' }], postIds: ['post2'] }
    };

    it('should return posts from multiple categories', async () => {
      postRepository.getMultiCategoryPosts.mockResolvedValue(expectedResult);

      const result = await postService.getMultiCategoryPosts(categories, 5);

      expect(postRepository.getMultiCategoryPosts).toHaveBeenCalledWith(categories, 5);
      expect(result).toEqual(expectedResult);
    });

    it('should throw an error when categories are not provided', async () => {
      await expect(postService.getMultiCategoryPosts()).rejects.toThrow('Categories are required');
      expect(postRepository.getMultiCategoryPosts).not.toHaveBeenCalled();
    });

    it('should handle repository errors properly', async () => {
      const repoError = new Error('Database query failed');
      postRepository.getMultiCategoryPosts.mockRejectedValue(repoError);

      await expect(postService.getMultiCategoryPosts(categories, 5)).rejects.toThrow(AppError);
      expect(postRepository.getMultiCategoryPosts).toHaveBeenCalled();
    });
  });

  describe('getPostComments', () => {
    it('should return comments for a post', async () => {
      const post = { id: 'post123', title: 'Test Post' };
      const comments = [{ id: 'comment1', content: 'Great post!' }];
      
      postRepository.getPostById.mockResolvedValue(post);
      postRepository.getPostComments.mockResolvedValue(comments);

      const result = await postService.getPostComments('post123', 10);

      expect(postRepository.getPostById).toHaveBeenCalledWith('post123');
      expect(postRepository.getPostComments).toHaveBeenCalledWith('post123', 10, null);
      expect(result).toEqual(comments);
    });

    it('should throw an error when post ID is not provided', async () => {
      await expect(postService.getPostComments()).rejects.toThrow('Post ID is required');
      expect(postRepository.getPostById).not.toHaveBeenCalled();
      expect(postRepository.getPostComments).not.toHaveBeenCalled();
    });

    it('should throw a not found error when post does not exist', async () => {
      postRepository.getPostById.mockResolvedValue(null);

      await expect(postService.getPostComments('nonexistent')).rejects.toThrow('Post not found');
      expect(postRepository.getPostById).toHaveBeenCalledWith('nonexistent');
      expect(postRepository.getPostComments).not.toHaveBeenCalled();
    });
  });

  describe('addComment', () => {
    const validCommentData = {
      postId: 'post123',
      userId: 'user123',
      content: 'This is a test comment'
    };

    it('should add a comment to a post', async () => {
      const post = { id: 'post123', title: 'Test Post' };
      const user = { id: 'user123', username: 'testuser' };
      const newComment = { id: 'comment1', ...validCommentData };
      
      postRepository.getPostById.mockResolvedValue(post);
      postRepository.getUserById.mockResolvedValue(user);
      postRepository.addComment.mockResolvedValue(newComment);

      const result = await postService.addComment(validCommentData);

      expect(postRepository.getPostById).toHaveBeenCalledWith('post123');
      expect(postRepository.getUserById).toHaveBeenCalledWith('user123');
      expect(postRepository.addComment).toHaveBeenCalledWith(validCommentData);
      expect(result).toEqual(newComment);
    });

    it('should throw an error when required fields are missing', async () => {
      const invalidData = { postId: 'post123', userId: 'user123' };

      await expect(postService.addComment(invalidData)).rejects.toThrow(AppError);
      expect(postRepository.getPostById).not.toHaveBeenCalled();
      expect(postRepository.addComment).not.toHaveBeenCalled();
    });

    it('should throw a not found error when post does not exist', async () => {
      postRepository.getPostById.mockResolvedValue(null);

      await expect(postService.addComment(validCommentData)).rejects.toThrow('Post not found');
      expect(postRepository.getPostById).toHaveBeenCalledWith('post123');
      expect(postRepository.getUserById).not.toHaveBeenCalled();
      expect(postRepository.addComment).not.toHaveBeenCalled();
    });

    it('should throw a not found error when user does not exist', async () => {
      const post = { id: 'post123', title: 'Test Post' };
      
      postRepository.getPostById.mockResolvedValue(post);
      postRepository.getUserById.mockResolvedValue(null);

      await expect(postService.addComment(validCommentData)).rejects.toThrow('User not found');
      expect(postRepository.getPostById).toHaveBeenCalledWith('post123');
      expect(postRepository.getUserById).toHaveBeenCalledWith('user123');
      expect(postRepository.addComment).not.toHaveBeenCalled();
    });
  });

  describe('updateComment and deleteComment', () => {
    const allComments = [
      { id: 'comment1', userId: 'user123', content: 'First comment' },
      { id: 'comment2', userId: 'user456', content: 'Second comment' }
    ];

    beforeEach(() => {
      postRepository.getPostComments.mockResolvedValue(allComments);
    });

    describe('updateComment', () => {
      it('should update a comment when user is the owner', async () => {
        const updatedComment = { ...allComments[0], content: 'Updated comment' };
        postRepository.updateComment.mockResolvedValue(updatedComment);

        const result = await postService.updateComment('comment1', 'user123', 'Updated comment');

        expect(postRepository.getPostComments).toHaveBeenCalled();
        expect(postRepository.updateComment).toHaveBeenCalledWith('comment1', 'Updated comment');
        expect(result).toEqual(updatedComment);
      });

      it('should throw an error when comment ID is not provided', async () => {
        await expect(postService.updateComment(null, 'user123', 'content')).rejects.toThrow('Comment ID and content are required');
        expect(postRepository.updateComment).not.toHaveBeenCalled();
      });

      it('should throw an error when content is not provided', async () => {
        await expect(postService.updateComment('comment1', 'user123')).rejects.toThrow('Comment ID and content are required');
        expect(postRepository.updateComment).not.toHaveBeenCalled();
      });

      it('should throw a not found error when comment does not exist', async () => {
        await expect(postService.updateComment('nonexistent', 'user123', 'content')).rejects.toThrow('Comment not found');
        expect(postRepository.getPostComments).toHaveBeenCalled();
        expect(postRepository.updateComment).not.toHaveBeenCalled();
      });

      it('should throw an unauthorized error when user is not the owner', async () => {
        await expect(postService.updateComment('comment2', 'user123', 'content')).rejects.toThrow('Unauthorized');
        expect(postRepository.getPostComments).toHaveBeenCalled();
        expect(postRepository.updateComment).not.toHaveBeenCalled();
      });

      it('should allow updates when user is admin even if not the owner', async () => {
        const updatedComment = { ...allComments[1], content: 'Admin updated' };
        postRepository.updateComment.mockResolvedValue(updatedComment);

        const result = await postService.updateComment('comment2', 'admin', 'Admin updated', true);

        expect(postRepository.getPostComments).toHaveBeenCalled();
        expect(postRepository.updateComment).toHaveBeenCalledWith('comment2', 'Admin updated');
        expect(result).toEqual(updatedComment);
      });
    });

    describe('deleteComment', () => {
      it('should delete a comment when user is the owner', async () => {
        postRepository.deleteComment.mockResolvedValue(true);

        const result = await postService.deleteComment('comment1', 'user123');

        expect(postRepository.getPostComments).toHaveBeenCalled();
        expect(postRepository.deleteComment).toHaveBeenCalledWith('comment1');
        expect(result).toBe(true);
      });

      it('should throw an error when comment ID is not provided', async () => {
        await expect(postService.deleteComment(null, 'user123')).rejects.toThrow('Comment ID is required');
        expect(postRepository.deleteComment).not.toHaveBeenCalled();
      });

      it('should throw a not found error when comment does not exist', async () => {
        await expect(postService.deleteComment('nonexistent', 'user123')).rejects.toThrow('Comment not found');
        expect(postRepository.getPostComments).toHaveBeenCalled();
        expect(postRepository.deleteComment).not.toHaveBeenCalled();
      });

      it('should throw an unauthorized error when user is not the owner', async () => {
        await expect(postService.deleteComment('comment2', 'user123')).rejects.toThrow('Unauthorized');
        expect(postRepository.getPostComments).toHaveBeenCalled();
        expect(postRepository.deleteComment).not.toHaveBeenCalled();
      });

      it('should allow deletion when user is admin even if not the owner', async () => {
        postRepository.deleteComment.mockResolvedValue(true);

        const result = await postService.deleteComment('comment2', 'admin', true);

        expect(postRepository.getPostComments).toHaveBeenCalled();
        expect(postRepository.deleteComment).toHaveBeenCalledWith('comment2');
        expect(result).toBe(true);
      });
    });
  });

  describe('toggleCommentLike', () => {
    it('should toggle like status for a comment', async () => {
      const updatedComment = { id: 'comment1', likes: ['user123'] };
      postRepository.toggleCommentLike.mockResolvedValue(updatedComment);

      const result = await postService.toggleCommentLike('comment1', 'user123');

      expect(postRepository.toggleCommentLike).toHaveBeenCalledWith('comment1', 'user123');
      expect(result).toEqual(updatedComment);
    });

    it('should throw an error when comment ID is not provided', async () => {
      await expect(postService.toggleCommentLike(null, 'user123')).rejects.toThrow('Comment ID and User ID are required');
      expect(postRepository.toggleCommentLike).not.toHaveBeenCalled();
    });

    it('should throw an error when user ID is not provided', async () => {
      await expect(postService.toggleCommentLike('comment1')).rejects.toThrow('Comment ID and User ID are required');
      expect(postRepository.toggleCommentLike).not.toHaveBeenCalled();
    });
  });
}); 