import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

// Sample initial posts
const initialPosts = [
  {
    id: 1,
    title: 'Welcome to AI Wave Rider!',
    description: 'This is a sample post from admin.',
    comments: [
      { userRole: 'admin', text: 'Welcome everyone!' }
    ],
  },
];

const PostsList = () => {
  const { role } = useContext(AuthContext);
  const [posts, setPosts] = useState(initialPosts);
  const [commentText, setCommentText] = useState('');

  const addComment = (postId) => {
    // If not authenticated, do nothing (or prompt to sign in)
    if (!role) return;

    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            comments: [
              ...p.comments,
              {
                userRole: role,
                text: commentText
              }
            ],
          };
        }
        return p;
      })
    );
    setCommentText('');
  };

  return (
    <div className="p-4">
      <h2 className="text-xl mb-4">All Posts</h2>
      {posts.map((post) => (
        <div key={post.id} className="border rounded p-4 mb-4">
          <h3 className="font-bold text-lg">{post.title}</h3>
          <p>{post.description}</p>
          <div className="mt-2">
            <h4 className="font-semibold">Comments:</h4>
            {post.comments.map((c, index) => (
              <p key={index} className="ml-4">
                <strong>{c.userRole}:</strong> {c.text}
              </p>
            ))}
          </div>
          {/* Comment form if user is signed in */}
          {role && (
            <div className="mt-2">
              <input
                type="text"
                className="border p-1 w-full mb-2"
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button
                onClick={() => addComment(post.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Comment
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PostsList;
