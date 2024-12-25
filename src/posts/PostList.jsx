// src/posts/PostList.jsx

import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { API_URL, getAllPosts, addComment, deletePost } from '../utils/api';
import ConfirmationModal from '../components/ConfirmationModal';

const PostsList = () => {
  const { user, role, token } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [commentTexts, setCommentTexts] = useState({});
  const [postToDelete, setPostToDelete] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    const fetchPostsAndComments = async () => {
      try {
        let url = `${API_URL}/api/posts`;
        if (selectedCategory !== 'All') {
          url += `?category=${encodeURIComponent(selectedCategory)}`;
        }
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          // credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch posts.');
        }

        const postsData = await response.json();

        // Fetch comments for each post
        const postsWithComments = await Promise.all(
          postsData.map(async (post) => {
            const commentsResponse = await fetch(`${API_URL}/api/posts/${post.id}/comments`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (!commentsResponse.ok) {
              console.error(`Failed to fetch comments for post ${post.id}`);
              return { ...post, comments: [] };
            }

            const commentsData = await commentsResponse.json();
            return { ...post, comments: commentsData };
          })
        );

        setPosts(postsWithComments);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError(err.message || 'Failed to load posts. Please try again later.');
        setLoading(false);
      }
    };

    fetchPostsAndComments();
  }, [token, selectedCategory]);

  const handleCommentChange = (postId, text) => {
    setCommentTexts({
      ...commentTexts,
      [postId]: text,
    });
  };

  const handleAddComment = async (postId) => {
    const commentText = commentTexts[postId];
    if (!commentText || commentText.trim() === '') {
      alert('Comment cannot be empty.');
      return;
    }

    try {
      const commentData = { commentText: commentText.trim() };
      const data = await addComment(postId, commentData, token);
      if (data.comment) {
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? { ...post, comments: [...post.comments, data.comment] }
              : post
          )
        );
        setCommentTexts({
          ...commentTexts,
          [postId]: '',
        });
      } else {
        alert(data.error || 'Failed to add comment.');
      }
    } catch (err) {
      console.error('Error adding comment:', err);
      alert('An unexpected error occurred while adding the comment.');
    }
  };

  const confirmDeletePost = (post) => {
    setPostToDelete(post);
    setIsModalOpen(true);
  };

  const handleDeletePost = async () => {
    if (!postToDelete) return;

    try {
      const data = await deletePost(postToDelete.id, token);
      if (data.success) {
        setPosts(posts.filter((post) => post.id !== postToDelete.id));
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

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-16 w-16"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-center">Community Posts</h2>

      {/* Category Filter */}
      <div className="mb-6 flex justify-end">
        <label htmlFor="category" className="mr-2 text-gray-700">Filter by Category:</label>
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
          {/* Add more categories as needed */}
        </select>
      </div>

      {posts.length === 0 && (
        <p className="text-center text-gray-600">No posts available.</p>
      )}
      <div className="space-y-6">
        {posts.map((post) => (
          <div key={post.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-semibold mb-2">{post.title}</h3>
                <p className="text-gray-700">{post.description}</p>
                <p className="text-sm text-gray-500 mt-2">Category: {post.category || 'Uncategorized'}</p>
                {post.imageUrl && (
                  <img src={post.imageUrl} alt={post.title} className="mt-2 h-40 w-full object-cover rounded-md" />
                )}
                <p className="text-sm text-gray-500">Created By: {post.createdByUsername || 'Unknown'}</p>
                <p className="text-sm text-gray-500">Created At: {formatDate(post.createdAt)}</p>
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

            {/* Comments Section */}
            <div className="mt-4">
              <h4 className="font-semibold">Comments:</h4>
              {Array.isArray(post.comments) && post.comments.length === 0 ? (
                <p className="text-gray-600">No comments yet.</p>
              ) : (
                Array.isArray(post.comments) && (
                  <ul className="space-y-2 mt-2">
                    {post.comments.map((comment) => (
                      <li key={comment.id} className="border-t pt-2">
                        <strong className="text-gray-800">{comment.username} ({comment.userRole}):</strong> {comment.text}
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>

            {/* Add Comment Section */}
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
        ))}
      </div>

      {/* Confirmation Modal */}
      {isModalOpen && postToDelete && (
        <ConfirmationModal
          title="Confirm Deletion"
          message={`Are you sure you want to delete the post titled "${postToDelete.title}"? This action cannot be undone.`}
          onConfirm={handleDeletePost}
          onCancel={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default PostsList;
