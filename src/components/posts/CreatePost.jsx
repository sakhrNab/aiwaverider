// src/components/posts/CreatePost.jsx

import React, { useState, useContext } from 'react';
import { createPost } from '../../api/content/postApi';
import { AuthContext } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import RichTextEditor from '../editor/RichTextEditor'; 
import DOMPurify from 'dompurify';
import { CATEGORIES } from '../../constants/categories';
import { PostsContext } from '../../contexts/PostsContext';
import { auth } from '../../utils/firebase'; 

const CreatePost = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Trends',
    image: null,
    additionalHTML: '',
    graphHTML: '',
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const { addPostToCache } = useContext(PostsContext);
  
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

  const handleEditorChange = (field, html) => {
    setFormData((prev) => ({
      ...prev,
      [field]: html,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if user is authenticated and admin
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError('You must be logged in to create a post.');
      return;
    }

    // const idTokenResult = await currentUser.getIdTokenResult();
    // console.log('currentUser', currentUser);
    // console.log('idTokenResult', idTokenResult);
// console.log('idTokenResult.claims.role', idTokenResult.claims.role);
    try {
      //  Get the ID token and check claims
        if (user.role !== 'admin') {
setError('Only admins can create posts.');
        return;
      }
    } catch (error) {
      console.log('Error fetching To: ', error);
      setError('Authentication Error');
    }

    if (!formData.title || !formData.description || !formData.category) {
      setError('Title, Description, and Category are required.');
      return;
    }

    // Sanitize HTML
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
  console.log('Create Post Response2', response.post);
      if (response.post) {
        console.log('Post created successfully:', response.post);
        addPostToCache(response.post);
        setSuccessMessage('Post created successfully!');
        setFormData({
          title: '',
          description: '',
          category: 'Trends',
          image: null,
          additionalHTML: '',
          graphHTML: '',
        });
        setError('');

        setTimeout(() => {
          navigate(`/posts/${response.post.id}`);
        }, 1500);
      } else {
        setError(response.error || 'Failed to create post.');
      }
    } catch (err) {
      console.error('Create Post Error:', err);
      setError('An unexpected error occurred.');
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">Create a New Post</h2>
      {successMessage && (
        <p className="text-green-600 text-center font-semibold mb-4">
          {successMessage}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <label className="block text-gray-700">Image (Optional)</label>
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
        </div>

        {/* Additional HTML - RichTextEditor */}
        <div>
          <label className="block text-gray-700">Additional Content (Optional)</label>
          <RichTextEditor
            content={formData.additionalHTML}
            onChange={(html) => handleEditorChange('additionalHTML', html)}
          />
        </div>

        {/* Error Message */}
        {error && <p className="text-red-500">{error}</p>}

        {/* Submit */}
        <button
          type="submit"
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Create Post
        </button>
      </form>
    </div>
  );
};

export default CreatePost;
