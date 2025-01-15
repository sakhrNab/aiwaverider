// src/contexts/PostsContext.jsx

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  getAllPosts as apiGetAllPosts,
  getPostById as apiGetPostById,
  API_URL,
} from '../utils/api';
import { AuthContext } from './AuthContext';
import { fetchWithRetry } from '../utils/apiUtils.jsx';

export const PostsContext = createContext();

export const PostsProvider = ({ children }) => {
  const { token } = useContext(AuthContext);

  // State declarations
  const [posts, setPosts] = useState(() => {
    const cached = localStorage.getItem('cachedPosts');
    return cached ? JSON.parse(cached) : [];
  });
  const [postDetails, setPostDetails] = useState(() => {
    const cached = localStorage.getItem('cachedPostDetails');
    return cached ? JSON.parse(cached) : {};
  });

  // Last Fetch Time (for caching)
  const [lastFetchTime, setLastFetchTime] = useState(() => {
    return parseInt(localStorage.getItem('lastFetchTime')) || null;
  });

  // Carousel Data
  const [carouselData, setCarouselData] = useState(() => {
    const cached = localStorage.getItem('cachedCarouselData');
    return cached ? JSON.parse(cached) : {};
  });
  const [carouselLastFetch, setCarouselLastFetch] = useState(() => {
    return parseInt(localStorage.getItem('carouselLastFetch')) || null;
  });

  // Loading + Error States
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [errorPosts, setErrorPosts] = useState('');
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Comments Cache
  const [commentsCache, setCommentsCache] = useState(() => {
    const cached = localStorage.getItem('cachedComments');
    return cached ? JSON.parse(cached) : {};
  });
  const [commentsLastFetch, setCommentsLastFetch] = useState(() => {
    const cached = localStorage.getItem('commentsLastFetch');
    return cached ? JSON.parse(cached) : {};
  });
  // Track loading state for comments
  const [loadingComments, setLoadingComments] = useState({});

  // Utility: Check if cache is valid
  const isCacheValid = useCallback(() => {
    if (!lastFetchTime) return false;
    return Date.now() - lastFetchTime < CACHE_DURATION;
  }, [lastFetchTime]);

  // 1. Memoize fetchAllPosts using useCallback
  const fetchAllPosts = useCallback(
    async (category = 'All', limit = 10, lastPostDate = null, force = false) => {
      // If cache is valid and not forcing, return cached posts
      if (!force && isCacheValid()) {
        return posts
          .filter((post) => category === 'All' || post.category === category)
          .slice(0, limit);
      }

      if (!token) return;

      try {
        setLoadingPosts(true);
        setErrorPosts('');
        const data = await apiGetAllPosts(category, limit, lastPostDate, token);
        // Initialize posts with comments only if they exist
        const postsWithComments = Array.isArray(data.posts) 
          ? data.posts.map(post => ({
              ...post,
              // Only initialize comments array if post has comments
              comments: post.comments ? Array.isArray(post.comments) ? post.comments : [] : undefined
            }))
          : [];
        setPosts(postsWithComments);
        setLastFetchTime(Date.now());
      } catch (err) {
        console.error('Error fetching all posts (cached):', err);
        setErrorPosts(err.message || 'Failed to fetch posts.');
      } finally {
        setLoadingPosts(false);
      }
    },
    [token, isCacheValid, posts]
  );

  // 2. Memoize getPostById using useCallback
  const getPostById = useCallback(
    async (postId, force = false) => {
      if (!force && postDetails[postId]) {
        return postDetails[postId];
      }

      try {
        const data = await apiGetPostById(postId);
        if (data) {
          // Update single-post detail
          setPostDetails((prev) => ({ ...prev, [postId]: data }));
          // Also update in "all posts" array if it exists
          setPosts((prev) =>
            prev.map((p) => (p.id === postId ? data : p))
          );
        }
        return data;
      } catch (error) {
        console.error('Error fetching post by ID:', error);
        throw error;
      }
    },
    [postDetails]
  );

  // 3. Memoize getComments using useCallback
  const getComments = useCallback(
    async (postId, force = false) => {
      // 1. Check cache validity
      const isCommentsCacheValid =
        commentsLastFetch[postId] &&
        Date.now() - commentsLastFetch[postId] < CACHE_DURATION;

      // 2. Return cached data if valid and not forcing refresh
      if (!force && isCommentsCacheValid && commentsCache[postId]) {
        console.log('Returning cached comments for post:', postId);
        return commentsCache[postId];
      }

      // 3. Skip if already loading
      if (loadingComments[postId]) {
        console.log('Already loading comments for post:', postId);
        return commentsCache[postId] || [];
      }

      // 4. Fetch new data
      try {
        setLoadingComments((prev) => ({ ...prev, [postId]: true }));
        
        const response = await fetchWithRetry(
          `${API_URL}/api/posts/${postId}/comments`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const data = await response.json();
        const newComments = data.comments || [];

        // 5. Update cache with timestamp
        setCommentsCache((prev) => ({ ...prev, [postId]: newComments }));
        setCommentsLastFetch((prev) => ({ ...prev, [postId]: Date.now() }));

        return newComments;
      } catch (err) {
        console.error('Error fetching comments:', err);
        return commentsCache[postId] || [];
      } finally {
        setLoadingComments((prev) => ({ ...prev, [postId]: false }));
      }
    },
    [token, commentsCache, commentsLastFetch, loadingComments, CACHE_DURATION]
  );

  // 4. Memoize addCommentToCache using useCallback
  const addCommentToCache = useCallback((postId, newComment) => {
    setCommentsCache((prev) => {
      const existing = prev[postId] || [];
      // Prevent duplicate comments
      if (existing.some((c) => c.id === newComment.id)) {
        return prev;
      }
      return {
        ...prev,
        [postId]: [...existing, newComment],
      };
    });
  }, []);

  // 5. Memoize updatePostInCache using useCallback
  const updatePostInCache = useCallback((updatedPost) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
    );
    setPostDetails((prev) => ({ ...prev, [updatedPost.id]: updatedPost }));
  }, []);

  // 6. Memoize removePostFromCache using useCallback
  const removePostFromCache = useCallback((postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setPostDetails((prev) => {
      const { [postId]: removed, ...rest } = prev;
      return rest;
    });
    // Optionally, invalidate cache if needed
  }, []);

  // 7. Memoize fetchCarouselData using useCallback
  const fetchCarouselData = useCallback(
    async (categories, force = false) => {
      if (
        !force &&
        carouselLastFetch &&
        Date.now() - carouselLastFetch < CACHE_DURATION
      ) {
        return carouselData;
      }

      try {
        setLoadingPosts(true);
        const joinedCategories = categories.join(',');
        
        const response = await fetchWithRetry(
          `${API_URL}/api/posts/multi?categories=${encodeURIComponent(
            joinedCategories
          )}&limit=5`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const json = await response.json();
        if (!json.data) {
          throw new Error('Invalid response format from server');
        }

        setCarouselData(json.data);
        setCarouselLastFetch(Date.now());
        return json.data;
      } catch (err) {
        console.error('Error fetching carousel data:', err);
        // Return empty data structure instead of throwing
        return Object.fromEntries(categories.map((cat) => [cat, []]));
      } finally {
        setLoadingPosts(false);
      }
    },
    [carouselLastFetch, carouselData, token, CACHE_DURATION]
  );

  // 8. Memoize addPostToCache using useCallback
  const addPostToCache = useCallback((newPost) => {
    setPosts((prev) => [newPost, ...prev]);
    setPostDetails((prev) => ({ ...prev, [newPost.id]: newPost }));
  }, []);
  

  // 9. Memoize context value using useMemo
  const contextValue = useMemo(
    () => ({
      // Basic states
      posts,
      postDetails,
      loadingPosts,
      errorPosts,

      // Post getters/setters
      setPosts,
      fetchAllPosts,
      getPostById,
      updatePostInCache,
      removePostFromCache,

      // Carousel
      carouselData,
      fetchCarouselData,

      // Comments
      getComments,
      commentsCache,
      addCommentToCache,
      loadingComments,
      addPostToCache,
      // Additional functions can be added here
    }),
    [
      posts,
      postDetails,
      loadingPosts,
      errorPosts,
      fetchAllPosts,
      getPostById,
      updatePostInCache,
      removePostFromCache,
      carouselData,
      fetchCarouselData,
      getComments,
      commentsCache,
      addCommentToCache,
      loadingComments,
    ]
  );

  // 9. Sync State to Local Storage
  useEffect(() => {
    localStorage.setItem('cachedPosts', JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
    localStorage.setItem('cachedPostDetails', JSON.stringify(postDetails));
  }, [postDetails]);

  useEffect(() => {
    if (lastFetchTime) {
      localStorage.setItem('lastFetchTime', lastFetchTime.toString());
    }
  }, [lastFetchTime]);

  useEffect(() => {
    localStorage.setItem('cachedCarouselData', JSON.stringify(carouselData));
  }, [carouselData]);

  useEffect(() => {
    if (carouselLastFetch) {
      localStorage.setItem(
        'carouselLastFetch',
        carouselLastFetch.toString()
      );
    }
  }, [carouselLastFetch]);

  useEffect(() => {
    localStorage.setItem('cachedComments', JSON.stringify(commentsCache));
  }, [commentsCache]);

  useEffect(() => {
    localStorage.setItem(
      'commentsLastFetch',
      JSON.stringify(commentsLastFetch)
    );
  }, [commentsLastFetch]);

  // 10. Clear All Cache Method
  const clearAllCache = useCallback(() => {
    localStorage.removeItem('cachedPosts');
    localStorage.removeItem('cachedPostDetails');
    localStorage.removeItem('lastFetchTime');
    localStorage.removeItem('cachedCarouselData');
    localStorage.removeItem('carouselLastFetch');
    localStorage.removeItem('cachedComments');
    localStorage.removeItem('commentsLastFetch');

    setPosts([]);
    setPostDetails({});
    setLastFetchTime(null);
    setCarouselData({});
    setCarouselLastFetch(null);
    setCommentsCache({});
    setCommentsLastFetch({});
  }, []);

  return (
    <PostsContext.Provider value={contextValue}>
      {children}
    </PostsContext.Provider>
  );
};
