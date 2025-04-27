import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FaStar, FaRegStar, FaCheck, FaDownload, FaHeart, FaRegHeart, FaLink, FaArrowLeft, FaArrowRight, FaThumbsUp, FaComment, FaShare } from 'react-icons/fa';
import { 
  fetchAgentById, 
  toggleWishlist, 
  getAgentDownloadCount, 
  incrementAgentDownloadCount,
  toggleAgentLike,
  getAgentReviews,
  addAgentReview 
} from '../../utils/api';
import { useCart } from '../../contexts/CartContext.jsx';
import { AuthContext } from '../../contexts/AuthContext';
import { trackProductView } from '../../services/recommendationService';
import DOMPurify from 'dompurify';
import { toast } from 'react-toastify';
import { onSnapshot, doc, collection, query, where, orderBy, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import './AgentDetail.css';

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
  
  useEffect(() => {
    // Initialize like count properly - handle array or number
    if (Array.isArray(initialLikes)) {
      setLikeCount(initialLikes.length);
    } else if (typeof initialLikes === 'number') {
      setLikeCount(initialLikes);
    }
    
    // Check if the current user has liked this agent
    if (user && agentId) {
      console.log(`Setting up Firebase listeners for like status. User ID: ${user.uid}, Agent ID: ${agentId}`);
      
      const userLikesRef = doc(db, 'user_likes', `${user.uid}_${agentId}`);
      const agentRef = doc(db, 'agents', agentId);
      
      // Also check directly if user is in likes array
      const checkUserLiked = async () => {
        try {
          const agentDoc = await getDoc(agentRef);
          if (agentDoc.exists()) {
            const data = agentDoc.data();
            if (data.likes && Array.isArray(data.likes)) {
              const isUserInLikesArray = data.likes.includes(user.uid);
              console.log(`Initial check: User in likes array: ${isUserInLikesArray}`);
              setLiked(isUserInLikesArray);
            }
          }
        } catch (error) {
          console.error("Error checking likes array:", error);
        }
        
        setInitialStateLoaded(true);
      };
      
      checkUserLiked();
      
      // Listen for changes to the user's like status
      const userLikeUnsubscribe = onSnapshot(userLikesRef, (docSnapshot) => {
        const userHasLiked = docSnapshot.exists();
        console.log(`Firebase like status updated: User has liked: ${userHasLiked}`);
        setLiked(userHasLiked);
      }, (error) => {
        console.error("Error in user like listener:", error);
      });
      
      // Listen for changes to the agent's like count
      const agentUnsubscribe = onSnapshot(agentRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          console.log("Agent data updated:", data.likes);
          if (data.likes) {
            if (Array.isArray(data.likes)) {
              setLikeCount(data.likes.length);
              // Also check if user is in the likes array
              const userInLikesArray = data.likes.includes(user.uid);
              console.log(`Agent update: User in likes array: ${userInLikesArray}`);
              setLiked(userInLikesArray);
            } else if (typeof data.likes === 'number') {
              setLikeCount(data.likes);
            }
          }
        }
      }, (error) => {
        console.error("Error in agent listener:", error);
      });
      
      return () => {
        console.log("Cleaning up like listeners");
        userLikeUnsubscribe();
        agentUnsubscribe();
      };
    } else {
      console.log("No user or agent ID, setting initialStateLoaded = true");
      setInitialStateLoaded(true);
    }
  }, [user, agentId, initialLikes]);
  
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
  const [comments, setComments] = useState(existingReviews);
  const [newComment, setNewComment] = useState('');
  const [rating, setRating] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [hasUserReviewed, setHasUserReviewed] = useState(false);
  const [showSignInPopup, setShowSignInPopup] = useState(false);
  const [showSignUpPopup, setShowSignUpPopup] = useState(false);
  
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
    // Load comments without Firebase listeners for unauthenticated users
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
    
    // Always load comments via REST API (works for both authenticated and unauthenticated users)
    loadComments();
    
    // Only set up Firebase realtime listener if user is authenticated
    let unsubscribe = null;
    
    if (user && agentId) {
      try {
        console.log("Setting up Firebase listener for reviews (authenticated user)");
        // Set up realtime listener for new reviews
        const reviewsQuery = query(
          collection(db, 'agent_reviews'),
          where('agentId', '==', agentId),
          orderBy('createdAt', 'desc')
        );
        
        unsubscribe = onSnapshot(reviewsQuery, (snapshot) => {
          const updatedComments = [];
          snapshot.forEach(doc => {
            updatedComments.push({
              id: doc.id,
              ...doc.data()
            });
          });
          
          if (updatedComments.length) {
            setComments(updatedComments);
            
            // Check if current user has already reviewed
            const userReview = updatedComments.find(review => review.userId === user.uid);
            setHasUserReviewed(!!userReview);
          }
        }, (error) => {
          console.error('Error in reviews listener:', error);
        });
      } catch (err) {
        console.error("Error setting up Firebase listener:", err);
      }
    }
    
    return () => {
      if (unsubscribe) {
        console.log("Cleaning up Firebase listener for reviews");
        unsubscribe();
      }
    };
  }, [agentId, user]);
  
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
    
    if (!newComment.trim()) {
      setError('Please enter a comment');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const commentData = {
        content: newComment,
        rating: rating
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
        
        // We don't need to manually update the state as the realtime listener will catch it
        // But we should update the review count
        setComments(prevComments => {
          const updatedComments = [...prevComments, newCommentObj];
          if (onReviewsLoaded) {
            onReviewsLoaded(updatedComments.length);
          }
          return updatedComments;
        });
        
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
  
  // Nice authentication prompt for users who aren't signed in
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
      
      {user && !hasUserReviewed ? (
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
  
  // Firebase listener for real-time updates
  const firebaseListener = useRef(null);
  
  // Image slider refs
  const sliderRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
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
        
        // Try to load the agent data
        const data = await fetchAgentById(agentId);
        console.log('Successfully loaded agent data:', data);
        
        // Debug - check the image URL structures
        console.log('Image URL check:',
          { 
            imageUrl: data?.imageUrl,
            imageObj: data?.image,
            imageObjUrl: data?.image?.url, 
            hasDataField: !!data?.data,
            dataFieldType: data?.data ? typeof data.data : 'none'
          }
        );
        
        // If data.data is a string, try to parse it to see if it contains the image URL
        if (data?.data && typeof data.data === 'string') {
          try {
            const parsedData = JSON.parse(data.data);
            console.log('Parsed data.data for imageUrl:', parsedData?.imageUrl);
            
            // If data has a parsed imageUrl but the main object doesn't, add it
            if (parsedData.imageUrl && !data.imageUrl) {
              data.imageUrl = parsedData.imageUrl;
              console.log('Added imageUrl from parsed data:', data.imageUrl);
            }
          } catch (e) {
            console.error('Error parsing data.data:', e);
          }
        }
        
        // If we have image object but no imageUrl, use the image.url
        if (!data.imageUrl && data.image && data.image.url) {
          data.imageUrl = data.image.url;
          console.log('Using image.url as imageUrl:', data.imageUrl);
        }
        
        setAgent(data);
        
        // Set initial review count if available
        if (data.reviews && Array.isArray(data.reviews)) {
          setReviewCount(data.reviews.length);
        } else {
          // If reviews aren't in agent data, fetch them
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
        if (data.likes) {
          if (Array.isArray(data.likes)) {
            setLikesCount(data.likes.length);
          } else if (typeof data.likes === 'number') {
            setLikesCount(data.likes);
          }
        }
        
        // Fetch the download count
        const downloads = await getAgentDownloadCount(agentId);
        setDownloadCount(downloads);
        
        // Set initial price value if agent data is available
        if (data && data.price) {
          const basePrice = typeof data.price === 'number' ? data.price : 
                           typeof data.price === 'string' ? parseFloat(data.price.replace(/[^0-9.]/g, '')) || 0 : 0;
          setCustomPrice(basePrice.toString());
        }
        
        setIsWishlisted(data.isWishlisted || false);
        
        // Set up real-time updates with Firebase
        setupRealtimeUpdates(agentId);
      } catch (err) {
        console.error('Error loading agent:', err);
        if (err.response && err.response.status === 400) {
          setError(`Agent with ID "${agentId}" not found. It may have been removed or doesn't exist.`);
        } else {
          setError(`There was a problem loading this product. Please try again later.`);
        }
      } finally {
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
    
    // Clean up Firebase listener on unmount
    return () => {
      if (firebaseListener.current) {
        firebaseListener.current();
      }
    };
  }, [agentId, viewTracked, navigate]);
  
  // Set up real-time updates using Firebase
  const setupRealtimeUpdates = (id) => {
    // Clean up previous listener
    if (firebaseListener.current) {
      firebaseListener.current();
    }
    
    // For unauthenticated users, use REST API instead of Firestore listener
    if (!user) {
      console.log('User not authenticated, using REST API for updates');
      // Fetch initial data via REST API and schedule periodic updates
      const fetchData = async () => {
        try {
          // Get stats from REST API
          const statsResponse = await fetch(`/api/agents/${id}/stats`);
          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            
            // Update agent with the stats data
            setAgent(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                likes: statsData.likes || [],
                rating: statsData.rating || prev.rating,
                reviews: statsData.reviews || prev.reviews,
                downloadCount: statsData.downloadCount || prev.downloadCount
              };
            });
            
            // Update likes count
            if (statsData.likes) {
              if (Array.isArray(statsData.likes)) {
                setLikesCount(statsData.likes.length);
              } else if (typeof statsData.likes === 'number') {
                setLikesCount(statsData.likes);
              }
            }
            
            // Update download count
            if (statsData.downloadCount) {
              setDownloadCount(statsData.downloadCount);
            }
          }
        } catch (error) {
          console.error('Error fetching agent stats:', error);
        }
      };
      
      // Fetch initial data
      fetchData();
      
      // Set interval for polling updates (every 30 seconds)
      const intervalId = setInterval(fetchData, 30000);
      
      // Return cleanup function
      return () => clearInterval(intervalId);
    }
    
    // For authenticated users, use Firebase listener
    try {
      firebaseListener.current = onSnapshot(doc(db, 'agents', id), (docSnapshot) => {
        if (docSnapshot.exists()) {
          const docData = docSnapshot.data();
          
          // Update only specific fields that might change
          setAgent(prev => {
            if (!prev) return { id, ...docData };
            
            return {
              ...prev,
              likes: docData.likes || [],
              rating: docData.rating || prev.rating,
              reviews: docData.reviews || prev.reviews,
              downloadCount: docData.downloadCount || prev.downloadCount
            };
          });
          
          // Update likes count properly
          if (docData.likes) {
            if (Array.isArray(docData.likes)) {
              setLikesCount(docData.likes.length);
            } else if (typeof docData.likes === 'number') {
              setLikesCount(docData.likes);
            }
          }
          
          // Update review count if available
          if (docData.reviews && Array.isArray(docData.reviews)) {
            setReviewCount(docData.reviews.length);
          }
          
          // Update download count if changed
          if (docData.downloadCount && docData.downloadCount !== downloadCount) {
            setDownloadCount(docData.downloadCount);
          }
        }
      }, (error) => {
        console.error('Firebase listener error:', error);
        // If we get a permission error, fall back to REST API
        if (error.code === 'permission-denied') {
          console.log('Firebase permission denied, falling back to REST API');
          setupRealtimeUpdates(id);
        }
      });
    } catch (error) {
      console.error('Error setting up Firebase listener:', error);
    }
  };

  const handleWishlistToggle = async () => {
    if (!user) {
      toast.error('Please sign in to add items to your wishlist');
      return;
    }
    
    try {
      // Get current agent info
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        console.error("User document not found");
        toast.error("Error updating wishlist. Please try again later.");
        return;
      }
      
      const userData = userSnap.data();
      const wishlist = userData.wishlist || [];
      
      // Check if agent is already in wishlist
      const isInWishlist = wishlist.some(item => item.id === agent.id);
      
      let updatedWishlist;
      
      if (isInWishlist) {
        // Remove from wishlist
        updatedWishlist = wishlist.filter(item => item.id !== agent.id);
        toast.success("Removed from your wishlist");
      } else {
        // Add to wishlist
        const wishlistItem = {
          id: agent.id,
          name: agent.name,
          imageUrl: agent.images && agent.images.length > 0 ? agent.images[0] : '',
          category: agent.category || '',
          price: agent.price || {},
          createdAt: serverTimestamp()
        };
        
        updatedWishlist = [...wishlist, wishlistItem];
        toast.success("Added to your wishlist");
      }
      
      // Update wishlist in Firestore
      await updateDoc(userRef, {
        wishlist: updatedWishlist
      });
      
      // Update local state
      setIsWishlisted(!isInWishlist);
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

  // Update the formatPrice function to better handle price details
  const formatPrice = (price) => {
    if (!price && price !== 0) return 'Free';
    
    // Handle price details object
    if (price && typeof price === 'object' && price.basePrice !== undefined) {
      const currencySymbol = price.currency === 'EUR' ? '€' : 
                            price.currency === 'GBP' ? '£' : '$';
      
      if (price.basePrice === 0) return 'Free';
      return `${currencySymbol}${price.basePrice.toFixed(2)}`;
    }
    
    // Handle string and number types
    if (typeof price === 'string') {
      if (price.toLowerCase() === 'free') return 'Free';
      return price.startsWith('$') ? price : `$${price}`;
    }
    
    if (typeof price === 'number') {
      return price === 0 ? 'Free' : `$${price.toFixed(2)}`;
    }
    
    return 'Price unavailable';
  };
  
  // Get minimum price
  const getMinimumPrice = () => {
    if (!agent) return 0;
    
    if (agent.priceDetails && agent.priceDetails.minimumPrice !== undefined) {
      return agent.priceDetails.minimumPrice;
    }
    
    // Fall back to regular price if minimum not specified
    if (typeof agent.price === 'number') {
      return agent.price;
    }
    
    if (typeof agent.price === 'string') {
      const parsed = parseFloat(agent.price.replace(/[^0-9.]/g, '')) || 0;
      return parsed;
    }
    
    return 0;
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
    
    // If agent has images array, use it
    if (agent.images && Array.isArray(agent.images) && agent.images.length > 0) {
      console.log('Using agent.images array:', agent.images);
      return agent.images;
    }
    
    // If agent has a direct imageUrl, use it
    if (agent.imageUrl) {
      console.log('Using direct agent.imageUrl:', agent.imageUrl);
      return [agent.imageUrl];
    }
    
    // Check if image info exists in a nested structure
    if (agent.image && agent.image.url) {
      console.log('Using agent.image.url:', agent.image.url);
      return [agent.image.url];
    }
    
    // Try to extract from data field if it's a string
    if (agent.data && typeof agent.data === 'string') {
      try {
        const parsedData = JSON.parse(agent.data);
        if (parsedData.imageUrl) {
          console.log('Using parsed imageUrl from agent.data:', parsedData.imageUrl);
          return [parsedData.imageUrl];
        }
      } catch (e) {
        console.error('Error parsing agent.data in getImageUrls:', e);
      }
    }
    
    console.log('No image found, using fallback');
    return [null];
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
      
      // Update download count in the background
      incrementAgentDownloadCount(agentId).then(() => {
        setDownloadCount(prev => prev + 1);
      });
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
  const agentRating = agent.rating?.average || agent.rating || 0;

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
          <h1 className="agent-title">{agent.title}</h1>
          
          <div className="agent-meta-row">
            <div className="price-display">
              {agent.priceDetails && agent.priceDetails.basePrice > 0 && 
               agent.priceDetails.discountedPrice < agent.priceDetails.basePrice ? (
                <>
                  <span className="price-value discount-price">
                    ${agent.priceDetails.discountedPrice.toFixed(2)}
                  </span>
                  <span className="original-price">
                    ${agent.priceDetails.basePrice.toFixed(2)}
                  </span>
                  <span className="discount-badge">
                    {Math.round((1 - agent.priceDetails.discountedPrice / agent.priceDetails.basePrice) * 100)}% OFF
                  </span>
                </>
              ) : (
                <span className="price-value">{formatPrice(agent.price)}</span>
              )}
            </div>
            
            <div className="creator-info">
              <span className="by-text">by</span>
              <a href="#" className="creator-name">
                {agent.creator?.username || agent.creator?.name || agent.creator?.role || "Unknown Creator"}
              </a>
            </div>
            
            <div className="rating-display">
              <div className="stars">
                <StarRating rating={agentRating} />
              </div>
              <span className="rating-count">({agent.reviews?.length || agent.rating?.count || 0})</span>
              <LikeButton 
                agentId={agentId} 
                initialLikes={likesCount} 
                onLikeUpdate={handleLikeUpdate} 
              />
            </div>
          </div>
          
          <div className="agent-description">
            <p>{agent.description || 'No description available for this agent.'}</p>
          </div>
          
          <div className="price-purchase-container">
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