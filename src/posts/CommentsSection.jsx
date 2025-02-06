// src/posts/CommentsSection.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { PostsContext } from '../contexts/PostsContext';
import { addComment } from '../utils/api';
import DOMPurify from 'dompurify';
import { auth } from '../utils/firebase';
import CommentsList from './CommentsList';

const CommentsSection = ({ postId }) => {
  const { user } = useContext(AuthContext);
  const { getComments, addCommentToCache, commentsCache, loadingComments } = useContext(PostsContext);
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newComment, setNewComment] = useState('');

  // Load comments with cache
  useEffect(() => {
    let mounted = true;
    const loadComments = async () => {
      try {
        setIsLoading(true);
        // Check cache first
        if (commentsCache[postId]) {
          setComments(commentsCache[postId]);
          setIsLoading(false);
          return;
        }

        const fetchedComments = await getComments(postId);
        if (mounted && Array.isArray(fetchedComments)) {
          setComments(fetchedComments);
          addCommentToCache(postId, fetchedComments);
        }
      } catch (err) {
        if (mounted) {
          setError('Failed to load comments');
          console.error('Error loading comments:', err);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadComments();
    return () => { mounted = false; };
  }, [postId, getComments, commentsCache, addCommentToCache]);

const handleAddComment = async () => {
  if (!newComment.trim()) return;
  
  // Verify authentication
  if (!user) {
    setError('You must be logged in to comment.');
    return;
  }

  try {

    const comment = await addComment(postId, { commentText: newComment.trim() });
    if (comment) {
      addCommentToCache(postId, comment);
      setComments(prev => [comment, ...prev]);
      setNewComment('');
      setError('');
    }
  } catch (err) {
    setError('Failed to add comment');
    console.error('Error adding comment:', err);
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
        <CommentsList postId={postId} comments={comments} refreshComments={loadingComments} />
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
