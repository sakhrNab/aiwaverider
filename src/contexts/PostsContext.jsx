// src/contexts/PostsContext.jsx

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { getAllPosts as apiGetAllPosts, getPostById as apiGetPostById, API_URL } from '../utils/api';
import { AuthContext } from './AuthContext';

export const PostsContext = createContext();

export const PostsProvider = ({ children }) => {
  // Removed token extraction since Axios interceptor attaches it automatically.
  const [posts, setPosts] = useState(() => {
    const cached = localStorage.getItem('cachedPosts');
    return cached ? JSON.parse(cached) : [];
  });
  const [postDetails, setPostDetails] = useState(() => {
    const cached = localStorage.getItem('cachedPostDetails');
    return cached ? JSON.parse(cached) : {};
  });
  const [lastFetchTime, setLastFetchTime] = useState(() => {
    return parseInt(localStorage.getItem('lastFetchTime')) || null;
  });
  const [carouselData, setCarouselData] = useState(() => {
    const cached = localStorage.getItem('cachedCarouselData');
    return cached ? JSON.parse(cached) : {};
  });
  const [carouselLastFetch, setCarouselLastFetch] = useState(() => {
    return parseInt(localStorage.getItem('carouselLastFetch')) || null;
  });
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [errorPosts, setErrorPosts] = useState('');
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const [commentsCache, setCommentsCache] = useState(() => {
    const cached = localStorage.getItem('cachedComments');
    return cached ? JSON.parse(cached) : {};
  });
  const [commentsLastFetch, setCommentsLastFetch] = useState(() => {
    const cached = localStorage.getItem('commentsLastFetch');
    return cached ? JSON.parse(cached) : {};
  });
  const [loadingComments, setLoadingComments] = useState({});

  const isCacheValid = useCallback(() => {
    if (!lastFetchTime) return false;
    return Date.now() - lastFetchTime < CACHE_DURATION;
  }, [lastFetchTime]);

  const fetchAllPosts = useCallback(
    async (category = 'All', limit = 10, lastPostDate = null, force = false) => {
      if (!force && isCacheValid()) {
        const filteredPosts = posts
          .filter((post) => category === 'All' || post.category === category)
          .slice(0, limit);
        const uniquePosts = Array.from(
          new Map(filteredPosts.map(post => [post.id, post])).values()
        );
        return uniquePosts;
      }
      try {
        setLoadingPosts(true);
        setErrorPosts('');
        const data = await apiGetAllPosts(category, limit, lastPostDate);
        const postsWithComments = Array.isArray(data.posts)
          ? data.posts.map(post => ({
              ...post,
              comments: Array.isArray(post.comments) ? post.comments : []
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
    [isCacheValid, posts]
  );

  const getPostById = useCallback(
    async (postId, force = false) => {
      if (!force && postDetails[postId]) {
        return postDetails[postId];
      }
      try {
        const data = await apiGetPostById(postId);
        if (data) {
          setPostDetails(prev => ({ ...prev, [postId]: data }));
          setPosts(prev => prev.map(p => (p.id === postId ? data : p)));
        }
        return data;
      } catch (error) {
        console.error('Error fetching post by ID:', error);
        throw error;
      }
    },
    [postDetails]
  );

  const getComments = useCallback(async (postId, force = false) => {
    try {
      setLoadingComments(prev => ({ ...prev, [postId]: true }));
      if (force || !commentsCache[postId]) {
        // Use Axios by manually calling fetch here if needed.
        const response = await fetch(`${API_URL}/api/posts/${postId}/comments`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        if (!response.ok) {
          throw new Error('Failed to fetch comments');
        }
        const comments = await response.json();
        setCommentsCache(prev => ({
          ...prev,
          [postId]: comments
        }));
        return comments;
      }
      return commentsCache[postId];
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }));
    }
  }, [commentsCache]);

  const addCommentToCache = useCallback((postId, newComment) => {
    const commentsToAdd = Array.isArray(newComment) ? newComment : [newComment];
    setCommentsCache(prev => {
      const existingComments = prev[postId] || [];
      const newComments = commentsToAdd.filter(comment => 
        !existingComments.some(existing => existing.id === comment.id)
      );
      return {
        ...prev,
        [postId]: [...newComments, ...existingComments]
      };
    });
    setPostDetails(prev => {
      if (!prev[postId]) return prev;
      return {
        ...prev,
        [postId]: {
          ...prev[postId],
          comments: [
            ...commentsToAdd,
            ...(prev[postId].comments || [])
          ]
        }
      };
    });
    setPosts(prevPosts =>
      prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: [
              ...commentsToAdd,
              ...(post.comments || [])
            ]
          };
        }
        return post;
      })
    );
  }, []);

  const updatePostInCache = useCallback((updatedPost) => {
    setPosts(prev =>
      prev.map(p => (p.id === updatedPost.id ? updatedPost : p))
    );
    setPostDetails(prev => ({ ...prev, [updatedPost.id]: updatedPost }));
  }, []);

  const removePostFromCache = useCallback((postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    setPostDetails(prev => {
      const { [postId]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const fetchCarouselData = useCallback(
    async (categories, force = false) => {
      const now = Date.now();
      if (!force && carouselLastFetch && now - carouselLastFetch < CACHE_DURATION) {
        console.log('Using cached carousel data');
        return carouselData;
      }

      try {
        setLoadingPosts(true);
        const categorySections = await Promise.all(
          categories.map(async (category) => {
            try {
              const posts = await fetchAllPosts(category, 5);
              return [category, posts || []];
            } catch (err) {
              console.error(`Error fetching posts for ${category}:`, err);
              return [category, []];
            }
          })
        );

        const newCarouselData = Object.fromEntries(categorySections);
        setCarouselData(newCarouselData);
        setCarouselLastFetch(now);
        localStorage.setItem('cachedCarouselData', JSON.stringify(newCarouselData));
        localStorage.setItem('carouselLastFetch', now.toString());
        return newCarouselData;
      } catch (err) {
        console.error('Error fetching carousel data:', err);
        return {};
      } finally {
        setLoadingPosts(false);
      }
    },
    [carouselLastFetch, carouselData, CACHE_DURATION, fetchAllPosts]
  );

  const addPostToCache = useCallback((newPost) => {
    setPosts(prev => [newPost, ...prev]);
    setPostDetails(prev => ({ ...prev, [newPost.id]: newPost }));
  }, []);

  const syncComments = useCallback(async (postId) => {
    try {
      const comments = await getComments(postId);
      if (Array.isArray(comments)) {
        addCommentToCache(postId, comments);
      }
    } catch (error) {
      console.error('Error syncing comments:', error);
    }
  }, [getComments, addCommentToCache]);

  const updateCommentInCache = useCallback((postId, updatedComment) => {
    setCommentsCache(prev => ({
      ...prev,
      [postId]: prev[postId]?.map(c => c.id === updatedComment.id ? updatedComment : c) || [updatedComment]
    }));
    setPostDetails(prev => {
      if (!prev[postId]) return prev;
      return {
        ...prev,
        [postId]: {
          ...prev[postId],
          comments: (prev[postId].comments || []).map(c => c.id === updatedComment.id ? updatedComment : c)
        }
      };
    });
    setPosts(prevPosts =>
      prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: (post.comments || []).map(c => c.id === updatedComment.id ? updatedComment : c)
          };
        }
        return post;
      })
    );
  }, []);

  const removeCommentFromCache = useCallback((postId, commentId) => {
    setCommentsCache(prev => ({
      ...prev,
      [postId]: (prev[postId] || []).filter(comment => comment.id !== commentId)
    }));
    setPostDetails(prev => {
      if (!prev[postId]) return prev;
      return {
        ...prev,
        [postId]: {
          ...prev[postId],
          comments: (prev[postId].comments || []).filter(comment => comment.id !== commentId)
        }
      };
    });
    setPosts(prevPosts =>
      prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: (post.comments || []).filter(comment => comment.id !== commentId)
          };
        }
        return post;
      })
    );
  }, []);

  const contextValue = useMemo(() => ({
    posts,
    postDetails,
    loadingPosts,
    errorPosts,
    removeCommentFromCache,
    setPosts,
    fetchAllPosts,
    getPostById,
    updatePostInCache,
    removePostFromCache,
    updateCommentInCache,
    carouselData,
    fetchCarouselData,
    getComments,
    commentsCache,
    addCommentToCache,
    loadingComments,
    addPostToCache,
    syncComments
  }), [
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
    syncComments,
    updateCommentInCache,
    removeCommentFromCache
  ]);

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
      localStorage.setItem('carouselLastFetch', carouselLastFetch.toString());
    }
  }, [carouselLastFetch]);

  useEffect(() => {
    localStorage.setItem('cachedComments', JSON.stringify(commentsCache));
  }, [commentsCache]);

  useEffect(() => {
    localStorage.setItem('commentsLastFetch', JSON.stringify(commentsLastFetch));
  }, [commentsLastFetch]);

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

  useEffect(() => {
    setPosts(prevPosts =>
      prevPosts.map(post => ({
        ...post,
        comments: commentsCache[post.id] || post.comments,
      }))
    );
  }, [commentsCache]);

  return (
    <PostsContext.Provider value={contextValue}>
      {children}
    </PostsContext.Provider>
  );
};

export default PostsContext;
