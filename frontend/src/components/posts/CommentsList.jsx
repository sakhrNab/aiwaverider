// src/components/posts/CommentsList.jsx
import React, { useState, useContext, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { AuthContext } from '../../contexts/AuthContext';
import { PostsContext } from '../../contexts/PostsContext';
import { likeComment, unlikeComment, deleteComment, updateComment, addComment } from '../../api/content/postApi';
import '../../styles/comments.css';  // Import the new CSS
import { FaRegHeart, FaHeart } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-toastify';
import debounce from 'lodash/debounce';

const CommentsList = ({ postId, comments, onAuthRequired, refreshComments }) => {
  const { user } = useContext(AuthContext);
  const { updateCommentInCache, addCommentToCache, removeCommentFromCache } = useContext(PostsContext);
  const [likingComments, setLikingComments] = useState(new Set());

  // Show only a few comments by default; increase as needed.
  const [visibleCount, setVisibleCount] = useState(4);
  // For replying to a comment (holds the comment id you are replying to)
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  // For editing a comment
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editText, setEditText] = useState('');
  const [error, setError] = useState('');

  // Debounced like/unlike function with better error handling
  const debouncedLikeAction = useCallback(
    debounce(async (commentId, isLiked, revertUpdate) => {
      if (!commentId || !postId) {
        console.error('[CommentsList] Invalid commentId or postId in debouncedLikeAction', { commentId, postId });
        setLikingComments(prev => {
          const next = new Set(prev);
          if (commentId) next.delete(commentId);
          return next;
        });
        return;
      }

      try {
        console.log(`[CommentsList] Making API request to ${isLiked ? 'unlike' : 'like'} comment ${commentId} for post ${postId}`);
        const response = isLiked 
          ? await unlikeComment(postId, commentId)
          : await likeComment(postId, commentId);
        
        // Verify response contains the updatedComment
        if (response && response.updatedComment) {
          console.log(`[CommentsList] ${isLiked ? 'Unlike' : 'Like'} comment API response successful for comment ${commentId}`);
          
          // Important: Using updatedComment to update the cache
          // This ensures we don't affect unrelated data like post likes
          updateCommentInCache(postId, response.updatedComment);
        } else {
          console.error('[CommentsList] Invalid response from like/unlike action', response);
          revertUpdate();
          toast.error('Failed to update like. Please try again.');
        }
      } catch (error) {
        console.error(`[CommentsList] Error ${isLiked ? 'unliking' : 'liking'} comment ${commentId}:`, error);
        // Revert optimistic update on error
        revertUpdate();
        toast.error('Failed to update like. Please try again.');
      } finally {
        // Only remove this specific comment's ID from the likingComments Set
        // This ensures other comment like buttons aren't affected
        setLikingComments(prev => {
          const next = new Set(prev);
          next.delete(commentId);
          return next;
        });
      }
    }, 300), // Reduced debounce time for better responsiveness
    [postId, unlikeComment, likeComment, updateCommentInCache]
  );

  const handleToggleLike = async (comment) => {
    if (!comment || !comment.id || !user || !user.uid) {
      console.warn('Invalid comment like attempt', { comment, user });
      return;
    }
    
    if (likingComments.has(comment.id)) {
      console.log('Already processing like action for this comment');
      return;
    }

    console.log(`Handling toggle like for comment: ${comment.id}`);
    
    // Make sure likes array is properly initialized
    const commentLikes = Array.isArray(comment.likes) ? comment.likes : [];
    const isLiked = commentLikes.includes(user.uid);
    const originalLikes = [...commentLikes];

    // Optimistic update
    const optimisticUpdate = () => {
      const updatedComment = {
        ...comment,
        likes: isLiked 
          ? commentLikes.filter(id => id !== user.uid)
          : [...commentLikes, user.uid]
      };
      console.log('Applying optimistic update for comment like');
      updateCommentInCache(postId, updatedComment);
    };

    // Revert function for error cases
    const revertUpdate = () => {
      const revertedComment = {
        ...comment,
        likes: originalLikes
      };
      console.log('Reverting optimistic update for comment like');
      updateCommentInCache(postId, revertedComment);
    };

    // Immediately add this comment's ID to the likingComments Set to disable the button
    setLikingComments(prev => new Set([...prev, comment.id]));
    
    // Apply optimistic update for immediate UI feedback
    optimisticUpdate();
    
    // Call the debounced function to make the actual API request
    // The button will remain disabled until this specific operation completes
    debouncedLikeAction(comment.id, isLiked, revertUpdate);
  };

  const handleReply = async (parentCommentId) => {
    if (!user) {
      toast.info(
        <div>
          Please <a href="/signin" className="text-blue-500 hover:text-blue-700">sign in</a> or{' '}
          <a href="/signup" className="text-blue-500 hover:text-blue-700">sign up</a> to reply to comments.
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
    
    if (!replyText.trim()) return;
    try {
      const newReply = await addComment(postId, { 
        commentText: replyText.trim(), 
        parentCommentId 
      });
      
      if (newReply) {
        addCommentToCache(postId, newReply);
        setReplyingTo(null);
        setReplyText('');
      }
    } catch (error) {
      console.error('Error adding reply', error);
      toast.error('Failed to add reply. Please try again.');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!user) {
      toast.info('Please sign in to delete comments.');
      return;
    }

    try {
      await deleteComment(postId, commentId);
      removeCommentFromCache(postId, commentId);
    } catch (err) {
      console.error('Error deleting comment:', err);
      toast.error('Failed to delete comment. Please try again.');
    }
  };

  const handleUpdate = async (commentId) => {
    if (!user) {
      toast.info('Please sign in to edit comments.');
      return;
    }
    
    if (!editText.trim()) return;
    try {
      const updatedComment = await updateComment(postId, commentId, { 
        commentText: editText.trim() 
      });
      
      if (updatedComment) {
        updateCommentInCache(postId, updatedComment);
        setEditingCommentId(null);
        setEditText('');
      }
    } catch (err) {
      console.error('Error updating comment:', err);
      toast.error('Failed to update comment. Please try again.');
    }
  };

  // Add this helper function at the top of the file
  const formatCommentDate = (dateValue) => {
    try {
      if (!dateValue) return 'Just now';
      
      // Handle Firestore Timestamp
      if (dateValue && typeof dateValue === 'object' && dateValue.seconds) {
        return formatDistanceToNow(new Date(dateValue.seconds * 1000), { addSuffix: true });
      }
      
      // Handle ISO string or other date formats
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return 'Just now';
      }
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Just now';
    }
  };

  // Group comments by parentCommentId
  const groupComments = (comments) => {
    const map = {};
    comments.forEach(comment => {
      const parentId = comment.parentCommentId || 'root';
      if (!map[parentId]) {
        map[parentId] = [];
      }
      map[parentId].push(comment);
    });
    return map;
  };

  const grouped = groupComments(comments);
  const topLevelComments = grouped['root'] || [];

  const renderComments = (commentsList, level = 0) => {
    return commentsList.slice(0, visibleCount).map(comment => (
      <div key={comment.id} className="comment-container" style={{ marginLeft: level * 20 }}>
        <div>
          <span className="comment-username">{comment.username || 'Anonymous'}</span>
          <span className="comment-time">
            {formatCommentDate(comment.createdAt)}
          </span>
          {editingCommentId === comment.id ? (
            <>
              <textarea 
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="comment-input"
                />
              <div className="mt-2 space-x-2">
                <button 
                className="reply-btn" 
                  onClick={() => handleUpdate(comment.id)}
                >
                Save
                </button>
                <button 
                className="cancel-btn" 
                onClick={() => {
                    setEditingCommentId(null);
                    setEditText('');
                }}
                >
                Cancel
                </button>
              </div>
            </>
            ) : (
            <span
                className="comment-text"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment.text) }}
            />
            )}
        </div>
        <div className="comment-actions">
          <button 
            onClick={() => handleToggleLike(comment)}
            className={`flex items-center space-x-2 px-3 py-1 rounded-full transition-all duration-200 ${
              user && comment.likes && Array.isArray(comment.likes) && comment.likes.includes(user.uid)
                ? 'bg-red-50 text-red-500 hover:bg-red-100'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            } ${likingComments.has(comment.id) ? 'opacity-60 cursor-not-allowed' : ''}`}
            disabled={!user || likingComments.has(comment.id)}
            title={user ? undefined : 'Sign in to like comments'}
            aria-busy={likingComments.has(comment.id)}
            aria-label={user && comment.likes && Array.isArray(comment.likes) && comment.likes.includes(user.uid)
              ? 'Unlike this comment' 
              : 'Like this comment'}
          >
            {user && comment.likes && Array.isArray(comment.likes) && comment.likes.includes(user.uid) ? (
              <FaHeart className={`w-4 h-4 text-red-500 ${likingComments.has(comment.id) ? 'animate-pulse' : ''}`} />
            ) : (
              <FaRegHeart className={`w-4 h-4 ${likingComments.has(comment.id) ? 'animate-pulse' : ''}`} />
            )}
            <span className={`font-medium ${
              user && comment.likes && Array.isArray(comment.likes) && comment.likes.includes(user.uid)
                ? 'text-red-500'
                : 'text-gray-600'
            }`}>
              {Array.isArray(comment.likes) ? comment.likes.length : 0}
            </span>
          </button>

          <button 
            onClick={() => setReplyingTo(comment.id)}
            className="reply-button hover:text-blue-600"
            disabled={!user}
            title={user ? undefined : 'Sign in to reply to comments'}
          >
            Reply
          </button>
          
          {user && (user.uid === comment.userId || user.role === 'admin') && (
            <>
              <button 
                onClick={() => {
                    setEditingCommentId(comment.id);
                  setEditText(comment.text);
                }}
                className="edit-button hover:text-blue-600"
              >
                Edit
              </button>
              <button 
                onClick={() => handleDeleteComment(comment.id)}
                className="delete-button hover:text-red-600"
              >
                Delete
              </button>
                </>
            )}
    </div>

        {replyingTo === comment.id && (
            <div className="reply-section" style={{ marginLeft: 20, marginTop: '4px' }}>
                <input 
                type="text"
                className="comment-input"
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                />
            <button 
              className="reply-btn" 
              onClick={() => handleReply(comment.id)}
            >
              Submit Reply
            </button>
            <button 
              className="cancel-btn" 
              onClick={() => { 
                setReplyingTo(null); 
                setReplyText(''); 
              }}
            >
              Cancel
            </button>
            </div>
        )}
        {grouped[comment.id] && renderComments(grouped[comment.id], level + 1)}
      </div>
    ));
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-red-500">{error}</p>}
      {renderComments(topLevelComments)}
      {topLevelComments.length > visibleCount && (
        <button 
          className="load-more-btn" 
          onClick={() => setVisibleCount(prev => prev + 4)}
        >
          Load More Comments
        </button>
      )}
    </div>
  );
};

export default CommentsList;
