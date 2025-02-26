// src/posts/PostsList.jsx
import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { PostsContext } from '../contexts/PostsContext';
import { addComment, deletePost, getAllPosts } from '../utils/api';
import ConfirmationModal from '../components/ConfirmationModal';
import { auth } from '../utils/firebase';
import { Link } from 'react-router-dom'; // Add this import
import CommentsList from './CommentsList';
import LikeButton from '../components/LikeButton';
import { toast } from 'react-toastify';

const PostsList = () => {
  const { 
    posts, 
    setPosts, 
    fetchAllPosts, 
    loadingPosts, 
    errorPosts, 
    addCommentToCache, 
    fetchBatchComments,
    commentsCache,
    commentsLastFetch
  } = useContext(PostsContext);
  const { user, role, token } = useContext(AuthContext);
  
  // Add error state
  const [error, setError] = useState('');
  const [commentTexts, setCommentTexts] = useState({});
  const [postToDelete, setPostToDelete] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [lastPostCreatedAt, setLastPostCreatedAt] = useState(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingComments, setLoadingComments] = useState(true);

  // Load posts and their comments
  useEffect(() => {
    const loadPostsAndComments = async () => {
      try {
        // First load posts
        await fetchAllPosts(selectedCategory, 10);
        
        // Then fetch comments for all posts
        if (posts.length > 0) {
          setLoadingComments(true);
          const postIds = Array.from(new Set(posts.map(p => p.id)));
          await fetchBatchComments(postIds);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingComments(false);
      }
    };
    
    loadPostsAndComments();
  }, [selectedCategory, fetchAllPosts, fetchBatchComments]);

  // In the useEffect that loads comments, add optimizations similar to CommentsSection
  useEffect(() => {
    const loadComments = async () => {
      if (posts.length === 0) return;
      
      // Extract unique post IDs that need comments
      const postIds = Array.from(new Set(posts.map(post => post.id)));
      
      // Check if all post comments are already in cache and fresh (less than 1 min old)
      // Make sure commentsLastFetch and commentsCache are properly initialized before access
      if (!commentsLastFetch || !commentsCache) {
        await fetchBatchComments(postIds);
        return;
      }

      const needsFetching = postIds.some(id => {
        // Make sure we safely access commentsLastFetch[id]
        const lastFetchTime = commentsLastFetch[id] || 0;
        return !commentsCache[id] || (Date.now() - lastFetchTime >= 60000);
      });
      
      if (needsFetching) {
        // Only fetch comments for visible posts on the screen
        await fetchBatchComments(postIds);
      } else {
        console.log('All post comments are already in fresh cache, skipping fetch');
      }
    };
    
    loadComments();
  }, [posts, fetchBatchComments, commentsCache, commentsLastFetch]);

  // Load more posts
  const handleLoadMore = async () => {
    if (!hasMore || isFetchingMore) return;
    
    setIsFetchingMore(true);
    try {
      const data = await getAllPosts(selectedCategory, 10, lastPostCreatedAt, token);
      if (data.posts.length > 0) {
        setPosts((prev) => [...prev, ...data.posts]);
        setLastPostCreatedAt(data.lastPostCreatedAt);
        
        // Fetch comments for new posts
        const newPostIds = data.posts.map(p => p.id);
        await fetchBatchComments(newPostIds);
      }
      setHasMore(data.posts.length === 10);
    } catch (err) {
      console.error('Error fetching more posts:', err);
      setError(err.message || 'Failed to load more posts.');
    } finally {
      setIsFetchingMore(false);
    }
  };

  // Handle comment input
  const handleCommentChange = (postId, text) => {
    setCommentTexts((prev) => ({ ...prev, [postId]: text }));
  };

  // Add comment
  const handleAddComment = async (postId) => {
    if (!user) {
      toast.info(
        <div>
          Please <a href="/signin" className="text-blue-500 hover:text-blue-700">sign in</a> or{' '}
          <a href="/signup" className="text-blue-500 hover:text-blue-700">sign up</a> to comment.
        </div>,
        {
          position: "top-center",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        }
      );
      return;
    }

    const commentText = commentTexts[postId];
    if (!commentText?.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    try {
      const data = await addComment(postId, { commentText: commentText.trim() });
      if (data) {
        addCommentToCache(postId, data);
        setCommentTexts(prev => ({ ...prev, [postId]: '' }));
        toast.success('Comment added successfully');
      }
    } catch (err) {
      console.error('Error adding comment:', err);
      toast.error('Failed to add comment');
    }
  };

  // Delete post
  const confirmDeletePost = (post) => {
    setPostToDelete(post);
    setIsModalOpen(true);
  };

  const handleDeletePost = async () => {
    if (!postToDelete) return;
    try {
      const data = await deletePost(postToDelete.id);
      if (data.success) {
        setPosts((prev) => prev.filter((p) => p.id !== postToDelete.id));
        setIsModalOpen(false);
        setPostToDelete(null);
      } else {
        alert(data.error || 'Failed to delete post.');
      }
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('An unexpected error occurred while deleting the post.');
    }
  };

  // Format date
  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleString();
  };

  // Use loadingPosts instead of local loading state
  if (loadingPosts) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-16 w-16" />
      </div>
    );
  }

  // Use either local error or context error
  if (error || errorPosts) {
    return <div className="p-4 text-red-500 text-center">{error || errorPosts}</div>;
  }

  const userIsAdmin = user?.role === 'admin';

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-center">Community Posts</h2>

      {/* Category Filter */}
      <div className="mb-6 flex justify-end">
        <label htmlFor="category" className="mr-2 text-gray-700">
          Filter by Category:
        </label>
        <select
          id="category"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="p-2 border border-gray-300 rounded-md"
        >
          <option value="All">All</option>
          <option value="Trends">Trends</option>
          <option value="Latest Tech">Latest Tech</option>
          <option value="AI Tools">AI Tools</option>
          {/* Add more categories if needed */}
        </select>
      </div>

      {posts.length === 0 && (
        <p className="text-center text-gray-600">No posts available.</p>
      )}

      <div className="space-y-6">
        {Array.from(new Set(posts.map(p => p.id))).map((postId) => {
          const post = posts.find(p => p.id === postId);
          if (!post) return null;
          
          const postComments = commentsCache[postId] || [];
          
          return (
            <div key={`post-${postId}`} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div className="w-full"> {/* Add w-full to ensure clickable area */}
                  <Link 
                    to={`/posts/${post.id}`}
                    className="block hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    <div className="mb-4">
                      <h3 className="text-2xl font-semibold mb-2">{post.title}</h3>
                      <p className="text-gray-700">{post.description}</p>
                      {post.imageUrl && (
                        <img
                          src={post.imageUrl}
                          alt={post.title}
                          className="mt-2 h-40 w-full object-cover rounded-md"
                        />
                      )}
                    </div>
                  </Link>

                  <div className="flex items-center space-x-4 mt-4">
                    <LikeButton postId={post.id} initialLikes={post.likes || []} />
                    <span className="text-gray-600">{post.views || 0} views</span>
                  </div>

                  {/* Comments section */}
                  <div className="mt-4 border-t pt-4">
                    <h4 className="font-semibold mb-2">Comments:</h4>
                    {loadingComments ? (
                      <div className="flex justify-center items-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      </div>
                    ) : postComments.length > 0 ? (
                      <CommentsList 
                        postId={post.id} 
                        comments={postComments}
                      />
                    ) : (
                      <p className="text-gray-600">No comments yet.</p>
                    )}

                    {/* Add Comment */}
                    <div className="mt-4">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={commentTexts[post.id] || ''}
                          onChange={(e) => handleCommentChange(post.id, e.target.value)}
                          placeholder={user ? "Write a comment..." : "Sign in to comment"}
                          disabled={!user}
                          className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          disabled={!user || !commentTexts[post.id]?.trim()}
                          className={`px-4 py-2 rounded-md transition-colors ${
                            user && commentTexts[post.id]?.trim()
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          Comment
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                {userIsAdmin && (
                  <button
                    onClick={() => confirmDeletePost(post)}
                    className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center mt-6">
          <button
            onClick={handleLoadMore}
            disabled={isFetchingMore}
            className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${
              isFetchingMore ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isFetchingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {isModalOpen && postToDelete && (
        <ConfirmationModal
          title="Confirm Deletion"
          message={`Are you sure you want to delete "${postToDelete.title}"?`}
          onConfirm={handleDeletePost}
          onCancel={() => setIsModalOpen(false)}
        />
      )}

      {error && <div className="p-4 text-red-500 text-center">{error}</div>}
    </div>
  );
};

export default PostsList;
