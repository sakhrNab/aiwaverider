const postsController = require('../../controllers/postsController');
const postService = require('../../services/post/postService');
const { uploadImageToGitHub, deleteImageFromGitHub } = require('../../utils/github');
const AppError = require('../../utils/appError');

// Mock dependencies
jest.mock('../../services/post/postService');
jest.mock('../../utils/github');
jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Posts Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
      user: { uid: 'user123', role: 'user' },
      file: null
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      sendStatus: jest.fn()
    };
    
    next = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('getPosts', () => {
    const mockPosts = {
      posts: [{ id: 'post1', title: 'Test Post' }],
      lastPostId: 'post1',
      hasMore: false
    };

    it('should get posts with default parameters', async () => {
      postService.getPosts.mockResolvedValue(mockPosts);

      await postsController.getPosts(req, res);

      expect(postService.getPosts).toHaveBeenCalledWith('All', 10, null);
      expect(res.json).toHaveBeenCalledWith(mockPosts);
    });

    it('should get posts with specified parameters', async () => {
      req.query = { category: 'Technology', limit: '5', startAfter: 'lastId' };
      postService.getPosts.mockResolvedValue(mockPosts);

      await postsController.getPosts(req, res);

      expect(postService.getPosts).toHaveBeenCalledWith('Technology', 5, 'lastId');
      expect(res.json).toHaveBeenCalledWith(mockPosts);
    });

    it('should handle service errors', async () => {
      const mockError = new AppError('Service error', 500);
      postService.getPosts.mockRejectedValue(mockError);
      
      await postsController.getPosts(req, res, next);
      
      expect(next).toHaveBeenCalledWith(mockError);
    });
  });

  describe('getPostById', () => {
    const mockPost = { id: 'post1', title: 'Test Post' };

    it('should get a post by ID', async () => {
      req.params.postId = 'post1';
      postService.getPostById.mockResolvedValue(mockPost);

      await postsController.getPostById(req, res);

      expect(postService.getPostById).toHaveBeenCalledWith('post1');
      expect(res.json).toHaveBeenCalledWith(mockPost);
    });

    it('should handle not found errors', async () => {
      req.params.postId = 'nonexistent';
      const mockError = new AppError('Post not found', 404);
      postService.getPostById.mockRejectedValue(mockError);
      
      await postsController.getPostById(req, res, next);
      
      expect(next).toHaveBeenCalledWith(mockError);
    });
  });

  describe('createPost', () => {
    const postData = {
      title: 'New Post',
      description: 'Post description',
      category: 'Technology'
    };
    
    const mockCreatedPost = { id: 'newPost', ...postData };

    it('should create a post with valid data', async () => {
      req.body = postData;
      req.user = { uid: 'user123' };
      postService.createPost.mockResolvedValue(mockCreatedPost);

      await postsController.createPost(req, res);

      expect(postService.createPost).toHaveBeenCalledWith(expect.objectContaining({
        title: postData.title,
        content: postData.description,
        category: postData.category,
        userId: 'user123'
      }));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Post created successfully',
        post: mockCreatedPost
      });
    });

    it('should upload an image if provided', async () => {
      req.body = postData;
      req.user = { uid: 'user123' };
      req.file = {
        originalname: 'test.jpg',
        buffer: Buffer.from('test')
      };
      
      const uploadResult = { url: 'image-url', sha: 'image-sha' };
      uploadImageToGitHub.mockResolvedValue(uploadResult);
      postService.createPost.mockResolvedValue(mockCreatedPost);

      await postsController.createPost(req, res);

      expect(uploadImageToGitHub).toHaveBeenCalled();
      expect(postService.createPost).toHaveBeenCalledWith(expect.objectContaining({
        imageUrl: 'image-url',
        imageSha: 'image-sha'
      }));
    });

    it('should handle authentication errors', async () => {
      req.body = postData;
      req.user = null;
      
      await postsController.createPost(req, res, next);
      
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(postService.createPost).not.toHaveBeenCalled();
    });

    it('should handle image upload failures', async () => {
      req.body = postData;
      req.user = { uid: 'user123' };
      req.file = {
        originalname: 'test.jpg',
        buffer: Buffer.from('test')
      };
      
      uploadImageToGitHub.mockResolvedValue({ url: null });
      
      await postsController.createPost(req, res, next);
      
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(postService.createPost).not.toHaveBeenCalled();
    });
  });

  describe('updatePost', () => {
    const updateData = {
      title: 'Updated Post',
      content: 'Updated content'
    };
    
    const mockPost = { id: 'post1', userId: 'user123', title: 'Original Title' };
    const mockUpdatedPost = { ...mockPost, ...updateData };

    it('should update a post with valid data', async () => {
      req.params.postId = 'post1';
      req.body = updateData;
      req.user = { uid: 'user123', role: 'user' };
      
      postService.getPostById.mockResolvedValue(mockPost);
      postService.updatePost.mockResolvedValue(mockUpdatedPost);

      await postsController.updatePost(req, res);

      expect(postService.updatePost).toHaveBeenCalledWith('post1', 'user123', updateData, false);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Post updated successfully',
        post: mockUpdatedPost
      });
    });

    it('should handle unauthorized updates', async () => {
      req.params.postId = 'post1';
      req.body = updateData;
      req.user = { uid: 'otherUser', role: 'user' };
      
      const mockError = new AppError('Unauthorized', 403);
      postService.getPostById.mockResolvedValue(mockPost);
      postService.updatePost.mockRejectedValue(mockError);
      
      await postsController.updatePost(req, res, next);
      
      expect(next).toHaveBeenCalledWith(mockError);
    });

    it('should allow admin to update any post', async () => {
      req.params.postId = 'post1';
      req.body = updateData;
      req.user = { uid: 'adminUser', role: 'admin' };
      
      postService.getPostById.mockResolvedValue(mockPost);
      postService.updatePost.mockResolvedValue(mockUpdatedPost);

      await postsController.updatePost(req, res);

      expect(postService.updatePost).toHaveBeenCalledWith('post1', 'adminUser', updateData, true);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Post updated successfully',
        post: mockUpdatedPost
      });
    });

    it('should handle image updates', async () => {
      req.params.postId = 'post1';
      req.body = updateData;
      req.user = { uid: 'user123', role: 'user' };
      req.file = {
        originalname: 'updated.jpg',
        buffer: Buffer.from('test')
      };
      
      const existingPost = { ...mockPost, imageSha: 'old-sha' };
      const uploadResult = { url: 'new-image-url', sha: 'new-image-sha' };
      
      postService.getPostById.mockResolvedValue(existingPost);
      uploadImageToGitHub.mockResolvedValue(uploadResult);
      postService.updatePost.mockResolvedValue({ ...mockUpdatedPost, imageUrl: 'new-image-url' });

      await postsController.updatePost(req, res);

      expect(deleteImageFromGitHub).toHaveBeenCalledWith('old-sha');
      expect(uploadImageToGitHub).toHaveBeenCalled();
      expect(postService.updatePost).toHaveBeenCalledWith(
        'post1', 
        'user123', 
        expect.objectContaining({
          ...updateData,
          imageUrl: 'new-image-url',
          imageSha: 'new-image-sha'
        }),
        false
      );
    });
  });

  describe('deletePost', () => {
    const mockPost = { id: 'post1', userId: 'user123', title: 'Post to Delete', imageSha: 'image-sha' };

    it('should delete a post', async () => {
      req.params.postId = 'post1';
      req.user = { uid: 'user123', role: 'user' };
      
      postService.getPostById.mockResolvedValue(mockPost);
      postService.deletePost.mockResolvedValue(true);

      await postsController.deletePost(req, res);

      expect(deleteImageFromGitHub).toHaveBeenCalledWith('image-sha');
      expect(postService.deletePost).toHaveBeenCalledWith('post1', 'user123', false);
      expect(res.json).toHaveBeenCalledWith({ message: 'Post deleted successfully' });
    });

    it('should allow admin to delete any post', async () => {
      req.params.postId = 'post1';
      req.user = { uid: 'adminUser', role: 'admin' };
      
      postService.getPostById.mockResolvedValue(mockPost);
      postService.deletePost.mockResolvedValue(true);

      await postsController.deletePost(req, res);

      expect(postService.deletePost).toHaveBeenCalledWith('post1', 'adminUser', true);
    });

    it('should handle unauthorized deletion', async () => {
      req.params.postId = 'post1';
      req.user = { uid: 'otherUser', role: 'user' };
      
      const mockError = new AppError('Unauthorized', 403);
      postService.getPostById.mockResolvedValue(mockPost);
      postService.deletePost.mockRejectedValue(mockError);
      
      await postsController.deletePost(req, res, next);
      
      expect(next).toHaveBeenCalledWith(mockError);
    });
  });

  describe('toggleLike', () => {
    const mockUpdatedPost = { id: 'post1', likes: ['user123'] };

    it('should toggle like status on a post', async () => {
      req.params.postId = 'post1';
      req.user = { uid: 'user123' };
      
      postService.toggleLike.mockResolvedValue(mockUpdatedPost);

      await postsController.toggleLike(req, res);

      expect(postService.toggleLike).toHaveBeenCalledWith('post1', 'user123');
      expect(res.json).toHaveBeenCalledWith(mockUpdatedPost);
    });
  });

  describe('getMultiCategoryPosts', () => {
    const mockResults = {
      Technology: { posts: [{ id: 'tech1' }] },
      Science: { posts: [{ id: 'sci1' }] }
    };

    it('should get posts from multiple categories', async () => {
      req.query = { categories: 'Technology,Science', limit: '5' };
      
      postService.getMultiCategoryPosts.mockResolvedValue(mockResults);

      await postsController.getMultiCategoryPosts(req, res);

      expect(postService.getMultiCategoryPosts).toHaveBeenCalledWith('Technology,Science', 5);
      expect(res.json).toHaveBeenCalledWith(mockResults);
    });

    it('should handle missing categories parameter', async () => {
      req.query = { limit: '5' };
      
      await postsController.getMultiCategoryPosts(req, res, next);
      
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(postService.getMultiCategoryPosts).not.toHaveBeenCalled();
    });
  });

  describe('Comment operations', () => {
    describe('getPostComments', () => {
      const mockComments = [{ id: 'comment1', content: 'Great post!' }];

      it('should get comments for a post', async () => {
        req.params.postId = 'post1';
        req.query = { limit: '20', startAfter: 'lastComment' };
        
        postService.getPostComments.mockResolvedValue(mockComments);

        await postsController.getPostComments(req, res);

        expect(postService.getPostComments).toHaveBeenCalledWith('post1', 20, 'lastComment');
        expect(res.json).toHaveBeenCalledWith(mockComments);
      });
    });

    describe('addComment', () => {
      const mockComment = { id: 'comment1', content: 'New comment', postId: 'post1' };

      it('should add a comment to a post', async () => {
        req.params.postId = 'post1';
        req.body = { text: 'New comment' };
        req.user = { uid: 'user123' };
        
        postService.addComment.mockResolvedValue(mockComment);

        await postsController.addComment(req, res);

        expect(postService.addComment).toHaveBeenCalledWith({
          postId: 'post1',
          userId: 'user123',
          content: 'New comment'
        });
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
          message: 'Comment added successfully',
          comment: mockComment
        });
      });

      it('should validate comment text', async () => {
        req.params.postId = 'post1';
        req.body = {}; // Missing text
        req.user = { uid: 'user123' };
        
        await postsController.addComment(req, res, next);
        
        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        expect(postService.addComment).not.toHaveBeenCalled();
      });
    });

    describe('updateComment', () => {
      const mockUpdatedComment = { id: 'comment1', content: 'Updated comment' };

      it('should update a comment', async () => {
        req.params = { postId: 'post1', commentId: 'comment1' };
        req.body = { text: 'Updated comment' };
        req.user = { uid: 'user123', role: 'user' };
        
        postService.updateComment.mockResolvedValue(mockUpdatedComment);

        await postsController.updateComment(req, res);

        expect(postService.updateComment).toHaveBeenCalledWith('comment1', 'user123', 'Updated comment', false);
        expect(res.json).toHaveBeenCalledWith({
          message: 'Comment updated successfully',
          comment: mockUpdatedComment
        });
      });

      it('should allow admin to update any comment', async () => {
        req.params = { postId: 'post1', commentId: 'comment1' };
        req.body = { text: 'Admin update' };
        req.user = { uid: 'adminUser', role: 'admin' };
        
        postService.updateComment.mockResolvedValue({ ...mockUpdatedComment, content: 'Admin update' });

        await postsController.updateComment(req, res);

        expect(postService.updateComment).toHaveBeenCalledWith('comment1', 'adminUser', 'Admin update', true);
      });
    });

    describe('deleteComment', () => {
      it('should delete a comment', async () => {
        req.params = { postId: 'post1', commentId: 'comment1' };
        req.user = { uid: 'user123', role: 'user' };
        
        postService.deleteComment.mockResolvedValue(true);

        await postsController.deleteComment(req, res);

        expect(postService.deleteComment).toHaveBeenCalledWith('comment1', 'user123', false);
        expect(res.json).toHaveBeenCalledWith({ message: 'Comment deleted successfully' });
      });

      it('should allow admin to delete any comment', async () => {
        req.params = { postId: 'post1', commentId: 'comment1' };
        req.user = { uid: 'adminUser', role: 'admin' };
        
        postService.deleteComment.mockResolvedValue(true);

        await postsController.deleteComment(req, res);

        expect(postService.deleteComment).toHaveBeenCalledWith('comment1', 'adminUser', true);
      });
    });

    describe('likeComment and unlikeComment', () => {
      const mockLikedComment = { id: 'comment1', likes: ['user123'] };

      it('should toggle like on a comment', async () => {
        req.params = { commentId: 'comment1' };
        req.user = { uid: 'user123' };
        
        postService.toggleCommentLike.mockResolvedValue(mockLikedComment);

        await postsController.likeComment(req, res);

        expect(postService.toggleCommentLike).toHaveBeenCalledWith('comment1', 'user123');
        expect(res.json).toHaveBeenCalledWith(mockLikedComment);
      });

      it('should use the same function for unlike endpoint', async () => {
        req.params = { commentId: 'comment1' };
        req.user = { uid: 'user123' };
        
        postService.toggleCommentLike.mockResolvedValue(mockLikedComment);

        await postsController.unlikeComment(req, res);

        expect(postService.toggleCommentLike).toHaveBeenCalledWith('comment1', 'user123');
        expect(res.json).toHaveBeenCalledWith(mockLikedComment);
      });
    });
  });

  describe('getBatchComments', () => {
    const mockBatchComments = {
      'post1': [{ id: 'comment1' }],
      'post2': [{ id: 'comment2' }]
    };

    it('should get comments for multiple posts with GET method', async () => {
      req.method = 'GET';
      req.query.postIds = 'post1,post2';
      
      postService.getPostComments.mockImplementation((postId) => {
        return Promise.resolve(mockBatchComments[postId] || []);
      });

      await postsController.getBatchComments(req, res);

      expect(postService.getPostComments).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith(mockBatchComments);
    });

    it('should get comments for multiple posts with POST method', async () => {
      req.method = 'POST';
      req.body.postIds = ['post1', 'post2'];
      
      postService.getPostComments.mockImplementation((postId) => {
        return Promise.resolve(mockBatchComments[postId] || []);
      });

      await postsController.getBatchComments(req, res);

      expect(postService.getPostComments).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith(mockBatchComments);
    });

    it('should handle missing post IDs', async () => {
      req.method = 'GET';
      // No postIds provided
      
      await postsController.getBatchComments(req, res, next);
      
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(postService.getPostComments).not.toHaveBeenCalled();
    });
  });
}); 