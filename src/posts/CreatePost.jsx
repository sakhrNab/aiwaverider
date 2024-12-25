// src/components/CreatePost.jsx

import React, { useState, useContext } from 'react';
import { createPost } from '../utils/api';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const CreatePost = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [error, setError] = useState('');
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await createPost(formData, token);
      if (data.post) {
        navigate('/');
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error('Create Post Error:', err);
      setError('An unexpected error occurred.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        name="title"
        value={formData.title}
        onChange={handleChange}
        placeholder="Post Title"
        required
      />
      <textarea
        name="description"
        value={formData.description}
        onChange={handleChange}
        placeholder="Post Description"
        required
      />
      {error && <p>{error}</p>}
      <button type="submit">Create Post</button>
    </form>
  );
};

export default CreatePost;
