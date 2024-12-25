// AdminDashboard.jsx

import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { getAllPosts, createPost, deletePost } from '../utils/api'; // Import necessary API functions

const AdminDashboard = () => {
  const { user, token } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

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

  // Delete a post
  const handleDeletePost = async (postId) => {
    try {
      const data = await deletePost(postId, token);
      if (data.success) {
        setPosts(posts.filter((post) => post.id !== postId));
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
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Create a New Post</h2>
        <form onSubmit={handleCreatePost} className="space-y-4">
          <input
            type="text"
            value={title}
            placeholder="Title"
            onChange={(e) => setTitle(e.target.value)}
            className="block w-full p-2 border border-gray-300 mb-2 rounded-md"
          />
          <textarea
            value={description}
            placeholder="Description"
            onChange={(e) => setDescription(e.target.value)}
            className="block w-full p-2 border border-gray-300 mb-2 rounded-md"
          />
          {error && <p className="text-red-500">{error}</p>}
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Post
          </button>
        </form>
      </div>

      {/* Post list */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Posts</h2>
        {posts.length === 0 && <p>No posts yet.</p>}
        {posts.map((post) => (
          <div key={post.id} className="border p-4 mb-2 rounded-md">
            <h3 className="font-bold">{post.title}</h3>
            <p>{post.description}</p>
            <p className="text-sm text-gray-600">Created By: {post.createdBy || 'Unknown'}</p>
            <p className="text-sm text-gray-600">Created At: {formatDate(post.createdAt)}</p>
            <button
              onClick={() => handleDeletePost(post.id)}
              className="mt-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
