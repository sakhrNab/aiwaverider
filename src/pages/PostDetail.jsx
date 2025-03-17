import React, { useEffect, useState } from 'react';
import { getPost, getComments, getLikes } from '../services/firebase';
import { onSnapshot, doc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { GridLoader, BeatLoader } from 'react-spinners';

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

  // Render loading state with AI-themed animation
  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[300px] py-12">
        <div className="mb-6">
          <GridLoader color="#6366F1" size={15} margin={2} speedMultiplier={0.8} />
        </div>
        <div className="text-indigo-600 text-lg font-medium mt-2">
          Neural processing...
        </div>
        <p className="mt-2 text-gray-500 text-sm">
          Analyzing content relationships
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Render your component content here */}
      
      {/* Show loading more animation at the bottom when loading more comments */}
      {isLoadingMore && (
        <div className="flex justify-center items-center py-4">
          <BeatLoader color="#6366F1" size={10} margin={4} speedMultiplier={0.7} />
          <span className="ml-4 text-indigo-500 text-sm">Loading more insights...</span>
        </div>
      )}
      
      {/* Load more button would go here */}
      {hasMore && !isLoadingMore && (
        <div className="text-center mt-4 mb-8">
          <button 
            onClick={loadMoreComments}
            className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors"
          >
            Load more comments
          </button>
        </div>
      )}
    </div>
  );
};

export default PostDetail; 