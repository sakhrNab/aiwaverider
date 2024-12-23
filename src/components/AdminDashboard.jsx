// src/components/AdminDashboard.jsx

import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { getAllPosts, createPost, deletePost } from '../utils/api';
import ConfirmationModal from './ConfirmationModal'; // Existing component
import { CATEGORIES } from '../constants/categories';

const AdminDashboard = () => {
  const { user, token } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Trends',
    image: null,
  });
  const [error, setError] = useState('');
  const [postToDelete, setPostToDelete] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (user?.role !== 'admin') {
    return (
      <div className="p-4 text-red-600 font-bold">
        Unauthorized – Only Admins Can Access This Page
      </div>
    );
  }

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await getAllPosts(token);
        setPosts(data);
      } catch (err) {
        setError(err.message || 'Failed to fetch posts.');
      }
    };

    fetchPosts();
  }, [token]);

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image') {
      const file = files[0];
      if (file && file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image size should not exceed 5MB.');
        return;
      }
      setFormData({
        ...formData,
        image: file,
      });
      setError('');
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.category) {
      setError('Title, Description, and Category are required.');
      return;
    }

    const postData = new FormData();
    postData.append('title', formData.title);
    postData.append('description', formData.description);
    postData.append('category', formData.category);
    if (formData.image) {
      postData.append('image', formData.image);
    }

    try {
      const response = await createPost(postData, token);
      if (response.post) {
        setPosts([response.post, ...posts]);
        setFormData({
          title: '',
          description: '',
          category: 'Trends',
          image: null,
        });
        setError('');
      } else {
        setError(response.error || 'Failed to create post.');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setError('An unexpected error occurred while creating the post.');
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
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('An unexpected error occurred while deleting the post.');
    }
  };

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
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter post title"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter post description"
              rows="4"
              required
            ></textarea>
          </div>
          <div>
            <label className="block text-gray-700">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
                {CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-700">Image (Optional)</label>
            <input
              type="file"
              name="image"
              accept="image/*"
              onChange={handleInputChange}
              className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {formData.image && (
              <div className="mt-2">
                <p className="text-gray-700">Image Preview:</p>
                <img src={URL.createObjectURL(formData.image)} alt="Preview" className="h-40 w-full object-cover rounded-md" />
              </div>
            )}
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
                  <p className="text-sm text-gray-500 mt-2">Category: {post.category || 'Uncategorized'}</p>
                  {post.imageUrl && (
                    <img src={post.imageUrl} alt={post.title} className="mt-2 h-40 w-full object-cover rounded-md" loading="lazy"
    />
                  )}
                  <p className="text-sm text-gray-500">Created By: {post.createdByUsername || 'Unknown'}</p>
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
}
export default AdminDashboard;
