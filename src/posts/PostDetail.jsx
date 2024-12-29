// src/posts/PostDetail.jsx

import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { getPostById, updatePost } from '../utils/api';
import CommentsSection from './CommentsSection';
import DOMPurify from 'dompurify';

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
            'ul', 'ol', 'li', 'h1', 'h2', 'h3',
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

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // We'll store the "additionalHTML" in local state for editing
  const [additionalHTML, setAdditionalHTML] = useState('');

  // Fetch the post by ID
  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      try {
        const data = await getPostById(postId);
        if (!data) {
          setError('Post not found.');
        } else {
          setPost(data);
          // We'll keep a local copy of the additionalHTML for editing
          setAdditionalHTML(data.additionalHTML || '');
        }
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to fetch post.');
      } finally {
        setLoading(false);
      }
    };

    if (postId !== 'create') {
      fetchPost();
    } else {
      // If your route has 'create', you might want to navigate away or handle differently
      setError('Invalid post ID.'); 
      setLoading(false);
    }
  }, [postId]);

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
        'ul', 'ol', 'li', 'h1', 'h2', 'h3',
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
        // Re-fetch to see the updated post
        const refreshed = await getPostById(postId);
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

          {post.imageUrl && (
            <img
              src={post.imageUrl}
              alt={post.title}
              className="mb-4 w-full h-auto object-cover rounded-md"
            />
          )}

          {post.additionalHTML && (
            <div
              className="prose mb-4"
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
        // Edit Mode
        <form onSubmit={handleSave} className="space-y-4">
          <h2 className="text-2xl font-semibold mb-4">Edit Post</h2>

          <div>
            <label className="block text-gray-700 mb-1">
              Content (HTML)
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
                // revert to original
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
