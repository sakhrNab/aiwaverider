// src/posts/PostsList.jsx
import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { PostsContext } from '../contexts/PostsContext';
import { addComment, deletePost, getAllPosts } from '../utils/api';
import ConfirmationModal from '../components/ConfirmationModal';
import { auth } from '../utils/firebase';

const PostsList = () => {
  const { posts, setPosts, fetchAllPosts, loadingPosts, errorPosts } = useContext(PostsContext);
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

  useEffect(() => {
    const loadPosts = async () => {
      try {
        await fetchAllPosts(selectedCategory, 10);
      } catch (err) {
        setError(err.message);
      }
    };
    loadPosts();
  }, [selectedCategory, fetchAllPosts]);

  // Load more posts
  const handleLoadMore = async () => {
    if (!hasMore) return;
    setIsFetchingMore(true);
    try {
      const data = await getAllPosts(selectedCategory, 10, lastPostCreatedAt, token);
      setPosts((prev) => [...prev, ...data.posts]);
      setLastPostCreatedAt(data.lastPostCreatedAt);
      if (data.posts.length < 10) {
        setHasMore(false);
      }
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
    const commentText = commentTexts[postId];
    if (!commentText || commentText.trim() === '') {
      alert('Comment cannot be empty.');
      return;
    }
    try {
    // 2. Check authentication state
    const currentUser = auth.currentUser;
    if (!currentUser) {
      const shouldLogin = confirm('You need to sign in to comment. Sign in now?');
      if (shouldLogin) {
        await signInWithRedirect(auth, yourAuthProvider); // Update with your auth provider
      }
      return;
    }
      const data = await addComment(postId, { commentText: commentText.trim() });

  
      if (data.comment) {
        setPosts(prevPosts => prevPosts.map(post => 
          post.id === postId ? {
            ...post,
            comments: [...(post.comments || []), data.comment]
          } : post
        ));
        setCommentTexts(prev => ({ ...prev, [postId]: '' }));
      }
    } catch (err) {
      console.error('Error adding comment:', err);
      alert('An unexpected error occurred while adding the comment.');
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
      const data = await deletePost(postToDelete.id, token);
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
          
          return (
            <div key={`post-${postId}`} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-semibold mb-2">{post.title}</h3>
                  <p className="text-gray-700">{post.description}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Category: {post.category || 'Uncategorized'}
                  </p>
                  {post.imageUrl && (
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="mt-2 h-40 w-full object-cover rounded-md"
                    />
                  )}
                  <p className="text-sm text-gray-500">
                    Created By: {post.createdByUsername || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Created At: {formatDate(post.createdAt)}
                  </p>
                </div>
                {role === 'admin' && (
                  <button
                    onClick={() => confirmDeletePost(post)}
                    className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>

              {/* Comments */}
              <div className="mt-4">
                <h4 className="font-semibold">Comments:</h4>
                {Array.isArray(post.comments) ? (
                  post.comments.length === 0 ? (
                    <p className="text-gray-600">No comments yet.</p>
                  ) : (
                    <ul className="space-y-2 mt-2">
                      {post.comments.map((comment, commentIndex) => (
                        <li key={`comment-${comment.id}-${commentIndex}`} className="border-t pt-2">
                          <strong className="text-gray-800">
                            {comment.username} ({comment.userRole}):
                          </strong>{' '}
                          {comment.text}
                        </li>
                      ))}
                    </ul>
                  )
                ) : post.comments === undefined  ? (
                  <p className="text-gray-600">{post.comments}Loading comments...</p>
                ) : (
                  <p className="text-gray-600">Error loading comments.</p>
                )}
              </div>

              {/* Add Comment if logged in */}
              {user && (
                <div className="mt-4">
                  <input
                    type="text"
                    value={commentTexts[post.id] || ''}
                    onChange={(e) => handleCommentChange(post.id, e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => handleAddComment(post.id)}
                    className="mt-2 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Comment
                  </button>
                </div>
              )}
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
