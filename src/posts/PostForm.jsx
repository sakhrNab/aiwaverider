// src/posts/PostForm.jsx
import React, { useState } from 'react';
import MyEditor from '../components/MyEditor'; // Import your TipTap editor

const PostForm = ({ onSubmit, initialData }) => {
  const [formData, setFormData] = useState(initialData || {
    title: '',
    description: '',
    category: 'Trends',
    additionalHTML: '',
    graphHTML: '',
    image: null,
  });

  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image') {
      setFormData({
        ...formData,
        image: files[0],
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleEditorChange = (field, html) => {
    setFormData({
      ...formData,
      [field]: html,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validate required fields
    if (!formData.title || !formData.description || !formData.category) {
      setError('Title, Description, and Category are required.');
      return;
    }
    setError('');
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-gray-700">Title</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
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
          onChange={handleChange}
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
          onChange={handleChange}
          className="mt-1 w-full p-2 border border-gray-300 rounded-md"
          required
        >
          {/* Populate categories dynamically or statically */}
          <option value="Trends">Trends</option>
          <option value="Latest Tech">Latest Tech</option>
          <option value="AI Tools">AI Tools</option>
          {/* Add more categories as needed */}
        </select>
      </div>

      {/* Image */}
      <div>
        <label className="block text-gray-700">
          Image {initialData ? '(Leave blank to keep existing)' : '(Optional)'}
        </label>
        <input
          type="file"
          name="image"
          accept="image/*"
          onChange={handleChange}
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

      {/* Additional HTML */}
      <div>
        <label className="block text-gray-700">Additional HTML (Optional)</label>
        <MyEditor 
          content={formData.additionalHTML}
          onChange={(html) => handleEditorChange('additionalHTML', html)}
        />
      </div>

      {/* Graph HTML */}
      <div>
        <label className="block text-gray-700">Graph HTML (Optional)</label>
        <MyEditor 
          content={formData.graphHTML}
          onChange={(html) => handleEditorChange('graphHTML', html)}
        />
      </div>

      {/* Error Message */}
      {error && <p className="text-red-500">{error}</p>}

      {/* Submit Button */}
      <button
        type="submit"
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        {initialData ? 'Update Post' : 'Create Post'}
      </button>
    </form>
  );
};

export default PostForm;
