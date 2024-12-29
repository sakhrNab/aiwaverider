import React, { createContext, useState, useContext } from 'react';
import { getAllPosts } from '../utils/api';
import { AuthContext } from './AuthContext';

export const PostsContext = createContext();

export const PostsProvider = ({ children }) => {
  const { token } = useContext(AuthContext);

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState('');

  const fetchAllPosts = async (category = 'All', limit = 50, startAfter = null) => {
    if (!token) return;
    setLoadingPosts(true);
    setPostsError('');
    try {
      const data = await getAllPosts(category, limit, startAfter, token);
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch (err) {
      setPostsError(err.message || 'Failed to fetch posts.');
    } finally {
      setLoadingPosts(false);
    }
  };

  return (
    <PostsContext.Provider
      value={{
        posts,
        setPosts,
        loadingPosts,
        postsError,
        fetchAllPosts,
      }}
    >
      {children}
    </PostsContext.Provider>
  );
};
