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
import { auth } from '../utils/firebase';

export const PostsContext = createContext();

const pendingRequests = new Map();

const fetchWithDeduplication = async (key, fetchFn) => {
  // If there's already a pending request for this key, return its promise
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  // Create new request promise
  const requestPromise = fetchFn().finally(() => {
    pendingRequests.delete(key);
  });

  // Store the promise
  pendingRequests.set(key, requestPromise);
  return requestPromise;
};

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
      const cacheKey = `posts_${category}_${limit}`;
      
      if (!force && isCacheValid()) {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData);
          if (Date.now() - timestamp < CACHE_DURATION) {
            const filteredPosts = data.filter((post) => 
              category === 'All' || post.category === category
            ).slice(0, limit);
            return filteredPosts;
          }
        }
      }

      try {
        setLoadingPosts(true);
        setErrorPosts('');
        const data = await apiGetAllPosts(category, limit, lastPostDate);
        
        if (data && data.posts) {
          const postsWithComments = data.posts.map(post => ({
            ...post,
            comments: Array.isArray(post.comments) ? post.comments : []
          }));
          
          // Cache the data with timestamp
          localStorage.setItem(cacheKey, JSON.stringify({
            data: postsWithComments,
            timestamp: Date.now()
          }));
          
          setPosts(postsWithComments);
          setLastFetchTime(Date.now());
          return postsWithComments;
        }
        return [];
      } catch (err) {
        console.error('Error fetching posts:', err);
        setErrorPosts(err.message || 'Failed to fetch posts.');
        return [];
      } finally {
        setLoadingPosts(false);
      }
    },
    [isCacheValid]
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
    const cacheKey = `comments_${postId}`;
    
    try {
      if (!force && commentsCache[postId]) {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData);
          if (Date.now() - timestamp < CACHE_DURATION) {
            return data;
          }
        }
      }

      setLoadingComments(prev => ({ ...prev, [postId]: true }));
      
      const response = await fetch(`${API_URL}/api/posts/${postId}/comments`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      
      const comments = await response.json();
      
      // Cache the comments with timestamp
      localStorage.setItem(cacheKey, JSON.stringify({
        data: comments,
        timestamp: Date.now()
      }));
      
      setCommentsCache(prev => ({
        ...prev,
        [postId]: comments
      }));
      
      return comments;
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }));
    }
  }, [commentsCache, CACHE_DURATION]);

  const fetchBatchComments = useCallback(async (postIds, force = false) => {
    if (!postIds || postIds.length === 0) return {};
    
    const uniquePostIds = [...new Set(postIds)].slice(0, 50);
    const cacheKey = `batchComments_${uniquePostIds.sort().join('_')}`;
    
    return fetchWithDeduplication(cacheKey, async () => {
      try {
        // Check cache first
        if (!force) {
          const cachedData = localStorage.getItem(cacheKey);
          if (cachedData) {
            const { data, timestamp } = JSON.parse(cachedData);
            if (Date.now() - timestamp < CACHE_DURATION) {
              console.log('Using cached batch comments');
              Object.entries(data).forEach(([postId, comments]) => {
                setCommentsCache(prev => ({
                  ...prev,
                  [postId]: comments
                }));
              });
              return data;
            }
          }
        }

        const postsToFetch = force 
          ? uniquePostIds 
          : uniquePostIds.filter(id => {
              const lastFetchTime = commentsLastFetch[id];
              return !commentsCache[id] || !lastFetchTime || Date.now() - lastFetchTime >= CACHE_DURATION;
            });

        if (postsToFetch.length === 0) {
          console.log('All comments are in cache');
          return uniquePostIds.reduce((acc, id) => ({
            ...acc,
            [id]: commentsCache[id] || []
          }), {});
        }

        setLoadingComments(prev => 
          postsToFetch.reduce((acc, id) => ({ ...acc, [id]: true }), prev)
        );

        const currentUser = auth.currentUser;
        const token = currentUser ? await currentUser.getIdToken() : null;
        
        const response = await fetch(
          `${API_URL}/api/posts/comments/batch?postIds=${postsToFetch.join(',')}`,
          {
            method: 'GET',
            headers: { 
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` })
            },
            credentials: 'include'
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch batch comments: ${response.status}`);
        }

        const newCommentsMap = await response.json();
        
        const mergedCommentsMap = uniquePostIds.reduce((acc, id) => ({
          ...acc,
          [id]: force ? newCommentsMap[id] : (newCommentsMap[id] || commentsCache[id] || [])
        }), {});
        
        localStorage.setItem(cacheKey, JSON.stringify({
          data: mergedCommentsMap,
          timestamp: Date.now()
        }));

        const now = Date.now();
        setCommentsCache(prev => ({
          ...prev,
          ...mergedCommentsMap
        }));
        setCommentsLastFetch(prev => 
          postsToFetch.reduce((acc, id) => ({ ...acc, [id]: now }), prev)
        );
        setLoadingComments(prev => 
          postsToFetch.reduce((acc, id) => ({ ...acc, [id]: false }), prev)
        );

        return mergedCommentsMap;
      } catch (error) {
        console.error('Error fetching batch comments:', error);
        setLoadingComments(prev => 
          postsToFetch.reduce((acc, id) => ({ ...acc, [id]: false }), prev)
        );
        return uniquePostIds.reduce((acc, id) => ({
          ...acc,
          [id]: commentsCache[id] || []
        }), {});
      }
    });
  }, [CACHE_DURATION, commentsCache, commentsLastFetch, API_URL]);

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
      const cacheKey = 'carouselData';
      
      return fetchWithDeduplication(`carousel_${force}`, async () => {
        try {
          // Check cache first
          if (!force) {
            const cachedData = localStorage.getItem(cacheKey);
            if (cachedData) {
              const { data, timestamp } = JSON.parse(cachedData);
              if (now - timestamp < CACHE_DURATION) {
                console.log('Using cached carousel data');
                setCarouselData(data);
                return data;
              }
            }
          }

          setLoadingPosts(true);
          console.log('Fetching fresh carousel data');

          // Fetch posts with optimized limit
          const response = await apiGetAllPosts('All', 20);
          if (!response || !response.posts) {
            throw new Error('Invalid response format from API');
          }

          const allPosts = response.posts;
          setPosts(allPosts);

          // Organize posts by category
          const newCarouselData = {};
          const visiblePostIds = new Set();

          if (!Array.isArray(categories)) {
            categories = ['All'];
          }

          // Process each category
          categories.forEach(category => {
            if (!category) return;
            
            const categoryPosts = allPosts
              .filter(post => post.category === category)
              .slice(0, 5);
            
            if (categoryPosts.length > 0) {
              newCarouselData[category] = categoryPosts;
              categoryPosts.forEach(post => visiblePostIds.add(post.id));
            }
          });

          // If no categories have posts, add 'All' category
          if (Object.keys(newCarouselData).length === 0) {
            newCarouselData['All'] = allPosts.slice(0, 5);
            allPosts.slice(0, 5).forEach(post => visiblePostIds.add(post.id));
          }

          // Fetch comments for visible posts
          if (visiblePostIds.size > 0) {
            const commentsMap = await fetchBatchComments([...visiblePostIds], force);
            
            Object.keys(newCarouselData).forEach(category => {
              newCarouselData[category] = newCarouselData[category].map(post => ({
                ...post,
                comments: commentsMap[post.id] || []
              }));
            });
          }

          // Cache the results
          const cacheData = {
            data: newCarouselData,
            timestamp: now
          };
          
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
          setCarouselData(newCarouselData);
          setCarouselLastFetch(now);
          
          return newCarouselData;
        } catch (err) {
          console.error('Error fetching carousel data:', err);
          const cachedData = localStorage.getItem(cacheKey);
          if (cachedData) {
            const { data } = JSON.parse(cachedData);
            setCarouselData(data);
            return data;
          }
          return {};
        } finally {
          setLoadingPosts(false);
        }
      });
    },
    [CACHE_DURATION, fetchBatchComments, apiGetAllPosts]
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
    syncComments,
    fetchBatchComments
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
    removeCommentFromCache,
    fetchBatchComments
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
