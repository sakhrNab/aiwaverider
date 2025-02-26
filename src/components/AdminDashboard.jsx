// src/components/AdminDashboard.jsx

import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { getAllPosts, deletePost } from '../utils/api'; // Only need these calls
import ConfirmationModal from './ConfirmationModal';
import { Link, useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../constants/categories';
import { PostsContext } from '../contexts/PostsContext';

const AdminDashboard = () => {
  // Move auth check before any hooks or effects
  const { user, token } = useContext(AuthContext);
  
  // Immediate return if not admin
  if (!user?.role === 'admin') {
    return (
      <div className="p-4 text-red-600 font-bold">
        Unauthorized – Only Admins Can Access This Page
      </div>
    );
  }

  const {
    posts,
    fetchAllPosts,
    loadingPosts,
    errorPosts,
    removePostFromCache,
  } = useContext(PostsContext);

  // State declarations
  const [viewMode, setViewMode] = useState('posts');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [postToDelete, setPostToDelete] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const navigate = useNavigate();

  // Single useEffect for initial load
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        await fetchAllPosts('All', 10);
      } catch (err) {
        if (mounted) {
          setError(err.message);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [fetchAllPosts]);

  // Create a function to deduplicate posts
  const getUniquePosts = (posts) => {
    const seen = new Set();
    return posts.filter(post => {
      const duplicate = seen.has(post.id);
      seen.add(post.id);
      return !duplicate;
    });
  };

  // Filter posts and ensure uniqueness
  const getFilteredPosts = () => {
    const filtered = posts.filter((post) => {
      if (categoryFilter !== 'All' && post.category !== categoryFilter) {
        return false;
      }
      const lowerSearch = searchTerm.toLowerCase();
      const inTitle = post.title?.toLowerCase().includes(lowerSearch);
      const inId = post.id?.toLowerCase().includes(lowerSearch);
      return inTitle || inId;
    });

    return getUniquePosts(filtered);
  };

  // Get unique posts once
  const uniqueFilteredPosts = getFilteredPosts();

  // -------------- Create New Post (No DB Call) --------------
  const handleCreateNewPost = () => {
    // Just navigate to an empty PostDetail or a separate route
    // E.g. /posts/create or /admin/create-post
    // We'll do /posts/create if your PostDetail handles "create" mode
    navigate('/posts/create');
  };

  // -------------- Delete Post --------------
  const confirmDeletePost = (post) => {
    setPostToDelete(post);
    setIsModalOpen(true);
  };

  const handleDeletePost = async () => {
    if (!postToDelete) return;
    try {
      const data = await deletePost(postToDelete.id, token);
      if (data.success) {
        removePostFromCache(postToDelete.id);
        setIsModalOpen(false);
        setPostToDelete(null);
        setSuccessMessage('Post deleted successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        alert(data.error || 'Failed to delete post.');
      }
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('An unexpected error occurred while deleting the post.');
    }
  };

  // -------------- Format Date --------------
  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    const d = new Date(isoString);
    return d.toLocaleString();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Admin Dashboard</h1>

      {successMessage && (
        <p className="text-green-600 text-center font-semibold mb-4">
          {successMessage}
        </p>
      )}
      {error && <p className="text-red-500 text-center">{error}</p>}

      {/* Top Buttons to Toggle Between "Users" and "Posts" */}
      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={() => setViewMode('posts')}
          className={`px-4 py-2 rounded-md ${
            viewMode === 'posts'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-300 text-gray-700'
          }`}
        >
          Show Posts
        </button>
        <button
          onClick={() => setViewMode('users')}
          className={`px-4 py-2 rounded-md ${
            viewMode === 'users'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-300 text-gray-700'
          }`}
        >
          Show Users
        </button>
      </div>

      {/* If "users" is selected, just show a placeholder */}
      {viewMode === 'users' && (
        <div className="text-center p-4">
          <h2 className="text-xl font-semibold mb-2">Users List</h2>
          <p className="text-gray-600">Placeholder for now. (No DB calls.)</p>
        </div>
      )}

      {/* If "posts" is selected, show the posts interface */}
      {viewMode === 'posts' && (
        <div>
          {/* Row with "Create Post" plus local search + category filter */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
            {/* Create button */}
            <button
              onClick={handleCreateNewPost}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Create New Post
            </button>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search by title or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded-md"
            />

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="p-2 border border-gray-300 rounded-md"
            >
              <option value="All">All</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Posts List in 3-column grid */}
      {uniqueFilteredPosts.length === 0 ? (
            <p className="text-gray-600 text-center">
              No posts match your filter/search.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {uniqueFilteredPosts.map((post, index) => (
                <div
                  key={`${post.id}-${index}`}
                  postId={post.id}
                  user={user}
                  disableRealtime={true} // Disable real-time listener here
                  className="p-4 border border-gray-200 rounded-md shadow-sm hover:shadow-md flex flex-col"
                >
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-blue-700 mb-1 line-clamp-1">
                      {post.title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                      {post.description}
                    </p>
                    {post.imageUrl && (
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="mt-2 h-32 w-full object-cover rounded-md"
                      />
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Category: {post.category || 'Uncategorized'}
                    </p>
                    <p className="text-xs text-gray-400">
                      Created By: {post.createdByUsername || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-400">
                      Created At: {formatDate(post.createdAt)}
                    </p>
                  </div>

                  {/* Buttons row */}
                  <div className="mt-4 flex justify-between">
                    {/* Edit navigates to PostDetail */}
                    <button
                      onClick={() => navigate(`/posts/${post.id}`)}
                      className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => confirmDeletePost(post)}
                      className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

export default AdminDashboard;
