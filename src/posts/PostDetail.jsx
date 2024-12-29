// src/posts/PostDetail.jsx

import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { getPostById, updatePost, createPost } from '../utils/api';

import CommentsSection from './CommentsSection'; // Ensure correct import
import DOMPurify from 'dompurify';
// import TipTapEditor from '../components/TipTapEditor'; // Updated TipTap Editor
import { CATEGORIES } from '../constants/categories'; // Ensure this exists
import { Link } from 'react-router-dom';

// TipTapEditor imports
import '../styles/TipTapEditor.module.scss'; // Ensure this path is correct
// import '../styles/styles.scss';
import MenuBar from '../components/MenuBar'; // Ensure this path is correct
import { EditorProvider } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import ListItem from '@tiptap/extension-list-item';
import TextStyle from '@tiptap/extension-text-style';
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import Image from '@tiptap/extension-image';
import { ImageResize } from 'tiptap-extension-resize-image'; 
import Youtube from '@tiptap/extension-youtube'
import TextAlign from '@tiptap/extension-text-align';

const CustomTaskItem = TaskItem.extend({
  content: 'inline*',
})
// extension from TipTapEditor.jsx
const extensions = [
  StarterKit.configure({
    bulletList: { keepMarks: true, keepAttributes: false },
    orderedList: { keepMarks: true, keepAttributes: false },
  }),
  TaskList.configure({
    HTMLAttributes: {
      class: 'custom-task-list',
    },
  }),
  TaskItem.configure({
    nested: true,
  }),
  Color.configure({ types: [TextStyle.name, ListItem.name] }),
  TextStyle,
  TextAlign.configure({
    types: ['heading', 'paragraph', 'image'],
    alignments: ['left', 'center', 'right', 'justify'],
    defaultAlignment: 'left',
  }),
  Image.configure({
    HTMLAttributes: {
      class: 'aligned-image',
    },
    resizable: true,
    inline: true,
    // Add custom attributes
    addAttributes() {
      return {
        style: {
          default: null,
          renderHTML: attributes => {
            return {
              style: attributes.style
            };
          },
          parseHTML: element => element.getAttribute('style')
        },
        'data-align': {
          default: 'none',
          renderHTML: attributes => {
            return {
              'data-align': attributes['data-align']
            };
          },
          parseHTML: element => element.getAttribute('data-align')
        }
      };
    },
  }),
  // Image,
  // ImageResize,
  ImageResize.configure({
    // Persist size in attributes
    persistedAttributes: ['width', 'height', 'style'],
    keepStyles: true,
  }),
  Youtube.configure({
    controls: false,
    nocookie: true,
  }),
];

// TipTapEditor component from it's class
const TipTapEditor = ({ content, onChange, isAdmin }) => {
  return (
    <EditorProvider
      extensions={extensions}
      content={content}
      editable={isAdmin}
      onUpdate={(props) => {
        const html = props.editor.getHTML();
        onChange(DOMPurify.sanitize(html, {
          ADD_ATTR: ['style', 'data-align', 'width', 'height', 'class'],
          ADD_TAGS: ['iframe'],
          ALLOWED_TAGS: ['p', 'strong', 'em', 'img', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote', 'iframe'],
          ALLOWED_ATTR: ['href', 'src', 'style', 'class', 'data-align', 'width', 'height'],      
        }));
      }}
    >
      <div className={`my-tiptap-editor ${!isAdmin ? 'view-only' : ''}`}>
      {isAdmin && <MenuBar />}
      <div className={`ProseMirror ${!isAdmin ? 'border-none' : ''}`}>
          {/* The editor content will be rendered here */}
        </div>
      </div>
    </EditorProvider>
  );
};
const PostDetail = () => {
  const [imageStyles, setImageStyles] = useState({});

  const { postId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Editing state
  const [editMode, setEditMode] = useState(false);

  // Form data for editing
  const [formData, setFormData] = useState({
    additionalHTML: '',
  });

  const [successMessage, setSuccessMessage] = useState('');

  // ---------------- Load Post on Mount ----------------
  useEffect(() => {
    const fetchPost = async () => {
      try {
        if (postId === 'create') {
          setPost(null);
          setFormData({
            additionalHTML: '',
          });
        } else {
          const data = await getPostById(postId);
          if (!data) {
            setError('Post not found.');
          } else {
            setPost(data);
            // Process HTML to ensure styles are preserved
            const doc = new DOMParser().parseFromString(data.additionalHTML || '', 'text/html');
            
            // Process images
            const images = doc.getElementsByTagName('img');
            Array.from(images).forEach((img) => {
              img.style.maxWidth = '100%';
              img.style.height = 'auto';
              
              // Set alignment if present
              if (img.getAttribute('data-align')) {
                const align = img.getAttribute('data-align');
                img.style.float = align === 'left' ? 'left' : align === 'right' ? 'right' : 'none';
                img.style.marginLeft = align === 'center' ? 'auto' : '';
                img.style.marginRight = align === 'center' ? 'auto' : '';
                img.style.display = align === 'center' ? 'block' : 'inline';
              }
            });
  
            // Set form data with processed HTML
            setFormData({
              additionalHTML: doc.body.innerHTML || '',
            });
          }
        }
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to fetch post.');
      } finally {
        setLoading(false);
      }
    };
  
    fetchPost();
  }, [postId]);
  // ---------------- Handlers ----------------
  // Handle TipTap editor changes
// Update handleEditorChange to preserve complete styling
const handleEditorChange = (field, html) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  
  // Preserve image styles
  const images = doc.getElementsByTagName('img');
  Array.from(images).forEach((img) => {
    const computedStyle = window.getComputedStyle(img);
    const styles = {
      width: img.style.width || computedStyle.width,
      height: img.style.height || computedStyle.height,
      float: img.style.float || computedStyle.float,
      margin: img.style.margin || computedStyle.margin,
      display: img.style.display || computedStyle.display,
      textAlign: img.style.textAlign || computedStyle.textAlign
    };
    
    // Apply styles inline
    Object.entries(styles).forEach(([prop, value]) => {
      if (value) img.style[prop] = value;
    });
    
    // Store alignment
    const align = img.style.float || img.style.textAlign;
    if (align) img.setAttribute('data-align', align);
  });

  setFormData(prev => ({
    ...prev,
    [field]: doc.body.innerHTML
  }));
};

  const handleImageStyle = (index, styles) => {
    setImageStyles(prev => ({
      ...prev,
      [index]: { ...prev[index], ...styles }
    }));
  };

  // Save changes
  const handleSave = async (e) => {
    e.preventDefault();

    // Sanitize the HTML before sending
    const sanitizedAdditionalHTML = DOMPurify.sanitize(formData.additionalHTML, {
      ADD_ATTR: ['style', 'data-align', 'width', 'height', 'class'],
      ADD_TAGS: ['iframe'],
      ALLOWED_TAGS: ['p', 'strong', 'em', 'img', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote', 'iframe'],
      ALLOWED_ATTR: ['href', 'src', 'style', 'class', 'data-align', 'width', 'height'],
    });
  
    const postData = new FormData();
    postData.append('additionalHTML', sanitizedAdditionalHTML);

    try {
      if (postId === 'create') {
        // Create Mode
        const response = await createPost(postData, token);
        console.log('Create Post Response:', response); // Debugging statement
        if (response.post) {
          setSuccessMessage('Post created successfully!');
          setTimeout(() => {
            setSuccessMessage('');
            navigate(`/posts/${response.post.id}`); // Redirect to the newly created post
          }, 1500);
        } else {
          setError(response.error || 'Failed to create post.');
        }
      } else {
        // Update Mode
        const response = await updatePost(postId, postData, token);
        console.log('Update Post Response:', response); // Debugging statement
        if (response.message) {
          // Re-fetch updated post
          const refreshed = await getPostById(postId);
          setPost(refreshed);
          setEditMode(false);

          setSuccessMessage('Post updated successfully!');
          setTimeout(() => setSuccessMessage(''), 3000);
          setError('');
        } else {
          setError(response.error || 'Failed to update post.');
        }
      }
    } catch (err) {
      console.error('Error saving post:', err);
      setError('An unexpected error occurred while saving the post.');
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditMode(false);
    setError('');
    if (post) {
      // Reset form data to the existing post
      setFormData({
        additionalHTML: post.additionalHTML || '',
      });
    }
  };

  // ---------------- Render ----------------
  if (loading) {
    return <div className="text-center mt-10">Loading post...</div>;
  }
  if (error) {
    return <div className="text-center mt-10 text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {successMessage && (
        <p className="text-green-600 text-center font-semibold mb-4">
          {successMessage}
        </p>
      )}

      {/* Create Mode: Render Create Post Form */}
      {/* {postId === 'create' ? ( */}
        <div className="mb-8">
        {isAdmin && <h2 className="text-2xl font-semibold mb-4">Create a New Post</h2>}
          <form onSubmit={handleSave} className="space-y-4">

            {/* Additional HTML - TipTap */}
            <div>
            {isAdmin && <label className="block text-gray-700">Content</label>}
              <TipTapEditor
                content={formData.additionalHTML}
                onChange={(html) => handleEditorChange('additionalHTML', html)}
                isAdmin={isAdmin}
                imageStyles={imageStyles}
                onImageStyle={handleImageStyle}
              />
            </div>

            {/* Error Message */}
            {error && <p className="text-red-500">{error}</p>}

          {/* Submit Button - Only for Admins */}
          {isAdmin && (
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Post
            </button>
          )}
          </form>
        </div>
      {/* ) : (
        <div>
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

              <p className="text-sm text-gray-500 mt-4">
                Created At: {formatDate(post.createdAt)}
              </p>
              <p className="text-sm text-gray-500">
                Created By: {post.createdByUsername || 'Unknown'}
              </p>

              <CommentsSection postId={postId} />
            </div>
          ) : (
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Edit Post</h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-gray-700">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700">
                    Image (Leave blank to keep existing)
                  </label>
                  <input
                    type="file"
                    name="image"
                    accept="image/*"
                    onChange={handleInputChange}
                    className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                  />
                  {formData.image ? (
                    <div className="mt-2">
                      <p className="text-gray-700">Image Preview:</p>
                      <img
                        src={URL.createObjectURL(formData.image)}
                        alt="Preview"
                        className="h-40 w-full object-cover rounded-md"
                      />
                    </div>
                  ) : post.imageUrl ? (
                    <div className="mt-2">
                      <p className="text-gray-700">Current Image:</p>
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="h-40 w-full object-cover rounded-md"
                      />
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="block text-gray-700">Content</label>
                  <TipTapEditor
                    content={formData.additionalHTML}
                    onChange={(html) => handleEditorChange('additionalHTML', html)}
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
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div> 
      )};*/}
    </div>
  ); }

// Helper to format ISO date
const formatDate = (isoString) => {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  return date.toLocaleString();
};

export default PostDetail;