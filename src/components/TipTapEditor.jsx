import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { ImageResize } from 'tiptap-extension-resize-image'; // Resize image extension
import '../styles/MyEditor.css'; // Optional: Add any necessary CSS for your editor

const MyEditor = ({ content = '', onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
      Image.configure({
        inline: false, // Make the image a block element
        allowBase64: true, // Allow base64 encoding of the image
        HTMLAttributes: {
          style: 'max-width: 100%; height: auto;', // Make sure image is responsive
        },
      }),
      ImageResize, // Add the ImageResize extension here for resizing
    ],
    content,
    onUpdate({ editor }) {
      const html = editor.getHTML();
      onChange(html); // Pass the HTML content back to the parent component
    },
  });

  const setLink = useCallback(() => {
    const url = window.prompt('Enter the URL');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const setImage = useCallback(() => {
    const url = window.prompt('Enter the image URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) {
    return null; // Wait for the editor to be ready
  }

  return (
    <div className="my-tiptap-editor">
      {/* Toolbar for bold, italic, underline, link, and image */}
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

      {/* Actual content of the editor */}
      <EditorContent editor={editor} />
    </div>
  );
};

export default MyEditor;
