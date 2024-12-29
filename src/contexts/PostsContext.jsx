import React, { createContext, useState, useContext } from 'react';
import { getAllPosts as apiGetAllPosts, getPostById as apiGetPostById } from '../utils/api';
import { AuthContext } from './AuthContext';

/**
 * PostsContext has:
 *   - posts: array of all posts
 *   - fetchAllPosts: function to fetch N posts (cached)
 *   - getPostById: function to get a single post by ID (cached)
 *   - setPosts: setter for the post array if needed
 */
export const PostsContext = createContext();

export const PostsProvider = ({ children }) => {
  const { token } = useContext(AuthContext);

  // Cache for an array of "all" posts
  const [posts, setPosts] = useState([]);
  // Cache for "detail" post lookups, e.g. { 'postId123': {...}, 'postId456': {...} }
  const [postDetails, setPostDetails] = useState({});
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [errorPosts, setErrorPosts] = useState('');

  /**
   * Fetch all posts from API (if not cached yet), limited to 'limit' posts and optional category.
   * If `force` is true, we’ll re-fetch even if we have cached posts.
   */
  const fetchAllPosts = async (limit = 10, category = 'All', force = false) => {
    if (!token) return;
    try {
      // If we already have posts in memory and not forcing, skip
      if (!force && posts.length > 0) {
        return;
      }
      setLoadingPosts(true);
      setErrorPosts('');
      const data = await apiGetAllPosts(category, limit, null, token);
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch (err) {
      console.error('Error fetching all posts (cached):', err);
      setErrorPosts(err.message || 'Failed to fetch posts.');
    } finally {
      setLoadingPosts(false);
    }
  };

  /**
   * Get post details by ID (cached).
   * - If post detail is already in `postDetails[postId]`, return it immediately.
   * - Otherwise, fetch from DB, store in `postDetails`, and return it.
   */
  const getPostById = async (postId) => {
    // Check our local dictionary
    if (postDetails[postId]) {
      return postDetails[postId];
    }
    // Not in cache, fetch
    try {
      const data = await apiGetPostById(postId);
      if (data) {
        setPostDetails((prev) => ({ ...prev, [postId]: data }));
      }
      return data;
    } catch (error) {
      console.error('Error fetching post by ID (cached):', error);
      throw error;
    }
  };

  // We also store updated post details in the cache if we edit
  const updatePostInCache = (updatedPost) => {
    // Update all-posts array
    setPosts((prev) =>
      prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
    );
    // Also update single-post cache
    setPostDetails((prev) => ({ ...prev, [updatedPost.id]: updatedPost }));
  };

  return (
    <PostsContext.Provider
      value={{
        posts,
        setPosts,
        postDetails,
        loadingPosts,
        errorPosts,
        fetchAllPosts,
        getPostById,
        updatePostInCache,
      }}
    >
      {children}
    </PostsContext.Provider>
  );
};
