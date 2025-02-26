// src/posts/PostDetail.jsx

import React, { useEffect, useState, useContext, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { getPostById, updatePost } from '../utils/api';
import CommentsSection from './CommentsSection';
import DOMPurify from 'dompurify';
import { PostsContext } from '../contexts/PostsContext';
import { onSnapshot, doc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { db } from '../utils/firebase';
import LikeButton from '../components/LikeButton';

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
import MenuBar from '../components/MenuBar'; // Ensure path is correct
import '../styles/TipTapEditor.module.scss'; // Ensure path is correct

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
  const [skipRealtimeUpdates, setSkipRealtimeUpdates] = useState(false);
  
  // Use ref to track active listeners
  const listenerRef = useRef(null);
  const lastUpdateTime = useRef(Date.now());

  // Update the initial useEffect
  useEffect(() => {
    const loadPost = async () => {
      try {
        setLoading(true);
        console.log(`[PostDetail] Loading post ${postId}, checking cache first`);
        
        // First check if post is already in cache and use that immediately
        const cachedPost = postDetails[postId];
        if (cachedPost) {
          console.log(`[PostDetail] Using cached post data for ${postId}`);
          setPost(cachedPost);
          setAdditionalHTML(cachedPost.additionalHTML || '');
          
          // Skip realtime updates if we have fresh data (< 30 seconds old)
          const postTimestamp = cachedPost.fetchTimestamp || 0;
          if (Date.now() - postTimestamp < 30000) {
            console.log(`[PostDetail] Cached post data is fresh, skipping immediate API fetch`);
            setSkipRealtimeUpdates(true);
            setLoading(false);
            return;
          }
        }
        
        // Then fetch latest post data
        console.log(`[PostDetail] Fetching latest data for post ${postId}`);
        const freshPost = await getPostById(postId);
        if (freshPost) {
          console.log(`[PostDetail] Received fresh post data for ${postId}`);
          // Add timestamp for cache freshness check
          freshPost.fetchTimestamp = Date.now();
          setPost(freshPost);
          setAdditionalHTML(freshPost.additionalHTML || '');
          lastUpdateTime.current = Date.now();
        }
        
        // Only set up real-time listener in specific cases:
        // 1. For admin users who need to see changes immediately
        // 2. If we don't already have complete post data
        // 3. If we haven't set up a listener recently (within 10 seconds)
        const shouldCreateListener = 
          (isAdmin || !freshPost?.likes) && 
          !skipRealtimeUpdates &&
          (Date.now() - lastUpdateTime.current > 10000);
        
        if (shouldCreateListener) {
          console.log(`[PostDetail] Setting up Firebase listener for post ${postId}`);
          
          // Clean up any existing listener first
          if (listenerRef.current) {
            console.log(`[PostDetail] Cleaning up previous listener before creating new one`);
            listenerRef.current();
            listenerRef.current = null;
          }
          
          // Set up new real-time listener for likes and views
          listenerRef.current = onSnapshot(doc(db, 'posts', postId), (doc) => {
            if (doc.exists()) {
              const data = doc.data();
              console.log(`[PostDetail] Received Firebase update for post ${postId}`);
              lastUpdateTime.current = Date.now();
              
              // Only update the specific fields we need to reduce re-renders
              setPost(prevPost => {
                if (!prevPost) return { ...data, id: doc.id };
                
                return {
                  ...prevPost,
                  likes: data.likes || [],
                  views: data.views || 0,
                  // Only update if newer than what we have
                  updatedAt: data.updatedAt > prevPost.updatedAt ? data.updatedAt : prevPost.updatedAt
                };
              });
            }
          }, (error) => {
            console.error(`[PostDetail] Error in Firebase listener for post ${postId}:`, error);
          });
        } else {
          console.log(`[PostDetail] Skipping Firebase listener creation for post ${postId}`);
        }
      } catch (err) {
        console.error(`[PostDetail] Error loading post ${postId}:`, err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (postId !== 'create') {
      loadPost();
    }
    
    // Clean up function
    return () => {
      if (listenerRef.current) {
        console.log(`[PostDetail] Cleaning up Firebase listener for post ${postId}`);
        listenerRef.current();
        listenerRef.current = null;
      }
    };
  }, [postId, getPostById, postDetails, isAdmin, skipRealtimeUpdates]);

  // Called when saving admin edits to additionalHTML
  const handleSave = async (e) => {
    e.preventDefault();
    if (!isAdmin || !post) return;

    // Prepare form data
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
    const formData = new FormData();
    formData.append('additionalHTML', sanitized);

    try {
      const response = await updatePost(postId, formData, token);
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
        to="/"
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
