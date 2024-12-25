// src/components/MyEditor.jsx

import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
// ... add more TipTap extensions if needed
import '../styles/MyEditor.css'; // optional CSS, if you'd like to style the editor

const MyEditor = ({ content = '', onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
      Image,
      // ... add more TipTap extensions here
    ],
    content,
    onUpdate({ editor }) {
      // On every update, get HTML and pass it to the parent via onChange
      const html = editor.getHTML();
      onChange(html);
    },
  });

  // Provide a button example: Insert link
  const setLink = useCallback(() => {
    const url = window.prompt('Enter the URL');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  // Provide a button example: Insert image
  const setImage = useCallback(() => {
    const url = window.prompt('Enter the image URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) {
    return null; // Editor not ready yet
  }

  return (
    <div className="my-tiptap-editor">
      {/* Example toolbar */}
      <div className="toolbar" style={{ marginBottom: '8px' }}>
        <button
          className="mr-2 px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Bold
        </button>
        <button
          className="mr-2 px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          Italic
        </button>
        <button
          className="mr-2 px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          Underline
        </button>
        <button
          className="mr-2 px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          onClick={setLink}
        >
          Link
        </button>
        <button
          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          onClick={setImage}
        >
          Image
        </button>
      </div>

      {/* Actual editor content */}
      <EditorContent editor={editor} />
    </div>
  );
};

export default MyEditor;
