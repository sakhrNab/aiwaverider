// src/components/AdminDashboard.jsx

import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { getAllPosts, createPost, deletePost } from '../utils/api';
import ConfirmationModal from './ConfirmationModal'; // New component for confirmation

const AdminDashboard = () => {
  const { user, token } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [postToDelete, setPostToDelete] = useState(null); // State to hold the post to delete
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal visibility

  // If user is not admin, show unauthorized
  if (user?.role !== 'admin') {
    return (
      <div className="p-4 text-red-600 font-bold">
        Unauthorized – Only Admins Can Access This Page
      </div>
    );
  }

  useEffect(() => {
    // Fetch all posts from backend
    const fetchPosts = async () => {
      const data = await getAllPosts();
      setPosts(data);
    };

    fetchPosts();
  }, []);

  // Create a new post
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!title || !description) {
      setError('Title and Description are required.');
      return;
    }

    const postData = {
      title,
      description,
    };

    const data = await createPost(postData, token);
    if (data.post) {
      setPosts([data.post, ...posts]); // Add new post to the top
      setTitle('');
      setDescription('');
      setError('');
    } else {
      setError(data.error || 'Failed to create post.');
    }
  };

  // Open confirmation modal
  const confirmDeletePost = (post) => {
    setPostToDelete(post);
    setIsModalOpen(true);
  };

  // Handle actual deletion after confirmation
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
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('An unexpected error occurred while deleting the post.');
    }
  };

  // Helper function to format ISO date strings
  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Admin Dashboard</h1>

      {/* Create Post Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Create a New Post</h2>
        <form onSubmit={handleCreatePost} className="space-y-4">
          <div>
            <label className="block text-gray-700">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter post title"
            />
          </div>
          <div>
            <label className="block text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter post description"
              rows="4"
            ></textarea>
          </div>
          {error && <p className="text-red-500">{error}</p>}
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Post
          </button>
        </form>
      </div>

      {/* Posts List */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Manage Posts</h2>
        {posts.length === 0 && <p className="text-gray-600">No posts available.</p>}
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="p-4 border border-gray-200 rounded-md shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold">{post.title}</h3>
                  <p className="text-gray-700 mt-2">{post.description}</p>
                  <p className="text-sm text-gray-500 mt-2">Created By: {post.createdBy || 'Unknown'}</p>
                  <p className="text-sm text-gray-500">Created At: {formatDate(post.createdAt)}</p>
                </div>
                <button
                  onClick={() => confirmDeletePost(post)}
                  className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
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

export default AdminDashboard;
