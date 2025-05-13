import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FaStar, FaRegStar, FaDownload, FaHeart, FaRegHeart, FaLink, FaArrowLeft, FaArrowRight, FaThumbsUp, FaComment, FaShare, FaCheckCircle, FaShoppingCart } from 'react-icons/fa';
import { 
  toggleWishlist, 
  toggleAgentLike,
  getAgentReviews,
  addAgentReview,
  checkCanReviewAgent,
  downloadFreeAgent,
  incrementAgentDownloadCount,
  recordAgentDownload,
  fetchAgentById,
  getUserLikeStatus

} from '../api/marketplace/agentApi.js';
import { useCart } from '../contexts/CartContext.jsx';
import { AuthContext } from '../contexts/AuthContext.jsx';
import { trackProductView } from '../services/recommendationService.js';
import { formatPrice } from '../utils/priceUtils.js';
import useAgentStore from '../store/agentStore.js';
import DOMPurify from 'dompurify';
import { toast } from 'react-toastify';
import './AgentDetailPage.css';
// Add debug logger
const debug = (message, data) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[AgentDetail] ${message}`, data);
  }
};

// Star Rating Component
const StarRating = ({ rating, onRatingChange, size = "large", interactive = false }) => {
  const ratingValue = Number(rating) || 0;
  const sizeClass = size === "small" ? "star-small" : "star-large";
  
  const handleStarClick = (selectedRating) => {
    if (interactive && onRatingChange) {
      onRatingChange(selectedRating);
    }
  };
  
  return (
    <div className={`star-rating ${interactive ? 'interactive' : ''}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span 
          key={star} 
          onClick={() => handleStarClick(star)}
          className={interactive ? 'star-clickable' : ''}
        >
          {star <= ratingValue ? (
            <FaStar className={`star-filled ${sizeClass}`} />
          ) : (
            <FaRegStar className={`star-empty ${sizeClass}`} />
          )}
        </span>
      ))}
    </div>
  );
};

// Like Button Component
const LikeButton = ({ agentId, initialLikes = 0, onLikeUpdate }) => {
  const { user } = useContext(AuthContext);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [initialStateLoaded, setInitialStateLoaded] = useState(false);
  const checkIntervalRef = useRef(null);

  // Replace the Firebase onSnapshot listeners with direct document fetches
  useEffect(() => {
    // Initialize like count properly - handle array or number
    if (Array.isArray(initialLikes)) {
      setLikeCount(initialLikes.length);
    } else if (typeof initialLikes === 'number') {
      setLikeCount(initialLikes);
    }
    
    // Check if the current user has liked this agent - only once, not with a listener
    if (user && agentId) {
      console.log(`Checking if user has liked agent. User ID: ${user.uid}, Agent ID: ${agentId}`);
      
      const checkUserLiked = async () => {
        try {
          const token = localStorage.getItem('authToken');
          if (!user || !token) {
            setInitialStateLoaded(true);
            return;
          }

          // Check if the user has liked this agent using the API function
          const likeStatus = await getUserLikeStatus(agentId);
          const isLiked = likeStatus.liked || false;
          console.log(`Initial check: User has liked agent: ${isLiked}`);
          setLiked(isLiked);
          
          // Update like count if available
          if (likeStatus.likesCount !== undefined) {
            setLikeCount(likeStatus.likesCount);
          }
          
          // Cache the like status
          try {
            localStorage.setItem(`like_status_${agentId}`, JSON.stringify(likeStatus));
          } catch (e) {
            // Ignore storage errors
          }
        } catch (error) {
          console.error("Error checking like status:", error);
          // Fallback to not liked state on error
          setLiked(false);
        }
        
        setInitialStateLoaded(true);
      };
      
      checkUserLiked();
    } else {
      console.log("No user or agent ID, setting initialStateLoaded = true");
      setInitialStateLoaded(true);
    }
  }, [user, agentId]);

  // Toast configuration for consistent, appealing notifications
  const showToast = (type, message, options = {}) => {
    const defaultOptions = {
      position: "bottom-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      icon: true
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    switch (type) {
      case 'success':
        toast.success(message, mergedOptions);
        break;
      case 'error':
        toast.error(message, mergedOptions);
        break;
      case 'info':
        toast.info(message, mergedOptions);
        break;
      case 'warning':
        toast.warning(message, mergedOptions);
        break;
      default:
        toast(message, mergedOptions);
    }
  };
  
  // Custom confirm toast with action buttons
  const showConfirmToast = () => {
    // Clear any existing toasts to prevent stacking
    toast.dismiss();
    console.log("Showing unlike confirmation dialog");
    
    // Create a custom toast with action buttons
    toast(
      ({ closeToast }) => (
        <div className="confirm-toast-container">
          <div className="confirm-toast-message">
            <span role="img" aria-label="question">❓</span> Remove your like from this agent?
          </div>
          <div className="confirm-toast-actions">
            <button 
              onClick={() => {
                closeToast();
                console.log("Unlike confirmed, calling processLikeToggle()");
                processLikeToggle();
              }}
              className="confirm-toast-button confirm"
            >
              Yes, remove like
            </button>
            <button 
              onClick={() => {
                closeToast();
                console.log("Unlike cancelled");
              }}
              className="confirm-toast-button cancel"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      {
        position: "bottom-right",
        autoClose: false,
        closeOnClick: false,
        draggable: true,
        closeButton: true,
        className: 'confirm-unlike-toast',
        toastId: 'unlike-confirmation' // Ensure unique ID
      }
    );
  };
  
  // Process like/unlike by letting the server determine the action
  const processLikeToggle = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      console.log('Sending toggle like request to server');
      const response = await toggleAgentLike(agentId);
      console.log('Server response:', response);
      
      if (response.success) {
        // Use the server's response to determine the new state
        const didLike = response.liked;
        
        // Set liked state based on the server response
        setLiked(didLike);
        
        // If the API returns the updated like count, use it
        if (response.likesCount !== undefined) {
          setLikeCount(response.likesCount);
          if (onLikeUpdate) {
            onLikeUpdate(response.likesCount);
          }
        }
        
        // Show appropriate notification based on server response
        // Use toast directly to ensure notification is shown
        if (didLike) {
          toast.success('❤️ Added your like!', {
            position: "bottom-right",
            autoClose: 2000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            icon: "❤️",
            toastId: 'like-added' // Ensure uniqueness
          });
        } else {
          toast.success('💔 Removed your like', {
            position: "bottom-right",
            autoClose: 2000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            icon: "💔",
            toastId: 'like-removed' // Ensure uniqueness
          });
        }
      } else {
        toast.error(response.error || 'Failed to update like', {
          position: "bottom-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          icon: "❌",
          toastId: 'like-error' // Ensure uniqueness
        });
      }
    } catch (err) {
      console.error(`Error toggling like for agent:`, err);
      toast.error(`Failed to update like`, {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        icon: "❌",
        toastId: 'like-error' // Ensure uniqueness
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLikeToggle = async () => {
    if (!user) {
      showToast('info', '👋 Please sign in to like this agent', {
        icon: "👋"
      });
      return;
    }
    
    if (isLoading || !initialStateLoaded) return;
    
    // If user has already liked and is trying to like again, show confirm toast
    if (liked) {
      console.log("Agent is liked, showing confirmation dialog");
      showConfirmToast();
      return;
    } else {
      console.log("Agent is not liked, directly toggling like");
    }
    
    // Otherwise proceed with toggling the like
    processLikeToggle();
  };
  
  return (
    <button 
      className={`like-button ${liked ? 'liked' : ''} ${isLoading ? 'loading' : ''}`}
      onClick={handleLikeToggle}
      disabled={isLoading || !initialStateLoaded}
    >
      {liked ? <FaHeart className="heart-icon" /> : <FaRegHeart className="heart-icon" />}
      <span className="like-count">{likeCount}</span>
    </button>
  );
};

// Comments/Reviews Section Component
const CommentSection = ({ agentId, existingReviews = [], onReviewsLoaded }) => {
  const { user } = useContext(AuthContext);
  console.log('CommentSection received existingReviews:', existingReviews);
  const [comments, setComments] = useState(existingReviews);
  const [newComment, setNewComment] = useState('');
  const [rating, setRating] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [hasUserReviewed, setHasUserReviewed] = useState(false);
  const [showSignInPopup, setShowSignInPopup] = useState(false);
  const [showSignUpPopup, setShowSignUpPopup] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [reviewEligibilityChecked, setReviewEligibilityChecked] = useState(false);
  const [reviewEligibilityReason, setReviewEligibilityReason] = useState('');
  
  // Toast configuration for consistent, appealing notifications
  const showToast = (type, message, options = {}) => {
    const defaultOptions = {
      position: "bottom-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      icon: true
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    switch (type) {
      case 'success':
        toast.success(message, mergedOptions);
        break;
      case 'error':
        toast.error(message, mergedOptions);
        break;
      case 'info':
        toast.info(message, mergedOptions);
        break;
      case 'warning':
        toast.warning(message, mergedOptions);
        break;
      default:
        toast(message, mergedOptions);
    }
  };
  
  // Optimize the useEffect in CommentSection that sets up the Firebase listener
  useEffect(() => {
    // Load comments without Firebase listeners to reduce quota usage
    const loadComments = async () => {
      setIsLoadingComments(true);
      try {
        console.log(`Loading reviews for agent ${agentId}`);
        const response = await getAgentReviews(agentId);
        console.log('Received reviews:', response);
        if (response && Array.isArray(response)) {
          setComments(response);
          
          // Notify parent component about review count
          if (onReviewsLoaded) {
            console.log('Setting initial review count to:', response.length);
            onReviewsLoaded(response.length);
          }
          
          // Check if current user has already reviewed (only if authenticated)
          if (user) {
            const userReview = response.find(review => review.userId === user.uid);
            setHasUserReviewed(!!userReview);
          }
        }
      } catch (err) {
        console.error('Error loading comments:', err);
        setError('Failed to load comments');
      } finally {
        setIsLoadingComments(false);
      }
    };
    
    // Load comments only once when component mounts, not on every render
    loadComments();
    
    // Avoid setting up Firebase realtime listener to save quota
    return () => {};
  }, [agentId, user]); // Remove onReviewsLoaded from dependencies as it causes infinite rerendering
  
  const handleOpenSignInPopup = () => {
    setShowSignInPopup(true);
  };
  
  const handleOpenSignUpPopup = () => {
    setShowSignUpPopup(true);
  };
  
  const handleClosePopups = () => {
    setShowSignInPopup(false);
    setShowSignUpPopup(false);
  };
  
  // Add useEffect to check if user can review
  useEffect(() => {
    if (!user) {
      setCanReview(false);
      setReviewEligibilityChecked(true);
      setReviewEligibilityReason('Please sign in to leave a review');
      return;
    }
    
    const checkEligibility = async () => {
      try {
        // Use the new API to check if user can review
        const eligibilityResult = await checkCanReviewAgent(agentId);
        
        setCanReview(eligibilityResult.canReview);
        setReviewEligibilityReason(eligibilityResult.reason);
        setReviewEligibilityChecked(true);
        
        console.log('Review eligibility result:', eligibilityResult);
      } catch (err) {
        console.error('Error checking review eligibility:', err);
        setCanReview(false);
        setReviewEligibilityReason('Error checking eligibility');
        setReviewEligibilityChecked(true);
      }
    };
    
    checkEligibility();
  }, [user, agentId]);
  
  // Update the handleCommentSubmit function to check eligibility
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      showToast('info', '👋 Please sign in to leave a review', {
        icon: "👋"
      });
      return;
    }
    
    if (hasUserReviewed) {
      showToast('warning', '⚠️ You have already reviewed this agent', {
        icon: "⚠️"
      });
      return;
    }
    
    if (!canReview) {
      showToast('warning', `⚠️ ${reviewEligibilityReason}`, {
        icon: "⚠️"
      });
      return;
    }
    
    if (!newComment.trim()) {
      setError('Please enter a comment');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const commentData = {
        content: newComment,
        rating: rating,
        verificationStatus: reviewEligibilityReason === 'Verified purchase' ? 'verified_purchase' : 
                            reviewEligibilityReason === 'Downloaded agent' ? 'verified_download' : 
                            reviewEligibilityReason === 'Admin user' ? 'admin' : 'unverified'
      };
      
      console.log('Submitting review with data:', commentData);
      const response = await addAgentReview(agentId, commentData);
      console.log('Review submission response:', response);
      
      if (response.success) {
        // Add the new comment to the list
        const newCommentObj = {
          id: response.reviewId || `temp-${Date.now()}`,
          content: newComment,
          rating: rating,
          createdAt: new Date().toISOString(),
          userId: user.uid,
          userName: user.displayName || user.email.split('@')[0]
        };
        
        // Immediately increment the review count through the callback
        // This ensures the UI updates right away without waiting for Firebase
        if (onReviewsLoaded) {
          const newCount = comments.length + 1;
          console.log('Immediately updating review count to:', newCount);
          onReviewsLoaded(newCount);
        }
        
        // Update the local comments state
        setComments(prevComments => [...prevComments, newCommentObj]);
        
        setNewComment('');
        setRating(5);
        setHasUserReviewed(true);
        showToast('success', '✅ Your review has been added. Thank you for your feedback!', {
          icon: "✅",
          autoClose: 4000
        });
      } else {
        setError(response.error || 'Failed to add comment');
        showToast('error', response.error || '❌ Failed to add your review', {
          icon: "❌"
        });
      }
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('An error occurred while adding your review');
      showToast('error', '❌ An error occurred while adding your review', {
        icon: "❌"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid date';
    }
  };
  
  // Update the AuthPrompt component to show different message based on eligibility
  const AuthPrompt = () => (
    <div className="auth-prompt">
      <div className="auth-prompt-content">
        <div className="auth-prompt-icon">
          <FaComment className="comment-icon" />
        </div>
        <h3>Join the conversation!</h3>
        <p>Sign in to leave a review and share your experience with this product.</p>
        <div className="auth-prompt-buttons">
          <button 
            className="auth-button signin-button" 
            onClick={handleOpenSignInPopup}
          >
            Sign In
          </button>
          <button 
            className="auth-button signup-button" 
            onClick={handleOpenSignUpPopup}
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
  
  // Create a component for users who are signed in but not eligible to review
  const EligibilityPrompt = () => (
    <div className="eligibility-prompt">
      <div className="eligibility-prompt-content">
        <div className="eligibility-prompt-icon">
          <FaComment className="comment-icon" />
        </div>
        <h3>Want to share your experience?</h3>
        <p>{reviewEligibilityReason}</p>
        <p>You can only review agents that you've purchased or downloaded.</p>
      </div>
    </div>
  );
  
  // Auth Popup Component
  const AuthPopup = ({ isSignIn, onClose }) => (
    <div className="auth-popup-overlay" onClick={onClose}>
      <div className="auth-popup" onClick={e => e.stopPropagation()}>
        <button className="auth-popup-close" onClick={onClose}>×</button>
        <iframe 
          src={isSignIn ? "/sign-in" : "/sign-up"} 
          title={isSignIn ? "Sign In" : "Sign Up"}
          className="auth-popup-iframe"
        />
      </div>
    </div>
  );
  
  return (
    <div className="comments-section">
      <h3 className="section-heading">Reviews & Ratings</h3>
      
      {user && !hasUserReviewed && canReview ? (
        <form onSubmit={handleCommentSubmit} className="comment-form">
          <div className="rating-input">
            <label>Your Rating:</label>
            <StarRating rating={rating} onRatingChange={setRating} interactive={true} />
          </div>
          
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts about this agent..."
            className="comment-textarea"
            rows={4}
          />
          
          {error && <div className="comment-error">{error}</div>}
          
          <button 
            type="submit" 
            className="submit-comment-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      ) : user && hasUserReviewed ? (
        <div className="already-reviewed-message">
          <p>You have already submitted a review for this agent. Thank you for your feedback!</p>
        </div>
      ) : user && reviewEligibilityChecked && !canReview ? (
        <EligibilityPrompt />
      ) : (
        <AuthPrompt />
      )}
      
      <div className="comments-list">
        {isLoadingComments ? (
          <div className="loading-comments">Loading reviews...</div>
        ) : comments.length > 0 ? (
          comments.map(comment => (
            <div key={comment.id} className="comment-item">
              <div className="comment-header">
                <div className="comment-user">
                  <span className="user-name">{comment.userName || 'Anonymous'}</span>
                  <span className="comment-date">{formatDate(comment.createdAt)}</span>
                </div>
                <StarRating rating={comment.rating} size="small" />
              </div>
              <div className="comment-content">{comment.content}</div>
            </div>
          ))
        ) : (
          <div className="no-comments">No reviews yet. {user ? 'Be the first to review!' : 'Sign in to be the first to review!'}</div>
        )}
      </div>
      
      {/* Authentication Popups */}
      {showSignInPopup && <AuthPopup isSignIn={true} onClose={handleClosePopups} />}
      {showSignUpPopup && <AuthPopup isSignIn={false} onClose={handleClosePopups} />}
    </div>
  );
};

const AgentDetail = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { addToCart } = useCart();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [customPrice, setCustomPrice] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [copySuccess, setCopySuccess] = useState('');
  const [downloadCount, setDownloadCount] = useState(0);
  const [viewTracked, setViewTracked] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState(null);
  const [likesCount, setLikesCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [dataLoaded, setDataLoaded] = useState(false); // Add state to track if data was loaded
  const intervalRef = useRef(null);
  const reviewsFetchedRef = useRef(false);
  const loadAttempt = useRef(0); // Track load attempts
  
  // Access the agent store
  const { allAgents, isLoading: isStoreLoading } = useAgentStore();
  
  // Image slider refs
  const sliderRef = useRef(null);
  const imageRef = useRef(null);
  
  // Function to check if the agent is free
  const isFreeAgent = (agent) => {
    if (!agent) return true; // Default to free if no agent
    
    // First check priceDetails as the source of truth
    if (agent.priceDetails) {
      if (agent.priceDetails.isFree === true) return true;
      if (agent.priceDetails.basePrice === 0) return true;
    }
    
    // Check for explicit isFree flag
    if (agent.isFree === true) return true;
    
    // Check for zero or free in the direct price field
    if (agent.price === 0 || 
        agent.price === '0' || 
        agent.price === 'Free' || 
        agent.price === 'free' || 
        agent.price === '$0' ||
        agent.price === undefined || 
        agent.price === null ||
        agent.price === '') {
      return true;
    }
    
    // Check for free in formatted price string
    if (typeof agent.price === 'string' && 
        (agent.price.toLowerCase().includes('free') || 
         agent.price === '$0' || 
         agent.price === '0' || 
         agent.price.trim() === '')) {
      return true;
    }
    
    // Check priceDetails object
    if (agent.priceDetails) {
      // If basePrice or discountedPrice is 0 or missing
      if (agent.priceDetails.basePrice === 0 || 
          agent.priceDetails.basePrice === '0' ||
          agent.priceDetails.basePrice === undefined ||
          agent.priceDetails.discountedPrice === 0 ||
          agent.priceDetails.discountedPrice === '0') {
        return true;
      }
    }
    
    // Check for price object structure
    if (typeof agent.price === 'object') {
      const priceObj = agent.price;
      if (priceObj.basePrice === 0 || 
          priceObj.basePrice === '0' ||
          priceObj.basePrice === undefined ||
          priceObj.amount === 0 ||
          priceObj.amount === '0' ||
          priceObj.value === 0 ||
          priceObj.value === '0') {
        return true;
      }
    }
    
    return false;
  };
  
  // Memoized derived values
  const agentTitle = useMemo(() => {
    if (!agent) return '';
    return agent.title || agent.name || 'Unnamed Agent';
  }, [agent]);
  
  const agentDescription = useMemo(() => {
    if (!agent) return '';
    return agent.description || 'No description available for this agent.';
  }, [agent]);
  
  const agentPrice = useMemo(() => {
    if (!agent) return 'Price unavailable';
    
    if (isFreeAgent(agent)) {
      return 'Free';
    }
    
    if (agent.priceDetails) {
      const { basePrice, discountedPrice, currency } = agent.priceDetails;
      const currencySymbol = currency === 'EUR' ? '€' : 
                            currency === 'GBP' ? '£' : '$';
      
      if (discountedPrice !== undefined && discountedPrice < basePrice) {
        return `${currencySymbol}${discountedPrice.toFixed(2)} (was ${currencySymbol}${basePrice.toFixed(2)})`;
      }
      
      if (basePrice !== undefined) {
        return `${currencySymbol}${basePrice.toFixed(2)}`;
      }
    }
    
    return formatPrice(agent.price);
  }, [agent]);
  
  const agentCreator = useMemo(() => {
    if (!agent) return 'Unknown Creator';
    
    if (agent.creator) {
      return agent.creator.name || agent.creator.username || 'Unknown Creator';
    }
    
    return 'Unknown Creator';
  }, [agent]);
  
  const agentRatingValue = useMemo(() => {
    if (!agent) return 0;
    
    if (agent.rating && agent.rating.average) {
      return typeof agent.rating.average === 'number' ? 
        agent.rating.average : 
        parseFloat(agent.rating.average) || 0;
    }
    
    return 0;
  }, [agent]);
  
  const formattedRating = useMemo(() => {
    return agentRatingValue.toFixed(1);
  }, [agentRatingValue]);
  
  // Toast configuration for consistent, appealing notifications
  const showToast = (type, message, options = {}) => {
    const defaultOptions = {
      position: "bottom-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      icon: true
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    switch (type) {
      case 'success':
        toast.success(message, mergedOptions);
        break;
      case 'error':
        toast.error(message, mergedOptions);
        break;
      case 'info':
        toast.info(message, mergedOptions);
        break;
      case 'warning':
        toast.warning(message, mergedOptions);
        break;
      default:
        toast(message, mergedOptions);
    }
  };
  
  useEffect(() => {
    // Skip if we already loaded data
    if (dataLoaded || !agentId) return;
    
    const loadAgent = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Validate agent ID format
        if (!agentId) {
          setError("Invalid agent ID provided.");
          setLoading(false);
          return;
        }
        
        console.log(`Loading agent detail for ID: ${agentId}, from route: ${window.location.pathname}`);
        
        // First check if data is already in the agent store
        console.log('Checking agent store for agent data...', allAgents);
        if (allAgents) {
          const storeAgent = allAgents.find(a => a.id === agentId);
          if (storeAgent && !loadAttempt.current) {
            console.log('Using agent data from store:', storeAgent);
            setAgent(storeAgent);
            
            // Set initial likes count
            if (storeAgent.likes) {
              if (Array.isArray(storeAgent.likes)) {
                setLikesCount(storeAgent.likes.length);
              } else if (typeof storeAgent.likes === 'number') {
                setLikesCount(storeAgent.likes);
              }
            }
            
            // Set download count
            setDownloadCount(storeAgent.downloadCount || 0);
            
            // Set initial wishlist status
            setIsWishlisted(storeAgent.isWishlisted || false);
            
            // Set initial price value
            if (storeAgent.priceDetails && storeAgent.priceDetails.basePrice !== undefined) {
              setCustomPrice(storeAgent.priceDetails.basePrice.toString());
            } else if (typeof storeAgent.price === 'number') {
              setCustomPrice(storeAgent.price.toString());
            } else if (typeof storeAgent.price === 'string' && !isNaN(parseFloat(storeAgent.price))) {
              setCustomPrice(parseFloat(storeAgent.price).toString());
            } else {
              setCustomPrice('0');
            }
            
            // Set up periodic updates instead of real-time updates with Firebase
            setupRealtimeUpdates(agentId, setAgent, setLikesCount, setDownloadCount);
            setLoading(false);
            setDataLoaded(true); // Mark data as loaded
            return;
          }
        }
        
        // If not in store or we're forcing a refresh, fetch from API
        console.log('Fetching agent data from API...');
        
        // Create an abort controller with a longer timeout for initial load
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log('Aborting initial agent fetch due to timeout');
          abortController.abort('Initial load timeout');
        }, 20000); // 20 second timeout for initial load
        
        // Increment load attempt counter - mark this as our first attempt
        loadAttempt.current += 1;
        
        const data = await fetchAgentById(agentId, { 
          signal: abortController.signal,
          skipCache: loadAttempt.current > 1 // Only use cache on retries
        });


        
        // Clear the timeout since request completed
        clearTimeout(timeoutId);
        
        console.log('Raw API response for fetchAgentById:', data);
        
        // Add data validation
        if (!data) {
          throw new Error("No agent data returned from API");
        }
        
        // Add fallback values for critical fields
        const sanitizedData = {
          ...data,
          title: data.title || data.name || "Unnamed Agent",
          description: data.description || "No description available",
          price: data.price !== undefined ? data.price : "Price unavailable",
          creator: data.creator || { name: "Unknown Creator" },
          downloadCount: data.downloadCount || 0 // Ensure downloadCount is always available
        };
        
        console.log('Sanitized agent data:', sanitizedData);
        
        // Ensure priceDetails is properly formatted
        if (data.priceDetails) {
          sanitizedData.priceDetails = {
            ...data.priceDetails,
            basePrice: typeof data.priceDetails.basePrice === 'number' ? data.priceDetails.basePrice : 
                      parseFloat(data.priceDetails.basePrice) || 0,
            discountedPrice: typeof data.priceDetails.discountedPrice === 'number' ? data.priceDetails.discountedPrice : 
                            parseFloat(data.priceDetails.discountedPrice) || null,
            currency: data.priceDetails.currency || 'USD'
          };
        } else if (typeof data.price === 'number' || (typeof data.price === 'string' && !isNaN(parseFloat(data.price)))) {
          // Create priceDetails from price if it doesn't exist
          const numericPrice = typeof data.price === 'number' ? data.price : parseFloat(data.price);
          sanitizedData.priceDetails = {
            basePrice: numericPrice,
            discountedPrice: numericPrice,
            currency: 'USD'
          };
        }
        
        // Handle image URLs
        if (!sanitizedData.imageUrl && sanitizedData.image && sanitizedData.image.url) {
          console.log('Adding main imageUrl');
          sanitizedData.imageUrl = sanitizedData.image.url;
        } else if (!sanitizedData.imageUrl && sanitizedData.images && sanitizedData.images.length > 0) {
          console.log('Adding image.url');
          sanitizedData.imageUrl = sanitizedData.images[0];
        } else if (!sanitizedData.imageUrl && sanitizedData.iconUrl) {
          console.log('Adding iconUrl');
          sanitizedData.imageUrl = sanitizedData.iconUrl;
        } else if (!sanitizedData.imageUrl) {
          console.log('Creating placeholder image');
          sanitizedData.imageUrl = `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"%3E%3Crect width="300" height="200" fill="%234a4de7"/%3E%3Ctext x="150" y="100" font-family="Arial" font-size="24" text-anchor="middle" fill="white"%3E${encodeURIComponent(sanitizedData.title)}%3C/text%3E%3C/svg%3E`;
        }
        
        // Make sure we have an images array
        if (!sanitizedData.images || !Array.isArray(sanitizedData.images)) {
          sanitizedData.images = [];
        }
        
        // Add the main image to the images array if it's not already there
        if (sanitizedData.imageUrl && !sanitizedData.images.includes(sanitizedData.imageUrl)) {
          sanitizedData.images.unshift(sanitizedData.imageUrl);
        }
        
        // Add gallery images to the images array if available
        if (sanitizedData.gallery && Array.isArray(sanitizedData.gallery)) {
          sanitizedData.gallery.forEach(item => {
            const galleryUrl = typeof item === 'string' ? item : (item && item.url);
            if (galleryUrl && !sanitizedData.images.includes(galleryUrl)) {
              sanitizedData.images.push(galleryUrl);
            }
          });
        }
        
        // Add icon to the images array if available
        if (sanitizedData.iconUrl && !sanitizedData.images.includes(sanitizedData.iconUrl)) {
          sanitizedData.images.push(sanitizedData.iconUrl);
        }
        
        setAgent(sanitizedData);
        console.log('Final agent data set in state:', sanitizedData);
        
        // Set initial review count
        if (sanitizedData.reviews && Array.isArray(sanitizedData.reviews)) {
          setReviewCount(sanitizedData.reviews.length);
        } else {
          try {
            const reviews = await getAgentReviews(agentId);
            if (reviews && Array.isArray(reviews)) {
              setReviewCount(reviews.length);
            }
          } catch (err) {
            console.warn('Could not fetch initial review count:', err);
          }
        }
        
        // Set likes count
        if (sanitizedData.likes) {
          if (Array.isArray(sanitizedData.likes)) {
            setLikesCount(sanitizedData.likes.length);
          } else if (typeof sanitizedData.likes === 'number') {
            setLikesCount(sanitizedData.likes);
          }
        }
        
        // Get download count directly from the agent data object
        setDownloadCount(sanitizedData.downloadCount || 0);
        
        // Set initial price value
        if (sanitizedData.priceDetails && sanitizedData.priceDetails.basePrice !== undefined) {
          setCustomPrice(sanitizedData.priceDetails.basePrice.toString());
        } else if (typeof sanitizedData.price === 'number') {
          setCustomPrice(sanitizedData.price.toString());
        } else if (typeof sanitizedData.price === 'string' && !isNaN(parseFloat(sanitizedData.price))) {
          setCustomPrice(parseFloat(sanitizedData.price).toString());
        } else {
          // Default to free if no price
          setCustomPrice('0');
        }
        
        setIsWishlisted(sanitizedData.isWishlisted || false);
        
        // Set up periodic updates instead of real-time updates with Firebase
        setupRealtimeUpdates(agentId, setAgent, setLikesCount, setDownloadCount);
        setDataLoaded(true); // Mark data as loaded
      } catch (err) {
        console.error('Error loading agent:', err);
        
        // Clear any timeout that may have been set
        if (typeof timeoutId !== 'undefined') {
          clearTimeout(timeoutId);
        }
        
        // Handle aborted request specially
        if (err.name === 'AbortError' || (err.message && err.message.includes('aborted'))) {
          console.log('Agent initial load was aborted due to timeout');
          
          // Try to get from cache as fallback
          try {
            console.log('Attempting to load from cache after abort');
            const cachedData = await fetchAgentById(agentId, { 
              skipCache: false,
              forceCache: true 
            });
            
            if (cachedData) {
              console.log('Successfully loaded agent from cache after abort');
              setAgent(cachedData);
              setLoading(false);
              setDataLoaded(true);
              // Setup updates with the cached data
              setupRealtimeUpdates(agentId, setAgent, setLikesCount, setDownloadCount);
              return;
            }
          } catch (cacheErr) {
            console.error('Failed to load from cache after abort:', cacheErr);
          }
        }
        
        // Standard error handling based on response codes
        if (err.response && err.response.status === 404) {
          setError(`Agent with ID "${agentId}" not found. It may have been removed or doesn't exist.`);
        } else if (err.response && err.response.status === 400) {
          setError(`Invalid agent ID. Please check the URL and try again.`);
        } else {
          setError(`There was a problem loading this product. Please try again later.`);
        }
        setLoading(false);
      }
    };

    loadAgent();
    
    // Track product view for recommendations
    if (agentId && !viewTracked) {
      console.log('Tracking product view for recommendations:', agentId);
      trackProductView(agentId)
        .then(() => {
          console.log('Successfully tracked product view');
          setViewTracked(true);
        })
        .catch(err => {
          console.warn('Failed to track product view:', err);
          // Don't show error to user, this is a background tracking feature
        });
    }

    // Update the URL if needed (redirect /product/ to /agents/)
    if (window.location.pathname.includes('/product/') && !loading) {
      const correctPath = window.location.pathname.replace('/product/', '/agents/');
      console.log(`Redirecting to correct agent path: ${correctPath}`);
      navigate(correctPath, { replace: true });
    }
    
    // Clean up periodic updates on unmount
    return () => {
      // Cleanup periodic updates
    };
  }, [agentId, viewTracked, navigate, allAgents, isStoreLoading, dataLoaded]);
  
  // Set up periodic updates instead of real-time updates with Firebase - optimize this function
  const setupRealtimeUpdates = (id, setAgent, setLikesCount, setDownloadCount) => {
    console.log('Setting up periodic updates for agent', id);
    
    // Reference to the polling interval for cleanup
    let intervalId = null;
    
    // Track whether polling is active
    let isPollingActive = true;
    
    // Keep track of consecutive errors
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 3; // After this many errors, stop polling
    
    // Setup visibility change listener to pause/resume polling when tab is not active
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('Page hidden, pausing polling');
        isPollingActive = false;
      } else {
        console.log('Page visible, resuming polling');
        isPollingActive = true;
      }
    };
    
    // Add visibility change event listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Setup very infrequent polling (60 minutes)
    const fetchData = async () => {
      // Only fetch if polling is active (page is visible)
      if (!isPollingActive) {
        console.log('Skipping poll because page is not visible');
        return;
      }
      
      // If we've had too many consecutive errors, stop polling
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.log(`Stopping polling after ${consecutiveErrors} consecutive errors`);
        if (intervalId) {
          clearInterval(intervalId);
        }
        return;
      }
      
      try {
        console.log('Manual polling for agent updates');
        
        // Create an abort controller with a longer timeout
        const abortController = new AbortController();
        
        // Set up a timeout to abort the request
        let timeoutId = null;
        try {
          timeoutId = setTimeout(() => {
            console.log('Aborting agent update poll due to timeout');
            abortController.abort('Timeout');
          }, 15000); // 15 second timeout
          
          // Use the fetchAgentById function from the API with the abort signal
          const agentData = await fetchAgentById(id, { 
            skipCache: true,
            signal: abortController.signal
          });
          
          // Reset consecutive errors on success
          consecutiveErrors = 0;
          
          // Check if we actually got data
          if (!agentData) {
            console.warn('No agent data returned from API');
            return;
          }
          
          // Update agent with the data
          setAgent(prev => {
            if (!prev) return prev;
            
            // Keep important previous properties if the new data is missing them
            const updatedAgent = {
              ...prev,
              ...agentData,
              // Ensure we keep the imageUrl if the new data doesn't have it
              imageUrl: agentData.imageUrl || prev.imageUrl,
              // Keep previous image array if new one is empty
              images: (agentData.images && agentData.images.length > 0) ? 
                      agentData.images : prev.images,
              // Ensure we merge likes, reviews, etc.
              likes: agentData.likes || prev.likes,
              rating: agentData.rating || prev.rating,
              downloadCount: agentData.downloadCount || prev.downloadCount,
              reviews: (agentData.reviews && agentData.reviews.length > 0) ?
                       agentData.reviews : prev.reviews
            };
            
            return updatedAgent;
          });
          
          // Update likes count
          if (agentData.likes) {
            if (Array.isArray(agentData.likes)) {
              setLikesCount(agentData.likes.length);
            } else if (typeof agentData.likes === 'number') {
              setLikesCount(agentData.likes);
            }
          }
          
          // Update download count
          if (agentData.downloadCount) {
            setDownloadCount(agentData.downloadCount);
          }
        } finally {
          // Always clear the timeout
          if (timeoutId) clearTimeout(timeoutId);
        }
      } catch (error) {
        consecutiveErrors++; // Increment error counter
        
        if (error.name === 'AbortError' || error.code === 'ERR_CANCELED' || 
            (error.message && (error.message.includes('aborted') || error.message.includes('canceled')))) {
          console.log('Agent update poll was aborted: ', error.message);
          // Don't treat this as a fatal error
        } else if (error.code === 'ERR_NETWORK') {
          console.log('Network error during agent poll - will retry later');
        } else if (error.response && error.response.status === 404) {
          console.error('Agent not found (404) - stopping periodic updates');
          if (intervalId) {
            clearInterval(intervalId);
          }
        } else {
          console.error('Error polling agent data:', error);
        }
      }
    };
    
    // Initial fetch - only do this once with a short delay to prevent race conditions
    setTimeout(fetchData, 1000);
    
    // Set interval for very infrequent polling (60 minutes) to drastically reduce quota usage
    intervalId = setInterval(fetchData, 60 * 60 * 1000);
    
    // Return cleanup function
    return () => {
      console.log('Cleaning up polling interval and visibility listener');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  };

  // Also modify the second useEffect to avoid duplicate fetching
  useEffect(() => {
    // Skip if we don't have an agent ID or if already loading or if reviews are already loaded
    if (!agentId || loading || (agent && agent.reviews && agent.reviews.length > 0)) return;
    
    // Use the ref from the component level to ensure this effect only runs once per agent ID
    if (reviewsFetchedRef.current) return;
    reviewsFetchedRef.current = true;
    
    // Fetch reviews directly on page load
    const fetchReviews = async () => {
      try {
        console.log('Proactively fetching reviews on page load');
        const reviews = await getAgentReviews(agentId);
        if (reviews && Array.isArray(reviews)) {
          // Update the review count immediately
          setReviewCount(reviews.length);
          
          // Update the agent object with the reviews
          setAgent(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              reviews: reviews
            };
          });
        }
    } catch (err) {
        console.error('Error fetching reviews on page load:', err);
      }
    };
    
    fetchReviews();
  }, [agentId, loading, agent?.reviews?.length]); // Replace agent with agent?.reviews?.length

  const handleWishlistToggle = async () => {
    if (!user) {
      toast.error('Please sign in to add items to your wishlist');
      return;
    }
    
    try {
      // Use toggleWishlist API function rather than direct Firebase access
      const response = await toggleWishlist(agentId);
      
      if (response.success) {
        // Update local state
        setIsWishlisted(response.isInWishlist);
        toast.success(response.isInWishlist ? "Added to your wishlist" : "Removed from your wishlist");
      } else {
        console.error("Error updating wishlist:", response.error);
        toast.error("Error updating wishlist. Please try again later.");
      }
    } catch (error) {
      console.error("Error updating wishlist:", error);
      toast.error("Error updating wishlist. Please try again later.");
    }
  };
  
  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopySuccess('Link copied!');
        showToast('success', '🔗 Link copied to clipboard!', {
          icon: "🔗",
          autoClose: 2000
        });
        setTimeout(() => setCopySuccess(''), 2000);
      })
      .catch(err => {
        console.error('Could not copy link:', err);
        showToast('error', '❌ Could not copy link', {
          icon: "❌"
        });
      });
  };

  // Format the price for display
  const displayPrice = (agent) => {
    // First check for explicit free indicators
    if (isFreeAgent(agent)) {
      return (
        <div className="price-value-container free">
          <FaCheckCircle className="price-check" />
          <span className="price-value free">Free</span>
        </div>
      );
    }
    
    // Handle price details object with discounted price
    if (agent.priceDetails) {
      const { basePrice, discountedPrice, currency } = agent.priceDetails;
      const currencySymbol = currency === 'EUR' ? '€' : '$';
      
      // If there's a discount, show both prices
      if (discountedPrice !== undefined && discountedPrice < basePrice) {
        return (
          <>
            <span className="price-value discount-price">
              {currencySymbol}{discountedPrice.toFixed(2)}
            </span>
            <span className="original-price">
              {currencySymbol}{basePrice.toFixed(2)}
            </span>
            <span className="discount-badge">
              {Math.round((1 - discountedPrice / basePrice) * 100)}% OFF
            </span>
          </>
        );
      }
      
      // Otherwise just show regular price
      if (basePrice !== undefined) {
        return (
          <span className="price-value">
            {currencySymbol}{basePrice.toFixed(2)}
          </span>
        );
      }
    }
    
    // Fallback to formatted price from utils
    return (
      <span className="price-value">
        {formatPrice(agent.price)}
      </span>
    );
  };
  
  // Handle custom price change
  const handlePriceChange = (e) => {
    const value = e.target.value;
    setCustomPrice(value);
  };
  
  // Validate if price is valid (at or above minimum)
  const isPriceValid = () => {
    const minPrice = getMinimumPrice();
    const price = parseFloat(customPrice) || 0;
    return price >= minPrice;
  };

  // Safely format rating for display
  const formatRating = (rating) => {
    if (rating === undefined || rating === null) return '0.0';
    if (typeof rating === 'string') return rating;
    if (typeof rating === 'number') return rating.toFixed(1);
    return '0.0';
  };
  
  // Get file type data display
  const getFileDetails = () => {
    if (!agent) return null;
    
    if (agent.fileType === 'pdf' || (agent.fileDetails && agent.fileDetails.type === 'pdf')) {
      const pageCount = agent.fileDetails?.pageCount || agent.pageCount || 50;
      return `${pageCount} pages (PDF)`;
    }
    
    if (agent.fileType === 'audio' || (agent.fileDetails && agent.fileDetails.type === 'audio')) {
      const duration = agent.fileDetails?.duration || agent.duration || '30 mins';
      return `${duration} (Audio)`;
    }
    
    if (agent.fileType === 'video' || (agent.fileDetails && agent.fileDetails.type === 'video')) {
      const duration = agent.fileDetails?.duration || agent.duration || '15 mins';
      return `${duration} (Video)`;
    }
    
    if (agent.fileType === 'template' || (agent.fileDetails && agent.fileDetails.type === 'template')) {
      return 'Template - ready to use';
    }
    
    // Default case
    return 'Digital download';
  };
  
  // Navigate through slider
  const showSlide = (index) => {
    if (!agent || !agent.images) return;
    
    // Handle wrap-around
    let newIndex = index;
    if (newIndex >= agent.images.length) {
      newIndex = 0;
    } else if (newIndex < 0) {
      newIndex = agent.images.length - 1;
    }
    
    setCurrentSlide(newIndex);
  };
  
  const nextSlide = () => {
    showSlide(currentSlide + 1);
  };
  
  const prevSlide = () => {
    showSlide(currentSlide - 1);
  };
  
  // Get image url array for slider
  const getImageUrls = () => {
    if (!agent) return [null];
    
    const validUrls = [];
    
    // If agent has images array, use it
    // if (agent.images && Array.isArray(agent.images) && agent.images.length > 0) {
    //   console.log('Using agent.images array');
      
    //   // Filter out any invalid URLs
    //   agent.images.forEach(url => {
    //     if (url && typeof url === 'string' && url.trim() !== '') {
    //       validUrls.push(url);
    //     }
    //   });
    // }
    
    // If agent has gallery array, add those too
    // if (agent.gallery && Array.isArray(agent.gallery) && agent.gallery.length > 0) {
    //   console.log('Adding gallery images');
      
    //   agent.gallery.forEach(item => {
    //     // Handle both string URLs and object format
    //     if (typeof item === 'string' && item.trim() !== '') {
    //       validUrls.push(item);
    //     } else if (item && typeof item === 'object' && item.url) {
    //       validUrls.push(item.url);
    //     }
    //   });
    // }
    
    // Add the main imageUrl if it exists and isn't already in the array
    // if (agent.imageUrl && !validUrls.includes(agent.imageUrl)) {
    //   console.log('Adding main imageUrl');
    //   validUrls.push(agent.imageUrl);
    // }
    
    // Check for image object format
    if (agent.image && typeof agent.image === 'object' && agent.image.url && !validUrls.includes(agent.image.url)) {
      console.log('Adding image.url');
      validUrls.push(agent.image.url);
    }
    
    // Check for iconUrl if we need more images
    if (agent.iconUrl && !validUrls.includes(agent.iconUrl)) {
      console.log('Adding iconUrl');
      validUrls.push(agent.iconUrl);
    }
    
    // If no valid images were found, add a placeholder
    if (validUrls.length === 0) {
      console.log('No valid images found, using placeholder');
      const title = agent.title || agent.name || 'Agent';
      const placeholderUrl = `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"%3E%3Crect width="300" height="200" fill="%234a4de7"/%3E%3Ctext x="150" y="100" font-family="Arial" font-size="24" text-anchor="middle" fill="white"%3E${encodeURIComponent(title)}%3C/text%3E%3C/svg%3E`;
      validUrls.push(placeholderUrl);
    }
    
    // Deduplicate the URLs
    const uniqueUrls = [...new Set(validUrls)];
    console.log(`Assembled ${uniqueUrls.length} unique image URLs for agent`);
    
    return uniqueUrls;
  };

  // Handle add to cart click
  const handleAddToCart = () => {
    if (!isPriceValid()) {
      showToast('warning', '⚠️ Please enter a valid price', {
        icon: "⚠️"
      });
      return;
    }
    
    try {
      // Create a product object from the agent data
      const product = {
        id: agent.id,
        title: agent.title,
        price: parseFloat(customPrice),
        imageUrl: agent.imageUrl || getImageUrls()[0],
        quantity: 1
      };
      
      // Add to cart using the context function
      addToCart(product);
      
      showToast('success', '🛒 Added to cart! Continue shopping or proceed to checkout.', {
        icon: "🛒",
        autoClose: 3000
      });
      
      // Record the download with the new API
      // recordAgentDownload(agentId).then(result => {
      //   if (result.success) {
      //     setDownloadCount(prev => prev + 1);
      //   }
      //   console.log('Download recorded successfully:', result);
      //   setIsDownloading(false);
      //   toast.success('Download complete!');
      // }).catch(err => {
      //   console.error('Error recording download:', err);
      //   // Still increment the display count since the user won't see this error
      //   setDownloadCount(prev => prev + 1);
      // });
    } catch (err) {
      console.error('Error adding to cart:', err);
      showToast('error', '❌ Could not add item to cart. Please try again.', {
        icon: "❌"
      });
    }
  };

  // Handle image load to determine aspect ratio
  const handleImageLoad = () => {
    if (imageRef.current) {
      const { naturalWidth, naturalHeight } = imageRef.current;
      const ratio = naturalWidth / naturalHeight;
      // Consider images with ratio less than 1 as portrait
      setImageAspectRatio(ratio < 1 ? 'portrait' : 'landscape');
    }
  };
  
  // Handle like update from LikeButton
  const handleLikeUpdate = (newLikesCount) => {
    setLikesCount(newLikesCount);
    
    // Also update the agent object to keep it in sync
    setAgent(prev => {
      if (!prev) return prev;
      
      return {
        ...prev,
        likes: typeof prev.likes === 'number' ? newLikesCount : 
               Array.isArray(prev.likes) ? [...Array(newLikesCount)].map(() => ({})) : newLikesCount
      };
    });
  };

  // Add a function to handle direct download for free agents
  const handleDirectDownload = async () => {
    if (!user) {
      showToast('info', '👋 Please sign in to download this agent', {
        icon: "👋",
        autoClose: 4000
      });
      return;
    }
    
    try {
      setLoading(true);
      const downloadResult = await downloadFreeAgent(agentId);
      
      if (downloadResult.success) {
        // Increment download count in UI
        setDownloadCount(prev => prev + 1);
        
        // Show success message
        showToast('success', '✅ Download successful!', {
          icon: "✅",
          autoClose: 3000
        });
        
        // If we have a download URL, download it
        if (downloadResult.downloadUrl) {
          try {
            // Create a more robust download function with fallbacks
            const downloadFile = async () => {
              try {
                // First try the proxy approach
                const proxyUrl = `/api/agents/${agentId}/download-file?url=${encodeURIComponent(downloadResult.downloadUrl)}`;
                console.log('Attempting to download via proxy:', proxyUrl);
                
                // Create a hidden iframe to trigger the download
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                document.body.appendChild(iframe);
                
                // Set up a timeout to detect if download fails
                let downloadStarted = false;
                const timeoutId = setTimeout(() => {
                  if (!downloadStarted) {
                    console.log('Proxy download timed out, trying fallback method');
                    // Try direct link as fallback
                    window.open(downloadResult.downloadUrl, '_blank');
                    showToast('info', 'Using fallback download method...', {
                      autoClose: 3000
                    });
                  }
                }, 5000);
                
                // Set the iframe source to the proxy URL
                iframe.src = proxyUrl;
                downloadStarted = true;
                
                // Clean up the iframe after a delay
                setTimeout(() => {
                  clearTimeout(timeoutId);
                  if (iframe.parentNode) {
                    document.body.removeChild(iframe);
                  }
                }, 10000);
                
                showToast('success', '📥 File download initiated', {
                  autoClose: 3000
                });
              } catch (error) {
                console.error('Download via proxy failed:', error);
                
                // Fallback: Try direct download
                console.log('Trying direct download as fallback');
                window.open(downloadResult.downloadUrl, '_blank');
                
                showToast('info', 'Using alternative download method...', {
                  autoClose: 3000
                });
              }
            };
            
            // Start the download process
            await downloadFile();
            
          } catch (error) {
            console.error('All download methods failed:', error);
            showToast('error', `Download failed. Please try again later.`, {
              icon: "❌",
              autoClose: 5000
            });
          }
        } else {
          // Show a message if no direct URL is available
          showToast('info', 'Download processed. If download doesn\'t start automatically, check your email.', {
            autoClose: 5000
          });
        }
      } else {
        throw new Error(downloadResult.message || 'Download failed');
      }
    } catch (error) {
      console.error('Error downloading free agent:', error);
      showToast('error', `❌ Download failed: ${error.message || 'Unknown error'}`, {
        icon: "❌",
        autoClose: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  // Get minimum price
  const getMinimumPrice = () => {
    if (!agent) return 0;
    
    // First check price details for minimum price or base price
    if (agent.priceDetails) {
      if (agent.priceDetails.minimumPrice !== undefined) {
        return agent.priceDetails.minimumPrice;
      }
      
      if (agent.priceDetails.basePrice !== undefined) {
        return agent.priceDetails.basePrice;
      }
      
      if (agent.priceDetails.discountedPrice !== undefined) {
        return agent.priceDetails.discountedPrice;
      }
    }
    
    // Handle standard price field
    if (typeof agent.price === 'number') {
      return agent.price;
    }
    
    if (typeof agent.price === 'string') {
      // Check for free indicators
      if (agent.price === 'Free' || 
          agent.price === 'free' || 
          agent.price === '$0' || 
          agent.price === '0') {
        return 0;
      }
      
      // Try to extract numeric value
      const parsed = parseFloat(agent.price.replace(/[^0-9.]/g, '')) || 0;
      return parsed;
    }
    
    // If price is an object, try to extract basePrice
    if (agent.price && typeof agent.price === 'object') {
      if (agent.price.basePrice !== undefined) {
        return agent.price.basePrice;
      }
    }
    
    // Default to 0 (free) if we can't determine price
    return 0;
  };

  if (loading) {
    return (
      <div className="agent-detail-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading agent details...</p>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="agent-detail-container">
        <div className="error-container">
          <h2>Agent Not Found</h2>
          <p>{error || 'Could not find the agent you\'re looking for.'}</p>
          <Link to="/agents" className="back-button">Return to Agents</Link>
        </div>
      </div>
    );
  }
  
  const imageUrls = getImageUrls();
  const minPrice = getMinimumPrice();
  const fileDetails = getFileDetails();

  return (
    <div className="agent-detail-container">
      <div className="agent-detail-breadcrumb">
        <Link to="/">Home</Link> / <Link to="/agents">Agents</Link> / <span>{agent.title}</span>
      </div>

      <div className="agent-detail-content">
        {/* Image Slider Section */}
        <div className="image-slider-section">
          <div className="image-slider" ref={sliderRef}>
            <div className="slider-container">
              {imageUrls.length > 1 && (
                <button className="slider-arrow left-arrow" onClick={prevSlide}>
                  <FaArrowLeft />
                </button>
              )}
              
              <div className="slide">
                <img 
                  ref={imageRef}
                  src={imageUrls[currentSlide] || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"%3E%3Crect width="300" height="200" fill="%234a4de7"/%3E%3Ctext x="150" y="100" font-family="Arial" font-size="24" text-anchor="middle" fill="white"%3EAgent%3C/text%3E%3C/svg%3E'} 
                  alt={`${agent.title} - slide ${currentSlide + 1}`} 
                  className="slide-image" 
                  onLoad={handleImageLoad}
                  data-aspect={imageAspectRatio}
                />
              </div>
              
              {imageUrls.length > 1 && (
                <button className="slider-arrow right-arrow" onClick={nextSlide}>
                  <FaArrowRight />
                </button>
              )}
            </div>
            
            {imageUrls.length > 1 && (
              <div className="slide-indicators">
                {imageUrls.map((_, index) => (
                  <button 
                    key={index} 
                    className={`indicator ${index === currentSlide ? 'active' : ''}`}
                    onClick={() => showSlide(index)}
                  ></button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Agent Info and Purchase Section */}
        <div className="agent-info-section">
          <h1 className="agent-title">{agentTitle}</h1>
          
          <div className="agent-meta-row">
            <div className="price-display">
              {displayPrice(agent)}
            </div>
            
            <div className="creator-info">
              <span className="by-text">by</span>
              <a href="#" className="creator-name">
                {agent.creator?.username || agent.creator?.name || agent.creator?.role || "Unknown Creator"}
              </a>
            </div>
            
            <div className="rating-display">
              <div className="stars">
                <StarRating rating={agentRatingValue} />
              </div>
              <span className="rating-count">({reviewCount || agent?.rating?.count || 0})</span>
              <LikeButton 
                agentId={agentId} 
                initialLikes={likesCount} 
                onLikeUpdate={handleLikeUpdate} 
              />
            </div>
          </div>
          
          <div className="agent-description">
            <p>{agentDescription}</p>
          </div>
          
          <div className="price-purchase-container">
            {isFreeAgent(agent) ? (
              // Free agent - show direct download button
              <div className="free-download-container">
                <div className="free-agent-notice">
                  <span className="free-label">Free</span>
                  <p className="free-description">This agent is available for free</p>
                </div>
                <button 
                  className="download-now-btn"
                  onClick={handleDirectDownload}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Download Now'}
                </button>
              </div>
            ) : (
              // Paid agent - show the normal price input and cart button
              <>
                <div className="name-your-price">
                  <label htmlFor="custom-price">Name a fair price:</label>
                  <div className="price-input-container">
                    <span className="currency-symbol">$</span>
                    <input 
                      type="number" 
                      id="custom-price" 
                      className="custom-price-input" 
                      value={customPrice}
                      onChange={handlePriceChange}
                      min={minPrice}
                      step="0.01"
                    />
                  </div>
                  <p className="minimum-price-note">
                    {agent.priceDetails && agent.priceDetails.basePrice > 0 && 
                     agent.priceDetails.discountedPrice < agent.priceDetails.basePrice ? (
                      <>The minimum price is ${minPrice.toFixed(2)} <span className="pricing-note">(Discounted from ${agent.priceDetails.basePrice.toFixed(2)})</span></>
                    ) : (
                      <>The minimum price is {formatPrice(minPrice)}</>
                    )}
                  </p>
                </div>
                
                <button 
                  className={`add-to-cart-btn ${!isPriceValid() ? 'disabled' : ''}`}
                  disabled={!isPriceValid()}
                  onClick={handleAddToCart}
                >
                  Add to cart
                </button>
              </>
            )}
            
            <div className="downloads-info">
              <FaDownload className="download-icon" />
              <span className="download-count">{downloadCount} downloads</span>
            </div>
          </div>
          
          <div className="file-details-section">
            <div className="file-info">
              <span className="file-detail">{fileDetails}</span>
            </div>
          </div>
          
          <div className="agent-actions">
            <button 
              className={`wishlist-btn ${isWishlisted ? 'active' : ''}`}
              onClick={handleWishlistToggle}
              disabled={wishlistLoading}
            >
              {isWishlisted ? <FaHeart /> : <FaRegHeart />}
              <span>{isWishlisted ? 'Added to wishlist' : 'Add to wishlist'}</span>
            </button>
            
            <button className="copy-link-btn" onClick={handleCopyLink}>
              <FaLink />
              <span>{copySuccess || 'Copy link'}</span>
            </button>
            
            <button className="share-btn">
              <FaShare />
              <span>Share</span>
            </button>
          </div>
          
          <div className="guarantee-info">
            <p>30-day money back guarantee</p>
          </div>
        </div>
      </div>

      {/* Tabs for different sections */}
      <div className="agent-detail-tabs">
        <button 
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-button ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          Reviews ({reviewCount})
        </button>
        <button 
          className={`tab-button ${activeTab === 'related' ? 'active' : ''}`}
          onClick={() => setActiveTab('related')}
        >
          Related Items
        </button>
      </div>
      
      {/* Tab content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="overview-content">
              {agent.longDescription ? (
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(agent.longDescription) 
                  }} 
                />
              ) : (
                <div className="default-overview">
                  <h3>About this agent</h3>
                  <p>{agent.description || 'No detailed description available for this agent.'}</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'reviews' && (
          <div className="reviews-tab">
            <CommentSection 
              agentId={agentId} 
              existingReviews={agent.reviews || []} 
              onReviewsLoaded={(count) => setReviewCount(count)}
            />
          </div>
        )}
        
        {activeTab === 'related' && (
          <div className="related-tab">
            <h3 className="section-heading">Related Products</h3>
            {agent.relatedAgents && agent.relatedAgents.length > 0 ? (
              <div className="related-agents-grid">
                {agent.relatedAgents.map(relatedAgent => (
                  <Link 
                    key={relatedAgent.id} 
                    to={`/agents/${relatedAgent.id}`} 
                    className="related-agent-card"
                  >
                    <div className="related-image-container">
                      <img 
                        src={relatedAgent.imageUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"%3E%3Crect width="300" height="200" fill="%234a4de7"/%3E%3Ctext x="150" y="100" font-family="Arial" font-size="24" text-anchor="middle" fill="white"%3EAgent%3C/text%3E%3C/svg%3E'} 
                        alt={relatedAgent.title || 'Related Agent'} 
                      />
                    </div>
                    <div className="related-info">
                      <h4>{relatedAgent.title}</h4>
                      <div className="related-meta">
                        <div className="related-price">
                          {formatPrice(relatedAgent.price)}
                        </div>
                        <div className="related-rating">
                          <FaStar className="star-icon" />
                          <span>{formatRating(relatedAgent.rating?.average || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="no-related">No related products found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentDetail; 