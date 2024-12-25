import React, { useState } from 'react';

const PostForm = ({ onSubmit, initialData }) => {
  const [formData, setFormData] = useState(initialData || {
    title: '',
    description: ''
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        name="title"
        value={formData.title}
        onChange={handleChange}
        className="w-full p-2 border rounded"
        placeholder="Post Title"
      />
      <textarea
        name="description"
        value={formData.description}
        onChange={handleChange}
        className="w-full p-2 border rounded"
        placeholder="Post Description"
      />
      <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
        {initialData ? 'Update Post' : 'Create Post'}
      </button>
    </form>
  );
};

export default PostForm;