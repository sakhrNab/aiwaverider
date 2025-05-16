import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import { toggleLike } from '../../api/content/postApi';
import { AuthContext } from '../../contexts/AuthContext';
import { PostsContext } from '../../contexts/PostsContext';
import { toast } from 'react-toastify';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import debounce from 'lodash/debounce';
import { Link } from "react-router-dom";

const LikeButton = ({ postId, initialLikes = [], className = '' }) => {
  const [likes, setLikes] = useState(initialLikes ? initialLikes.length : 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useContext(AuthContext);
  const { postDetails, updatePostInCache } = useContext(PostsContext);
  
  // Track the last time we made an API call
  const lastApiCallTime = useRef(0);
  // Track if component is mounted
  const isMounted = useRef(true);
  // Track current request ID to prevent race conditions
  const currentRequestId = useRef(0);

  // Use post data from context instead of individual listeners
  useEffect(() => {
    // Set mounted flag
    isMounted.current = true;
    
    // Skip invalid states
    if (!postId) {
      console.log('[LikeButton] Invalid postId, skipping effect');
      return;
    }
    
    console.log(`[LikeButton] Checking like state for post ${postId}`);
    
    // Check if we have the post details in the context
    if (postDetails && postDetails[postId]) {
      const postData = postDetails[postId];
      const likesArray = postData.likes || [];
      console.log(`[LikeButton] Using like data from context for post ${postId}, likes count: ${likesArray.length}`);
      setLikes(likesArray.length);
      setIsLiked(user?.uid ? likesArray.includes(user.uid) : false);
    } else if (initialLikes) {
      // Fallback to props if no context data available
      console.log(`[LikeButton] Using initialLikes for post ${postId}, count: ${initialLikes.length}`);
      setLikes(initialLikes.length);
      setIsLiked(user?.uid ? initialLikes.includes(user.uid) : false);
    }
    
    // Cleanup function to set mounted flag to false
    return () => {
      isMounted.current = false;
    };
  }, [postId, user?.uid, postDetails, initialLikes]);

  // Debounced like action with improved error handling and throttling
  const debouncedLikeAction = useCallback(
    debounce(async (optimisticUpdate, revertUpdate, requestId) => {
      // Check if component is still mounted
      if (!isMounted.current) {
        console.log('[LikeButton] Component unmounted, cancelling API call');
        return;
      }
      
      // Check if this request is still the current one
      if (requestId !== currentRequestId.current) {
        console.log(`[LikeButton] Skipping stale request ${requestId}, current is ${currentRequestId.current}`);
        return;
      }
      
      // Validate parameters
      if (!postId) {
        console.error('[LikeButton] Missing postId for like action');
        revertUpdate();
        if (isMounted.current) setIsLoading(false);
        return;
      }

      // Strict throttling - enforce a minimum time between API calls
      const now = Date.now();
      const timeSinceLastCall = now - lastApiCallTime.current;
      const MIN_API_INTERVAL = 1000; // At least 1 second between calls
      
      if (timeSinceLastCall < MIN_API_INTERVAL) {
        const waitTime = MIN_API_INTERVAL - timeSinceLastCall;
        console.log(`[LikeButton] Throttling API call for post ${postId}, waiting ${waitTime}ms`);
        
        // Wait for the throttle time before continuing
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Check if component is still mounted after waiting
        if (!isMounted.current) {
          console.log('[LikeButton] Component unmounted after throttle wait');
          return;
        }
        
        // Check if this request is still valid after waiting
        if (requestId !== currentRequestId.current) {
          console.log(`[LikeButton] Request expired after throttle wait`);
          return;
        }
      }
      
      lastApiCallTime.current = Date.now();
      
      try {
        const actionType = isLiked ? 'unlike' : 'like';
        console.log(`[LikeButton] Making API request to ${actionType} post ${postId}`);
        
        const response = await toggleLike(postId);
        
        // After API call, check if component is still mounted and request is current
        if (!isMounted.current) {
          console.log('[LikeButton] Component unmounted after API call, not updating state');
          return;
        }
        
        if (requestId !== currentRequestId.current) {
          console.log(`[LikeButton] Request ${requestId} is stale, current is ${currentRequestId.current}`);
          return;
        }
        
        console.log(`[LikeButton] API response received for post ${postId}:`, response);
        
        // Check if response contains the expected updatedPost
        if (response && response.updatedPost) {
          // Parse the likes from the response to update our local state
          const updatedLikes = response.updatedPost.likes || [];
          
          // Update our local state based on the actual server response
          // This ensures our UI is consistent with the server state
          setLikes(updatedLikes.length);
          setIsLiked(user?.uid ? updatedLikes.includes(user?.uid) : false);
          
          // Also update the post in cache to keep it in sync
          updatePostInCache(response.updatedPost);
          
          // Log success or failure
          console.log(`[LikeButton] Like status updated for post ${postId}, new status: ${
            user?.uid && updatedLikes.includes(user?.uid) ? 'liked' : 'not liked'
          }`);
        } else {
          console.warn(`[LikeButton] Unexpected response format for post ${postId}:`, response);
          // Revert optimistic update due to unexpected response
          revertUpdate();
          toast.error('Server returned an unexpected response. Please try again.');
        }
      } catch (error) {
        console.error(`[LikeButton] Error toggling like for post ${postId}:`, error);
        // Revert optimistic update on error
        revertUpdate();
        if (error.message) {
          toast.error(`Failed to update like: ${error.message}`);
        } else {
          toast.error('Failed to update like. Please try again.');
        }
      } finally {
        if (isMounted.current && requestId === currentRequestId.current) {
          setIsLoading(false);
        }
      }
    }, 300), // Reduced debounce time but with additional throttling
    [postId, user?.uid, isLiked, updatePostInCache, toggleLike]
  );

  const handleLike = async () => {
    if (!user) {
      toast.info(
        <div>
  Please <Link to="/sign-in" className="text-blue-500 hover:text-blue-700">sign in</Link> to like posts
        </div>,
        {
          position: "top-center",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        }
      );
      return;
    }

    if (isLoading) {
      console.log(`[LikeButton] Ignoring like action - already processing for post ${postId}`);
      return;
    }
    
    console.log(`[LikeButton] Handling like for post ${postId}, current status: ${isLiked ? 'liked' : 'not liked'}`);
    setIsLoading(true);

    // Store original state for revert
    const originalIsLiked = isLiked;
    const originalLikes = likes;

    // Generate a unique request ID for this action
    const requestId = Date.now();
    currentRequestId.current = requestId;

    // Optimistic update
    const optimisticUpdate = () => {
      console.log(`[LikeButton] Applying optimistic update for post ${postId}`);
      setIsLiked(!isLiked);
      setLikes(prev => !isLiked ? prev + 1 : prev - 1);
    };

    // Revert function for error cases
    const revertUpdate = () => {
      console.log(`[LikeButton] Reverting optimistic update for post ${postId}`);
      setIsLiked(originalIsLiked);
      setLikes(originalLikes);
    };

    optimisticUpdate();
    debouncedLikeAction(optimisticUpdate, revertUpdate, requestId);
  };

  return (
    <button
      onClick={handleLike}
      disabled={isLoading}
      className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-200 ${
        isLiked 
          ? 'bg-red-50 text-red-500 hover:bg-red-100' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      } ${className} ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
      aria-busy={isLoading}
      aria-label={isLiked ? 'Unlike this post' : 'Like this post'}
    >
      {isLiked ? (
        <FaHeart className={`w-5 h-5 text-red-500 ${isLoading ? 'animate-pulse' : ''}`} />
      ) : (
        <FaRegHeart className={`w-5 h-5 ${isLoading ? 'animate-pulse' : ''}`} />
      )}
      <span className={`font-medium ${isLiked ? 'text-red-500' : 'text-gray-600'}`}>
        {likes}
      </span>
    </button>
  );
};

export default LikeButton; 