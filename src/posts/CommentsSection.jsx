// src/posts/CommentsSection.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { PostsContext } from '../contexts/PostsContext';
import { addComment } from '../utils/api';
import DOMPurify from 'dompurify';

const CommentsSection = ({ postId }) => {
  const { user, token } = useContext(AuthContext);
  const { getComments, addCommentToCache, commentsCache } = useContext(PostsContext);
  const [comments, setComments] = useState(() => commentsCache[postId] || []);
  const [newComment, setNewComment] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(!commentsCache[postId]);

  useEffect(() => {
    let mounted = true;
    
    const loadComments = async () => {
      // Skip if we already have cached comments
      if (commentsCache[postId]) {
        console.log('Using cached comments');
        setComments(commentsCache[postId]);
        setIsLoading(false);
        return;
      }

      try {
        console.log('Fetching comments');
        const data = await getComments(postId);
        if (mounted && data) {
          setComments(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadComments();

    return () => {
      mounted = false;
    };
  }, [postId, commentsCache]);

  // Update local comments when cache changes
  useEffect(() => {
    if (commentsCache[postId]) {
      setComments(commentsCache[postId]);
    }
  }, [commentsCache, postId]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const data = await addComment(postId, { commentText: newComment.trim() }, token);
      if (data.comment) {
        setComments([...comments, data.comment]);
        setNewComment('');
      } else {
        alert(data.error || 'Failed to add comment.');
      }
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('An error occurred.');
    }
  };

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-2">Comments</h2>
      {isLoading ? (
        <p className="text-gray-600">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-gray-600">No comments yet. Be the first to comment!</p>
      ) : (
        <ul className="space-y-2">
          {comments.map((comment) => (
            <li key={comment.id} className="border-b border-gray-200 pb-2">
              <strong>
                {comment.username} ({comment.userRole}):
              </strong>{' '}
              {DOMPurify.sanitize(comment.text)}
            </li>
          ))}
        </ul>
      )}

      {user ? (
        <div className="mt-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Write a comment..."
          />
          <button
            onClick={handleAddComment}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Add Comment
          </button>
        </div>
      ) : (
        <p className="text-gray-500 mt-2">You must be signed in to comment.</p>
      )}

      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
};

export default CommentsSection;
