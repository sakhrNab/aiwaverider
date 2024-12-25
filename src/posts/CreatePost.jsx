// src/posts/CreatePost.jsx
import React, { useState, useContext } from 'react';
import { createPost } from '../utils/api';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import PostForm from './PostForm'; // Ensure correct import path

const CreatePost = () => {
  const [error, setError] = useState('');
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (formData) => {
    const postData = new FormData();
    postData.append('title', formData.title);
    postData.append('description', formData.description);
    postData.append('category', formData.category);
    postData.append('additionalHTML', formData.additionalHTML);
    postData.append('graphHTML', formData.graphHTML);
    if (formData.image) {
      postData.append('image', formData.image);
    }

    try {
      const data = await createPost(postData, token);
      if (data.post) {
        navigate(`/posts/${data.post.id}`);
      } else {
        setError(data.error || 'Failed to create post.');
      }
    } catch (err) {
      console.error('Create Post Error:', err);
      setError('An unexpected error occurred.');
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">Create a New Post</h2>
      <PostForm onSubmit={handleSubmit} />
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
};

export default CreatePost;
