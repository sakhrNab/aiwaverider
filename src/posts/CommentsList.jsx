// src/posts/CommentsList.jsx
import React, { useState, useContext } from 'react';
import DOMPurify from 'dompurify';
import { AuthContext } from '../contexts/AuthContext';
import { PostsContext } from '../contexts/PostsContext';
import { likeComment, unlikeComment, deleteComment, updateComment, addComment } from '../utils/api';
import '../styles/comments.css';  // Import the new CSS
import { FaRegHeart, FaHeart } from 'react-icons/fa';

const CommentsList = ({ postId, comments, refreshComments }) => {
  const { user } = useContext(AuthContext);
  const { updateCommentInCache, addCommentToCache, removeCommentFromCache } = useContext(PostsContext);

  // Show only a few comments by default; increase as needed.
  const [visibleCount, setVisibleCount] = useState(4);
  // For replying to a comment (holds the comment id you are replying to)
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  // For editing a comment
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingText, setEditingText] = useState('');

  // Group comments by parentCommentId (if replying is used, top‐level comments have no parent)
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

  // Recursive renderer: pass current level for indentation.
  const renderComments = (commentsList, level = 0) => {
    return commentsList.slice(0, visibleCount).map(comment => (
      <div key={comment.id} className="comment-container" style={{ marginLeft: level * 20 }}>
        <div>
          <span className="comment-username">{comment.username}</span>
          {editingCommentId === comment.id ? (
            <>
                <input 
                type="text"
                className="comment-input"
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                />
                <button 
                className="reply-btn" 
                onClick={() => handleUpdateComment(comment.id)}
                >
                Save
                </button>
                <button 
                className="cancel-btn" 
                onClick={() => {
                    setEditingCommentId(null);
                    setEditingText('');
                }}
                >
                Cancel
                </button>
            </>
            ) : (
            <span
                className="comment-text"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment.text) }}
            />
            )}
        </div>
        <div className="comment-actions">
            <button onClick={() => handleToggleLike(comment)}>
                {comment.likes && comment.likes.includes(user?.uid) ? (
                <FaHeart color="#e0245e" size={16} />
                ) : (
                <FaRegHeart size={16} />
                )}{" "}
                <span>({comment.likes ? comment.likes.length : 0})</span>
            </button>
            {comment.likedBy && comment.likedBy.length > 0 && (
                <span className="liked-by">
                Liked by {comment.likedBy.map(u => u.username).join(', ')}
                </span>
            )}
            <button onClick={() => setReplyingTo(comment.id)}>Reply</button>
            {user && user.uid === comment.userId && (
                <>
                <button onClick={() => {
                    setEditingCommentId(comment.id);
                    setEditingText(comment.text);
                }}>Edit</button>
                <button onClick={() => handleDeleteComment(comment.id)}>Delete</button>
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
                <button className="reply-btn" onClick={() => handleReply(comment.id)}>Submit Reply</button>
                <button className="cancel-btn" onClick={() => { setReplyingTo(null); setReplyText(''); }}>Cancel</button>
            </div>
        )}
        {grouped[comment.id] && renderComments(grouped[comment.id], level + 1)}
      </div>
    ));
  };

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 4);
  };

  const handleToggleLike = async (comment) => {
    try {
      let updatedComment;
      if (comment.likes && comment.likes.includes(user.uid)) {
        updatedComment = await unlikeComment(postId, comment.id);
      } else {
        updatedComment = await likeComment(postId, comment.id);
      }
      updateCommentInCache(postId, updatedComment);
    } catch (error) {
      console.error('Error toggling like', error);
    }
  };

  const handleReply = async (parentCommentId) => {
    if (!replyText.trim()) return;
    try {
      // Pass parentCommentId along with the comment text.
      const newReply = await addComment(postId, { commentText: replyText.trim(), parentCommentId });
      addCommentToCache(postId, newReply);
      setReplyingTo(null);
      setReplyText('');
    } catch (error) {
      console.error('Error adding reply', error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(postId, commentId);
      // Remove the comment from the caches so the UI updates immediately
      removeCommentFromCache(postId, commentId);
    } catch (error) {
      console.error('Error deleting comment', error);
    }
  };
  
  const handleUpdateComment = async (commentId) => {
    if (!editingText.trim()) return;
    try {
      const updated = await updateComment(postId, commentId, { commentText: editingText.trim() });
      updateCommentInCache(postId, updated);
      setEditingCommentId(null);
    } catch (error) {
      console.error('Error updating comment', error);
    }
  };

  return (
    <div>
      {renderComments(topLevelComments)}
      {topLevelComments.length > visibleCount && (
        <button className="load-more-btn" onClick={handleLoadMore}>Load More Comments</button>
      )}
    </div>
  );
};

export default CommentsList;
