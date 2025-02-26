import React, { useEffect, useState } from 'react';
import { getPost, getComments, getLikes } from '../services/firebase';
import { onSnapshot, doc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

const PostDetail = ({ postId, user, disableRealtime }) => {
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [likes, setLikes] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const loadPost = async () => {
      if (!postId) return;
      
      setIsLoading(true);
      try {
        const postData = await getPost(postId);
        if (postData) {
          setPost(postData);
          // Fetch initial comments
          const commentsData = await getComments(postId, 10); // Limit to 10 comments initially
          setComments(commentsData);
        }
      } catch (error) {
        console.error('Error loading post:', error);
        toast.error('Failed to load post');
      } finally {
        setIsLoading(false);
      }
    };

    if (postId) {
      loadPost();
    }
  }, [postId]);

  // Separate useEffect for comments pagination
  const loadMoreComments = async () => {
    if (!postId || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const lastComment = comments[comments.length - 1];
      const newComments = await getComments(postId, 10, lastComment);
      setComments(prev => [...prev, ...newComments]);
      setHasMore(newComments.length === 10);
    } catch (error) {
      console.error('Error loading more comments:', error);
      toast.error('Failed to load more comments');
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Add real-time updates for likes
  useEffect(() => {
if (!postId || disableRealtime) return;


    
    const unsubscribe = onSnapshot(doc(db, 'posts', postId), (doc) => {
      if (doc.exists()) {
        const postData = { id: doc.id, ...doc.data() };
        setLikes(postData.likes || 0);
      }
    });

    return () => unsubscribe();
  }, [postId, disableRealtime]);

  return (
    <div>
      {/* Render your component content here */}
    </div>
  );
};

export default PostDetail; 