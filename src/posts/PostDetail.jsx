import React, { useEffect, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { getPostById } from '../utils/api';
import CommentsSection from './CommentsSection';
import DOMPurify from 'dompurify';

const PostDetail = () => {
  const { postId } = useParams();
  const { user, token } = useContext(AuthContext);
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch the post
  useEffect(() => {
    const fetchPostById = async () => {
      try {
        const data = await getPostById(postId);
        setPost(data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to fetch post.');
        setLoading(false);
      }
    };
    fetchPostById();
  }, [postId, token]);

  if (loading) {
    return <div className="text-center mt-10">Loading post...</div>;
  }
  if (error) {
    return <div className="text-center mt-10 text-red-500">{error}</div>;
  }
  if (!post) {
    return <div className="text-center mt-10">No post found.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">{post.title}</h1>

      {/* Render Additional HTML */}
      {post.additionalHTML && (
        <div
          className="additional-content mb-6"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(post.additionalHTML, {
              ALLOWED_TAGS: ['img', 'a', 'p', 'figure'], // Allow figure tags with inline styles
              ALLOWED_ATTR: ['src', 'alt', 'style', 'href'],
            }),
          }}
        />
      )}

      {/* Display Description */}
      <p className="mt-4 text-lg">{post.description}</p>

      {/* Display Image if available */}
      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt={post.title}
          className="my-4 max-h-96 object-cover w-full rounded"
        />
      )}

      {/* Render Graph HTML */}
      {post.graphHTML && (
        <div
          className="graph-content mb-6"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(post.graphHTML),
          }}
        />
      )}

      {/* Comments Section */}
      <CommentsSection postId={postId} />
    </div>
  );
};

export default PostDetail;
