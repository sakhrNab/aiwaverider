import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { getAllPosts, createPost, deletePost, updatePost } from '../utils/api';
import ConfirmationModal from './ConfirmationModal'; // Ensure this exists
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { CATEGORIES } from '../constants/categories'; // Ensure this exists

const AdminDashboard = () => {
  const { user, token } = useContext(AuthContext);
  const [posts, setPosts] = useState([]); // Initialize as empty array
  const [error, setError] = useState('');
  const [postToDelete, setPostToDelete] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editPostId, setEditPostId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Trends',
    image: null,
    additionalHTML: '',
    graphHTML: '',
  });
  const [successMessage, setSuccessMessage] = useState('');

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
        // Correctly call getAllPosts with category, limit, startAfter, and token
        const data = await getAllPosts('All', 50, null, token);
        console.log('Fetched Posts Data:', data); // Debugging statement
        setPosts(Array.isArray(data.posts) ? data.posts : []);
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
      setFormData((prev) => ({ ...prev, image: file }));
      setError('');
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handles the HTML output from TipTap
  const handleEditorChange = (field, htmlString) => {
    setFormData((prev) => ({
      ...prev,
      [field]: htmlString,
    }));
  };

  // ------------------ Create Post ------------------
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.category) {
      setError('Title, Description, and Category are required.');
      return;
    }

    // Sanitize the HTML before sending
    const sanitizedAdditionalHTML = DOMPurify.sanitize(formData.additionalHTML);
    const sanitizedGraphHTML = DOMPurify.sanitize(formData.graphHTML);

    const postData = new FormData();
    postData.append('title', formData.title);
    postData.append('description', formData.description);
    postData.append('category', formData.category);
    postData.append('additionalHTML', sanitizedAdditionalHTML);
    postData.append('graphHTML', sanitizedGraphHTML);

    if (formData.image) {
      postData.append('image', formData.image);
    }

    try {
      const response = await createPost(postData, token);
      console.log('Create Post Response:', response); // Debugging statement
      if (response.post) {
        setPosts((prev) => [response.post, ...prev]);
        setFormData({
          title: '',
          description: '',
          category: 'Trends',
          image: null,
          additionalHTML: '',
          graphHTML: '',
        });
        setError('');
        // Set success message
        setSuccessMessage('Post created successfully!');

        // Clear the success message after some seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);

      } else {
        setError(response.error || 'Failed to create post.');
      }
    } catch (err) {
      console.error('Error creating post:', err);
      setError('An unexpected error occurred while creating the post.');
    }
  };

  // ------------------ Edit Post ------------------
  const handleEditPost = (post) => {
    setEditPostId(post.id);
    setFormData({
      title: post.title || '',
      description: post.description || '',
      category: post.category || 'Trends',
      image: null, // Clear existing image (unless you want to keep it)
      additionalHTML: post.additionalHTML || '',
      graphHTML: post.graphHTML || '',
    });
    setError('');
  };

  // ------------------ Update Post ------------------
  const handleUpdatePost = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.category) {
      setError('Title, Description, and Category are required.');
      return;
    }

    const sanitizedAdditionalHTML = DOMPurify.sanitize(formData.additionalHTML);
    const sanitizedGraphHTML = DOMPurify.sanitize(formData.graphHTML);

    const updatedData = new FormData();
    updatedData.append('title', formData.title);
    updatedData.append('description', formData.description);
    updatedData.append('category', formData.category);
    updatedData.append('additionalHTML', sanitizedAdditionalHTML);
    updatedData.append('graphHTML', sanitizedGraphHTML);

    if (formData.image) {
      updatedData.append('image', formData.image);
    }

    try {
      const response = await updatePost(editPostId, updatedData, token);
      console.log('Update Post Response:', response); // Debugging statement
      if (response.message) {
        // Re-fetch updated post
        const refreshed = await getPostById(editPostId);
        setPost(refreshed);
        setPosts((prevPosts) =>
          prevPosts.map((p) =>
            p.id === editPostId
              ? {
                  ...p,
                  title: formData.title,
                  description: formData.description,
                  category: formData.category,
                  additionalHTML: sanitizedAdditionalHTML,
                  graphHTML: sanitizedGraphHTML,
                  imageUrl: formData.image
                    ? URL.createObjectURL(formData.image)
                    : p.imageUrl,
                }
              : p
          )
        );
        setEditPostId(null);
        setFormData({
          title: '',
          description: '',
          category: 'Trends',
          image: null,
          additionalHTML: '',
          graphHTML: '',
        });
        setError('');
        // Set success message
        setSuccessMessage('Post updated successfully!');
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } else {
        setError(response.error || 'Failed to update post.');
      }
    } catch (err) {
      console.error('Error updating post:', err);
      setError('An unexpected error occurred while updating the post.');
    }
  };

  // ------------------ Delete Post ------------------
  const confirmDeletePost = (post) => {
    setPostToDelete(post);
    setIsModalOpen(true);
  };

  const handleDeletePost = async () => {
    if (!postToDelete) return;
    try {
      const data = await deletePost(postToDelete.id, token);
      console.log('Delete Post Response:', data); // Debugging statement
      if (data.success) {
        setPosts((prev) => prev.filter((p) => p.id !== postToDelete.id));
        setIsModalOpen(false);
        setPostToDelete(null);
        setSuccessMessage('Post deleted successfully!');
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } else {
        alert(data.error || 'Failed to delete post.');
      }
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('An unexpected error occurred while deleting the post.');
    }
  };

  // Helper to format ISO date
  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Admin Dashboard</h1>
      
      {successMessage && (
        <p className="text-green-600 text-center font-semibold mb-4">{successMessage}</p>
      )}

      {/* Create or Edit Post */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">
          {editPostId ? 'Edit Post' : 'Create a New Post'}
        </h2>
        <form
          onSubmit={editPostId ? handleUpdatePost : handleCreatePost}
          className="space-y-4"
        >
          {/* Title */}
          <div>
            <label className="block text-gray-700">Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="mt-1 w-full p-2 border border-gray-300 rounded-md"
              placeholder="Enter post title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-gray-700">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="mt-1 w-full p-2 border border-gray-300 rounded-md"
              placeholder="Enter post description"
              rows="4"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-gray-700">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="mt-1 w-full p-2 border border-gray-300 rounded-md"
              required
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Image */}
          <div>
            <label className="block text-gray-700">
              Image {editPostId ? '(Leave blank to keep existing)' : '(Optional)'}
            </label>
            <input
              type="file"
              name="image"
              accept="image/*"
              onChange={handleInputChange}
              className="mt-1 w-full p-2 border border-gray-300 rounded-md"
            />
            {formData.image && (
              <div className="mt-2">
                <p className="text-gray-700">Image Preview:</p>
                <img
                  src={URL.createObjectURL(formData.image)}
                  alt="Preview"
                  className="h-40 w-full object-cover rounded-md"
                />
              </div>
            )}
            {/* If editing, show existing image */}
            {editPostId && postToDelete?.imageUrl && !formData.image && (
              <div className="mt-2">
                <p className="text-gray-700">Current Image:</p>
                <img
                  src={postToDelete.imageUrl}
                  alt={postToDelete.title}
                  className="h-40 w-full object-cover rounded-md"
                />
              </div>
            )}
          </div>


          {/* Error Message */}
          {error && <p className="text-red-500">{error}</p>}

          {/* Submit Button */}
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {editPostId ? 'Update Post' : 'Create Post'}
          </button>

          {/* Cancel Edit Button */}
          {editPostId && (
            <button
              type="button"
              onClick={() => {
                setEditPostId(null);
                setFormData({
                  title: '',
                  description: '',
                  category: 'Trends',
                  image: null,
                  additionalHTML: '',
                  graphHTML: '',
                });
                setError('');
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          )}
        </form>
      </div>

      {/* Posts List */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Manage Posts</h2>
        {posts.length === 0 ? (
          <p className="text-gray-600">No posts available.</p>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div
                key={post.id}
                className="p-4 border border-gray-200 rounded-md shadow-sm hover:shadow-md flex flex-col"
              >
                <div className="flex-1">
                  <Link to={`/posts/${post.id}`}>
                    <h3 className="text-xl font-bold hover:text-blue-600">
                      {post.title}
                    </h3>
                  </Link>
                  <p className="text-gray-700 mt-2 line-clamp-3">
                    {post.description}
                  </p>
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

                {/* Delete button (admin only) */}
                <div className="mt-4 flex space-x-2">
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
