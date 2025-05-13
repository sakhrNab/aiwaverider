// src/contexts/PostsContext.jsx

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { getAllPosts as apiGetAllPosts, getPostById as apiGetPostById } from '../api/content/postApi';
import { API_URL, api } from '../api/core/apiConfig';
import { AuthContext } from './AuthContext';
import { toast } from 'react-toastify';

export const PostsContext = createContext();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 2 * 1024 * 1024; // 2MB limit for cache
const MAX_CACHE_ITEMS = 50; // Maximum number of cached items

// Allow overriding API_URL for development with local env variable
const BACKEND_URL = import.meta.env.VITE_OVERRIDE_API_URL || API_URL;

// Track API availability
let isApiAvailable = true;
let lastApiCheck = 0;
const API_CHECK_INTERVAL = 30000; // 30 seconds between availability checks

// Helper function to check if the API is available
const checkApiAvailability = async () => {
  // Don't check too frequently
  if (Date.now() - lastApiCheck < API_CHECK_INTERVAL) {
    return isApiAvailable;
  }
  
  // Set last check time
  lastApiCheck = Date.now();
  
  try {
    console.log(`[PostsContext] Checking API availability at ${BACKEND_URL}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${BACKEND_URL}/api/health`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      if (!isApiAvailable) {
        console.log('[PostsContext] API is now available');
        toast.success('Connection to server restored');
      }
      isApiAvailable = true;
    } else {
      if (isApiAvailable) {
        console.log('[PostsContext] API returned error status');
        toast.error('Connection to server lost');
      }
      isApiAvailable = false;
    }
  } catch (error) {
    console.error('[PostsContext] API availability check failed:', error);
    
    if (isApiAvailable) {
      toast.error('Unable to connect to server');
    }
    isApiAvailable = false;
  }
  
  return isApiAvailable;
};

// Helper function to get cache size
const getCacheSize = () => {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += (localStorage[key].length + key.length) * 2; // Approximate size in bytes
    }
  }
  return total;
};

// Helper function to clean old cache entries
const cleanCache = () => {
  const now = Date.now();
  const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('posts_'));
  
  // Sort by timestamp
  const sortedKeys = cacheKeys.map(key => {
    try {
      const item = JSON.parse(localStorage.getItem(key));
      return { key, timestamp: item.timestamp || 0 };
    } catch (e) {
      return { key, timestamp: 0 };
    }
  }).sort((a, b) => b.timestamp - a.timestamp);

  // Remove old entries
  sortedKeys.slice(MAX_CACHE_ITEMS).forEach(({ key }) => {
    localStorage.removeItem(key);
  });

  // Remove expired entries
  sortedKeys.forEach(({ key, timestamp }) => {
    if (now - timestamp > CACHE_DURATION) {
      localStorage.removeItem(key);
    }
  });
};

// Helper function to safely set cache
const safeSetCache = (key, value) => {
  try {
    // Clean cache if size exceeds limit
    if (getCacheSize() > MAX_CACHE_SIZE) {
      cleanCache();
    }
    
    const data = {
      value,
      timestamp: Date.now()
    };
    
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.warn('Cache storage failed:', error);
    // If still failing after cleanup, remove all cache
    if (error.name === 'QuotaExceededError') {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('posts_')) {
          localStorage.removeItem(key);
        }
      });
    }
    return false;
  }
};

// Helper function to safely get cache
const safeGetCache = (key) => {
  try {
    const data = localStorage.getItem(key);
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    if (Date.now() - parsed.timestamp > CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }
    
    return parsed.value;
  } catch (error) {
    console.warn('Cache retrieval failed:', error);
    return null;
  }
};

const pendingRequests = new Map();

const fetchWithDeduplication = async (key, fetchFn) => {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const promise = fetchFn().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
};

export const PostsProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
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

  const [commentsCache, setCommentsCache] = useState(() => {
    const cached = localStorage.getItem('cachedComments');
    return cached ? JSON.parse(cached) : {};
  });
  const [commentsLastFetch, setCommentsLastFetch] = useState(() => {
    const cached = localStorage.getItem('commentsLastFetch');
    return cached ? JSON.parse(cached) : {};
  });
  const [loadingComments, setLoadingComments] = useState({});

  const [requestsInProgress, setRequestsInProgress] = useState({});

  const isCacheValid = useCallback(() => {
    if (!lastFetchTime) return false;
    return Date.now() - lastFetchTime < CACHE_DURATION;
  }, [lastFetchTime]);

  const getCacheKey = useCallback((type, id) => {
    return `${type}_${id}_${user?.uid || 'anonymous'}`;
  }, [user]);

  const getFromCache = useCallback((type, id) => {
    const key = getCacheKey(type, id);
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
      // Clear expired cache
      localStorage.removeItem(key);
    }
    return null;
  }, [getCacheKey]);

  const setInCache = useCallback((type, id, data) => {
    const key = getCacheKey(type, id);
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  }, [getCacheKey]);

  const clearCache = useCallback((type, id) => {
    if (id) {
      localStorage.removeItem(getCacheKey(type, id));
    } else {
      // Clear all cache of this type
      Object.keys(localStorage)
        .filter(key => key.startsWith(`${type}_`))
        .forEach(key => localStorage.removeItem(key));
    }
  }, [getCacheKey]);

  const fetchAllPosts = useCallback(async (category = 'All', limit = 10, startAfter = null, force = false) => {
      try {
        setLoadingPosts(true);
      setErrorPosts(null);

      const cacheKey = `posts_${category}_${limit}_${startAfter || 'start'}`;
      
      // Check cache first unless force refresh is requested
      if (!force) {
        const cachedPosts = getFromCache('posts', cacheKey);
        if (cachedPosts) {
          setPosts(cachedPosts);
          setLoadingPosts(false);
          return cachedPosts;
        }
      }

      // Fetch from API
      const response = await apiGetAllPosts(category, limit, startAfter);
      if (response?.posts) {
        const postsWithComments = response.posts.map(post => ({
              ...post,
              comments: Array.isArray(post.comments) ? post.comments : []
        }));
        setPosts(postsWithComments);
        setInCache('posts', cacheKey, postsWithComments);
        setLastFetchTime(Date.now());
        return postsWithComments;
      }
      } catch (err) {
      console.error('Error fetching posts:', err);
      setErrorPosts(err.message);
      } finally {
        setLoadingPosts(false);
      }
  }, [getFromCache, setInCache]);

  const getPostById = useCallback(
    async (postId, force = false) => {
      console.log(`[PostsContext] Getting post ${postId}, force=${force}`);
      
      // If not forcing a refresh and we have the post in cache, use it
      if (!force && postDetails[postId]) {
        console.log(`[PostsContext] Using cached post ${postId}, views: ${postDetails[postId].views || 0}`);
        return postDetails[postId];
      }
      
      try {
        // Pass the skipCache parameter to the API when force=true
        const data = await apiGetPostById(postId, force);
        
        if (data) {
          console.log(`[PostsContext] Received post ${postId} from API, views: ${data.views || 0}`);
          
          // Update both our cache objects with the fresh data
          setPostDetails(prev => ({ ...prev, [postId]: data }));
          
          // Also update the post in the posts array if it exists
          setPosts(prev => prev.map(p => (p.id === postId ? data : p)));
        }
        return data;
      } catch (error) {
        console.error(`[PostsContext] Error fetching post ${postId}:`, error);
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
      
      const response = await api.get(`/api/posts/${postId}/comments`);
      const comments = response.data;
      
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

  // Optimized fetchBatchComments with better caching and deduplication
  const fetchBatchComments = useCallback(async (postIds, force = false) => {
    if (!postIds || postIds.length === 0) {
      console.log('[PostsContext] fetchBatchComments called with no postIds');
      return {};
    }

    console.log(`[PostsContext] fetchBatchComments called for ${postIds.length} posts, force=${force}`);
    
    // Filter out null/undefined and get unique IDs
    const uniquePostIds = Array.from(new Set(postIds.filter(id => id)));
    
    if (uniquePostIds.length === 0) {
      return {};
    }
    
    // Sort the postIds to ensure consistent cache keys
    const sortedPostIds = [...uniquePostIds].sort();
    const cacheKey = `batchComments_${sortedPostIds.join('_')}`;
    
    // Check if this exact request is already in progress
    if (requestsInProgress[cacheKey]) {
      console.log(`[PostsContext] Reusing in-progress request for batch comments: ${cacheKey}`);
      return requestsInProgress[cacheKey];
    }
    
    // Check if API is available before making requests
    const apiAvailable = await checkApiAvailability();
    if (!apiAvailable && !force) {
      console.log('[PostsContext] API unavailable, using cache only');
      // Return whatever we have in cache
      const cachedData = {};
      uniquePostIds.forEach(postId => {
        cachedData[postId] = commentsCache[postId] || [];
        // Mark as not loading since we're not going to make API calls
        setLoadingComments(prev => ({ ...prev, [postId]: false }));
      });
      return cachedData;
    }
    
    // Set initial loading state for each post
    setLoadingComments(prev => 
      uniquePostIds.reduce((acc, id) => ({ ...acc, [id]: true }), prev)
    );
    
    // Check cache first to return immediately available data
    const cachedData = {};
    const postsNeedingFetch = [];
    const now = Date.now();
    
    // Determine which posts need fetching vs. which can use cached data
    uniquePostIds.forEach(postId => {
      // Check if we have comments for this post in cache and if cache is fresh
      const lastFetchTime = commentsLastFetch[postId] || 0;
      const isCacheFresh = (now - lastFetchTime) < CACHE_DURATION;
      
      if (commentsCache[postId] && isCacheFresh && !force) {
        console.log(`[PostsContext] Using fresh cache for post ${postId}, age: ${(now - lastFetchTime)/1000}s`);
        cachedData[postId] = commentsCache[postId];
        
        // Update loading state for this post immediately
        setLoadingComments(prev => ({ ...prev, [postId]: false }));
      } else {
        console.log(`[PostsContext] Need to fetch comments for post ${postId}, cache age: ${(now - lastFetchTime)/1000}s`);
        postsNeedingFetch.push(postId);
      }
    });
    
    // If all posts were in cache and fresh, return immediately
    if (postsNeedingFetch.length === 0) {
      console.log('[PostsContext] All comments available in cache, skipping API call');
      return cachedData;
    }
    
    // Create the fetch promise for posts needing fresh data
    const fetchPromise = (async () => {
      try {
        // Process in batches of 5 to avoid excessive firestore reads and URL length issues
        const API_BATCH_SIZE = 5;
        let commentsData = { ...cachedData };
        
        // Update last fetch timestamps for fresh cache data
        let newCommentsLastFetch = { ...commentsLastFetch };
        Object.keys(cachedData).forEach(postId => {
          newCommentsLastFetch[postId] = Date.now();
        });
        
        // Process posts in batches
        for (let i = 0; i < postsNeedingFetch.length; i += API_BATCH_SIZE) {
          const batchPostIds = postsNeedingFetch.slice(i, i + API_BATCH_SIZE);
          console.log(`[PostsContext] Fetching batch ${Math.floor(i/API_BATCH_SIZE) + 1} with ${batchPostIds.length} posts`);
          
          try {
            // Build query string - joining IDs with commas for a single postIds parameter
            // This ensures we don't repeat the parameter name for each ID
            const queryString = `postIds=${batchPostIds.join(',')}`;
            const url = `${BACKEND_URL}/api/posts/batch-comments?${queryString}`;
            
            console.log(`[PostsContext] Fetching from: ${url}`);
            
            const response = await fetch(url, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              // Short timeout to prevent long hanging requests
              signal: AbortSignal.timeout(10000)
            });
            
            if (!response.ok) {
              throw new Error(`API error: ${response.status}`);
            }
            
            const batchData = await response.json();
            
            // Update our results and timestamps
            Object.keys(batchData).forEach(postId => {
              commentsData[postId] = batchData[postId];
              newCommentsLastFetch[postId] = Date.now();
            });
            
            // Update cache with the batch results
            setCommentsCache(prev => ({
              ...prev,
              ...batchData
            }));
          } catch (batchError) {
            console.error(`[PostsContext] Error fetching batch ${Math.floor(i/API_BATCH_SIZE) + 1}:`, batchError);
            
            // For each post in this failed batch, use cache if available (even if stale)
            batchPostIds.forEach(postId => {
              if (commentsCache[postId]) {
                console.log(`[PostsContext] Using stale cache for post ${postId} due to fetch error`);
                commentsData[postId] = commentsCache[postId];
              } else {
                console.log(`[PostsContext] No cache available for post ${postId}, using empty array`);
                commentsData[postId] = [];
              }
            });
            
            // Don't update timestamps for failed fetches
          }
        }
        
        // Update last fetch timestamps
        setCommentsLastFetch(newCommentsLastFetch);
        
        // Create a merged map of all requested comments
        const mergedCommentsMap = uniquePostIds.reduce((acc, id) => ({
          ...acc,
          [id]: commentsData[id] || commentsCache[id] || []
        }), {});
        
        return mergedCommentsMap;
      } catch (error) {
        console.error('[PostsContext] Error fetching batch comments:', error);
        // Return whatever we have in cache, even if stale
        return uniquePostIds.reduce((acc, id) => ({
          ...acc,
          [id]: commentsCache[id] || []
        }), {});
      } finally {
        // Clear request in progress status when done
        setRequestsInProgress(prev => {
          const newRequests = { ...prev };
          delete newRequests[cacheKey];
          return newRequests;
        });
        
        // Update loading state to false for all posts we were fetching
        setLoadingComments(prev => 
          uniquePostIds.reduce((acc, id) => ({ ...acc, [id]: false }), prev)
        );
      }
    })();
    
    // Store the promise in our requestsInProgress object
    setRequestsInProgress(prev => ({
      ...prev,
      [cacheKey]: fetchPromise
    }));
    
    return fetchPromise;
  }, [CACHE_DURATION, commentsCache, commentsLastFetch, BACKEND_URL, requestsInProgress]);

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
    if (!updatedPost || !updatedPost.id) {
      console.warn('[PostsContext] Invalid post data in updatePostInCache', updatedPost);
      return;
    }
    
    console.log(`[PostsContext] Updating post ${updatedPost.id} in cache with views: ${updatedPost.views || 0}`);
    
    // Update the post in the posts array
    setPosts(prev => 
      prev.map(p => {
        if (p.id === updatedPost.id) {
          // Preserve any properties that might be missing in updatedPost
          return { 
            ...p, 
            ...updatedPost,
            // Always ensure views is properly updated
            views: updatedPost.views !== undefined ? updatedPost.views : p.views
          };
        }
        return p;
      })
    );
    
    // Update the post in the postDetails object
    setPostDetails(prev => {
      const existingPost = prev[updatedPost.id];
      if (existingPost) {
        // Merge with existing post data to preserve any missing properties
        return { 
          ...prev, 
          [updatedPost.id]: {
            ...existingPost,
            ...updatedPost,
            // Always ensure views is properly updated
            views: updatedPost.views !== undefined ? updatedPost.views : existingPost.views
          }
        };
      }
      // If post doesn't exist in cache yet, add it
      return { ...prev, [updatedPost.id]: updatedPost };
    });
  }, []);

  const removePostFromCache = useCallback((postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    setPostDetails(prev => {
      const { [postId]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const fetchCarouselData = useCallback(
    async (categories, force = false, skipComments = true) => {
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

          // Fetch comments for visible posts ONLY if not skipped
          if (visiblePostIds.size > 0 && !skipComments) {
            console.log('Fetching comments for carousel posts');
            const commentsMap = await fetchBatchComments([...visiblePostIds], force);
            
            Object.keys(newCarouselData).forEach(category => {
              newCarouselData[category] = newCarouselData[category].map(post => ({
                ...post,
                comments: commentsMap[post.id] || []
              }));
            });
          } else {
            console.log('Skipping comments fetch for carousel posts');
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

  // Improved function to update a comment in the cache while preserving post likes
  const updateCommentInCache = useCallback((postId, updatedComment) => {
    if (!postId || !updatedComment || !updatedComment.id) {
      console.warn('[PostsContext] Invalid params for updateCommentInCache', { postId, updatedComment });
      return;
    }
    
    console.log(`[PostsContext] Updating comment ${updatedComment.id} in cache for post ${postId}`);
    
    // First update the comments cache
    setCommentsCache(prev => {
      // Skip update if post doesn't exist in cache
      if (!prev[postId]) {
        console.log(`[PostsContext] Post ${postId} not found in commentsCache, skipping comment update`);
        return prev;
      }
      
      // Check if we need to add or update the comment
      const currentComments = Array.isArray(prev[postId]) ? prev[postId] : [];
      const commentIndex = currentComments.findIndex(c => c && c.id === updatedComment.id);
      
      console.log(`[PostsContext] Comment ${updatedComment.id} ${commentIndex === -1 ? 'not found, adding new' : 'found, updating'} in commentsCache`);
      
      // Either add or update the comment
      const newComments = commentIndex === -1
        ? [updatedComment, ...currentComments]
        : currentComments.map(c => c && c.id === updatedComment.id ? updatedComment : c);
      
      return {
      ...prev,
        [postId]: newComments
      };
    });

    // Then update post details if the post exists, but ONLY update the comments array
    // NOT the entire post object to avoid affecting post likes
    setPostDetails(prev => {
      // Skip if post doesn't exist in cache
      if (!prev[postId]) {
        console.log(`[PostsContext] Post ${postId} not found in postDetails, skipping comment update`);
        return prev;
      }
      
      // Get current comments for this post
      const currentPostComments = Array.isArray(prev[postId].comments) ? prev[postId].comments : [];
      const commentIndex = currentPostComments.findIndex(c => c && c.id === updatedComment.id);
      
      // Update or add the comment in the array
      const updatedComments = commentIndex === -1
        ? [updatedComment, ...currentPostComments]
        : currentPostComments.map(c => c && c.id === updatedComment.id ? updatedComment : c);
      
      // Important: Only update the comments array, not the entire post
      // This prevents accidentally changing post likes when updating a comment
      return {
        ...prev,
        [postId]: {
          ...prev[postId],
          comments: updatedComments
        }
      };
    });

    // Finally update in the posts list if needed
    setPosts(prevPosts => {
      if (!prevPosts || !Array.isArray(prevPosts)) return prevPosts;
      
      return prevPosts.map(post => {
        // Skip posts that don't match
        if (!post || post.id !== postId) return post;
        
        // Get current comments for this post
        const currentComments = Array.isArray(post.comments) ? post.comments : [];
        const commentIndex = currentComments.findIndex(c => c && c.id === updatedComment.id);
        
        // Update or add the comment
        const updatedComments = commentIndex === -1
          ? [updatedComment, ...currentComments]
          : currentComments.map(c => c && c.id === updatedComment.id ? updatedComment : c);
        
        // Important: Only update the comments array, preserve all other post properties
          return {
            ...post,
          comments: updatedComments
        };
      });
    });
  }, []);

  const removeCommentFromCache = useCallback((postId, commentId) => {
    if (!postId || !commentId) {
      console.warn('Invalid parameters for removeCommentFromCache', { postId, commentId });
      return;
    }

    setCommentsCache(prev => ({
      ...prev,
      [postId]: (prev[postId] || []).filter(comment => comment && comment.id !== commentId)
    }));
    
    setPostDetails(prev => {
      if (!prev[postId]) return prev;
      return {
        ...prev,
        [postId]: {
          ...prev[postId],
          comments: (prev[postId].comments || []).filter(comment => comment && comment.id !== commentId)
        }
      };
    });
    
    setPosts(prevPosts => {
      if (!prevPosts || !Array.isArray(prevPosts)) return prevPosts;
      
      return prevPosts.map(post => {
        if (!post || post.id !== postId) return post;
        
          return {
            ...post,
          comments: Array.isArray(post.comments) 
            ? post.comments.filter(comment => comment && comment.id !== commentId)
            : []
        };
      });
    });
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
