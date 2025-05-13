// src/posts/PostDetail.jsx
import React, { useEffect, useState, useContext, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { updatePost, incrementPostView } from '../../api/content/postApi';
import CommentsSection from './CommentsSection';
import DOMPurify from 'dompurify';
import { PostsContext } from '../../contexts/PostsContext';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import LikeButton from '../common/LikeButton';

// TipTap + EditorProvider
import { EditorProvider } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import ListItem from '@tiptap/extension-list-item';
import TextStyle from '@tiptap/extension-text-style';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import Image from '@tiptap/extension-image';
import { ImageResize } from 'tiptap-extension-resize-image';
import Youtube from '@tiptap/extension-youtube';
import TextAlign from '@tiptap/extension-text-align';

// A custom TaskItem extension for nested tasks
const CustomTaskItem = TaskItem.extend({
  content: 'inline*',
});

// We replicate the same Tiptap extensions used before
const extensions = [
  StarterKit.configure({
    bulletList: { keepMarks: true, keepAttributes: false },
    orderedList: { keepMarks: true, keepAttributes: false },
  }),
  TaskList.configure({
    HTMLAttributes: { class: 'custom-task-list' },
  }),
  TaskItem.configure({ nested: true }),
  Color.configure({ types: [TextStyle.name, ListItem.name] }),
  TextStyle,
  TextAlign.configure({
    types: ['heading', 'paragraph', 'image'],
    alignments: ['left', 'center', 'right', 'justify'],
    defaultAlignment: 'left',
  }),
  Image.configure({
    HTMLAttributes: { class: 'aligned-image' },
    resizable: true,
    inline: true,
    addAttributes() {
      return {
        style: {
          default: null,
          renderHTML: (attrs) => ({ style: attrs.style }),
          parseHTML: (el) => el.getAttribute('style'),
        },
        'data-align': {
          default: 'none',
          renderHTML: (attrs) => ({ 'data-align': attrs['data-align'] }),
          parseHTML: (el) => el.getAttribute('data-align'),
        },
      };
    },
  }),
  ImageResize.configure({
    persistedAttributes: ['width', 'height', 'style'],
    keepStyles: true,
  }),
  Youtube.configure({
    controls: false,
    nocookie: true,
  }),
];

// Menu bar for TipTap
import MenuBar from '../common/MenuBar';
import '../../styles/TipTapEditor.module.scss'; // Ensure path is correct

// A small sub-component handling the actual TipTap editor in "edit mode"
const TipTapEditor = ({ content, onUpdate }) => {
  return (
    <EditorProvider
      extensions={extensions}
      content={content}
      editable={true}
      onUpdate={(props) => {
        // Grab updated HTML from Tiptap
        const html = props.editor.getHTML();
        // Sanitize
        const sanitized = DOMPurify.sanitize(html, {
          ADD_ATTR: ['style', 'data-align', 'width', 'height', 'class'],
          ADD_TAGS: ['iframe'],
          ALLOWED_TAGS: [
            'p', 'strong', 'em', 'img', 'a',
            'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4' , 'h5',
            'blockquote', 'iframe',
          ],
          ALLOWED_ATTR: [
            'href', 'src', 'style', 'class',
            'data-align', 'width', 'height',
          ],
        });
        onUpdate(sanitized);
      }}
    >
      <div className="my-tiptap-editor">
        <MenuBar />
        <div className="ProseMirror" />
      </div>
    </EditorProvider>
  );
};

// The main PostDetail component
const PostDetail = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';
  const { getPostById, updatePostInCache, getComments, postDetails } = useContext(PostsContext);

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [additionalHTML, setAdditionalHTML] = useState('');
  
  // Refs to track state without triggering re-renders
  const firebaseListener = useRef(null);
  const viewCountIncremented = useRef(false);
  const initialLoadComplete = useRef(false);
  
  console.log(`[PostDetail] Component rendering for post ${postId}, viewIncremented=${viewCountIncremented.current}, initialLoad=${initialLoadComplete.current}`);
  
  // Load post data once
  useEffect(() => {
    // Skip for create route
    if (postId === 'create') return;
    
    console.log(`[PostDetail] useEffect for post loading triggered for ${postId}`);
    
    // Clean up previous listener
    const cleanupListener = () => {
      if (firebaseListener.current) {
        firebaseListener.current();
        firebaseListener.current = null;
      }
    };
    
    // Reset our tracking refs when post ID changes
    viewCountIncremented.current = false;
    initialLoadComplete.current = false;
    cleanupListener();
    
    const fetchPost = async () => {
      if (loading === false) setLoading(true);
      
      try {
        // Initial post load
        console.log(`[PostDetail] Fetching post data for ${postId}`);
        const postData = await getPostById(postId);
        if (postData) {
          console.log(`[PostDetail] Successfully loaded post data: ${postId}, views=${postData.views || 0}`);
          setPost(postData);
          setAdditionalHTML(postData.additionalHTML || '');
          initialLoadComplete.current = true;
        }
      } catch (err) {
        console.error('Error loading post:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Set up Firebase listener for real-time updates
    const setupListener = () => {
      firebaseListener.current = onSnapshot(doc(db, 'posts', postId), (docSnapshot) => {
        if (docSnapshot.exists()) {
          const docData = docSnapshot.data();
          
          // Only update view-related fields to avoid unnecessary re-renders
          setPost(prevPost => {
            if (!prevPost) return { id: postId, ...docData };
            
            return {
              ...prevPost,
              likes: docData.likes || [],
              views: docData.views || 0,
            };
          });
        }
      }, (error) => {
        console.error('Firebase listener error:', error);
      });
    };
    
    fetchPost();
    setupListener();
    
    return cleanupListener;
  }, [postId]); // Only depend on postId to avoid re-fetching
  
  // This effect handles view incrementation when the component mounts
  useEffect(() => {
    // Skip for create route or when no post is loaded yet
    if (!post || postId === 'create' || !initialLoadComplete.current) {
      console.log(`[PostDetail] View increment skipped - conditions not met: post=${!!post}, initialLoad=${initialLoadComplete.current}`);
      return;
    }
    
    // We only want to increment view once per component mount
    if (viewCountIncremented.current) {
      console.log('[PostDetail] View already incremented for this session');
      return;
    }
    
    // Mark that we've already incremented for this mounting - do this BEFORE the async call
    // to prevent any possibility of multiple increments if the component re-renders quickly
    viewCountIncremented.current = true;
    
    console.log(`[PostDetail] Incrementing view count for post: ${postId}, current views=${post.views || 0}`);
    
    // Fire and forget - don't use await to avoid blocking
    incrementPostView(postId)
      .then(response => {
        // If the increment failed, we'll still refresh to get the current count
        if (response.success === false) {
          console.warn(`[PostDetail] View increment failed: ${response.error}`);
        } else {
          console.log(`[PostDetail] View increment succeeded`);
        }
        
        // Always fetch fresh data to get current view count
        setTimeout(() => {
          getPostById(postId, true) // Force cache bypass
            .then(freshData => {
              if (freshData) {
                console.log(`[PostDetail] Fresh post data received: views=${freshData.views}, previous=${post.views || 0}`);
                
                // Update local state
                setPost(prevPost => ({
                  ...prevPost,
                  views: freshData.views || 0
                }));
                
                // Update global cache
                if (updatePostInCache) {
                  updatePostInCache(freshData);
                }
              }
            })
            .catch(err => {
              console.error('[PostDetail] Error refreshing post data:', err);
            });
        }, 500); // Small delay to allow the backend to process the view
      })
      .catch(error => {
        console.error('[PostDetail] Error incrementing view count:', error);
        // Even if view increment fails, we still want to get fresh data
        getPostById(postId, true).catch(() => {}); // Silently fail if this also fails
      });
    
    // Cleanup function - this ensures we reset the increment flag when component unmounts
    return () => {
      console.log(`[PostDetail] Component unmounting, resetting viewCountIncremented flag`);
      viewCountIncremented.current = false;
    };
    // Only run this effect when the post ID changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // Called when saving admin edits to additionalHTML
  const handleSave = async (e) => {
    e.preventDefault();
    if (!isAdmin || !post) return;

    // Prepare sanitized HTML content
    const sanitized = DOMPurify.sanitize(additionalHTML, {
      ADD_ATTR: ['style', 'data-align', 'width', 'height', 'class'],
      ADD_TAGS: ['iframe'],
      ALLOWED_TAGS: [
        'p', 'strong', 'em', 'img', 'a',
        'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4' , 'h5',
        'blockquote', 'iframe',
      ],
      ALLOWED_ATTR: [
        'href', 'src', 'style', 'class',
        'data-align', 'width', 'height',
      ],
    });
    
    // Send as JSON object instead of FormData
    const updateData = {
      additionalHTML: sanitized
    };

    try {
      const response = await updatePost(postId, updateData, token);
      if (response.message) {
        const refreshed = await getPostById(postId, true); // force refresh
        updatePostInCache(refreshed); // Update cache
        await getComments(postId, true); // Force refresh comments
        setPost(refreshed);
        setAdditionalHTML(refreshed.additionalHTML || '');
        setEditMode(false);

        setSuccessMessage('Post updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(response.error || 'Failed to update post.');
      }
    } catch (err) {
      console.error('Error saving post:', err);
      setError('An unexpected error occurred while saving the post.');
    }
  };

  if (loading) {
    return <div className="text-center mt-10">Loading post...</div>;
  }
  if (error) {
    return <div className="text-center mt-10 text-red-500">{error}</div>;
  }
  if (!post) {
    return <div className="text-center mt-10">No post data found.</div>;
  }

  // Utility to format date
  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      {successMessage && (
        <p className="text-green-600 text-center font-semibold mb-4">
          {successMessage}
        </p>
      )}

      <Link 
        to="/latest-tech"
        className="inline-block mb-4 text-blue-600 hover:text-blue-800"
      >
        ← Back to Posts
      </Link>

      {!editMode ? (
        // View Mode
        <div>
          {isAdmin && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Edit Post
              </button>
            </div>
          )}

          <h2 className="text-3xl font-bold mb-4">{post.title}</h2>

          {/* Stats section */}
          <div className="flex items-center space-x-4 mb-4">
            <LikeButton postId={postId} initialLikes={post.likes || []} />
            <span className="text-gray-600">{post.views || 0} views</span>
          </div>

          {post.additionalHTML && (
            <div
              className="prose max-w-none mb-4"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(post.additionalHTML),
              }}
            />
          )}

          <p className="text-sm text-gray-500">
            Created At: {formatDate(post.createdAt)}
          </p>
          <p className="text-sm text-gray-500">
            Created By: {post.createdByUsername || 'Unknown'}
          </p>

          {/* Comments Section */}
          <CommentsSection postId={postId} />
        </div>
      ) : (
        // Edit Mode - Only accessible by admin
        <form onSubmit={handleSave} className="space-y-4">
          <h2 className="text-2xl font-semibold mb-4">Edit Post</h2>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">
              Content
            </label>
            <TipTapEditor
              content={additionalHTML}
              onUpdate={(newHTML) => setAdditionalHTML(newHTML)}
            />
          </div>

          {error && <p className="text-red-500">{error}</p>}

          <div className="flex space-x-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => {
                setEditMode(false);
                setError('');
                setAdditionalHTML(post.additionalHTML || '');
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default PostDetail;
