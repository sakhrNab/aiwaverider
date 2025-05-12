import React from 'react';
import { useCurrentEditor } from '@tiptap/react';
import '../../editor/toolbarbtn.scss'; // Make sure this path is correct for your project

const MenuBar = () => {
  const [height, setHeight] = React.useState(480);
  const [width, setWidth] = React.useState(640);
  const { editor } = useCurrentEditor();

  // Insert image from URL
  const addImage = () => {
    const url = window.prompt('Enter the Image URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  // Align images or text
  const handleImageAlign = (align) => {
    editor.chain().focus().setTextAlign(align).run();
  };

  // Insert YouTube Video
  const addYoutubeVideo = () => {
    const url = prompt('Enter YouTube URL');
    if (url) {
      editor.commands.setYoutubeVideo({
        src: url,
        width: Math.max(320, parseInt(width, 10)) || 640,
        height: Math.max(180, parseInt(height, 10)) || 480,
      });
    }
  };

  if (!editor) return null;

  return (
    <div className="toolbar">
      {/* -------- Alignment Controls -------- */}
      <div className="control-group">
        <div className="button-group">
          {/* Type="button" ensures these do NOT submit a form */}
          <button
            type="button"
            onClick={() => handleImageAlign('left')}
            className={`toolbar-btn ${
              editor.isActive({ textAlign: 'left' }) ? 'active' : ''
            }`}
          >
            Left
          </button>

          <button
            type="button"
            onClick={() => handleImageAlign('center')}
            className={`toolbar-btn ${
              editor.isActive({ textAlign: 'center' }) ? 'active' : ''
            }`}
          >
            Center
          </button>

          <button
            type="button"
            onClick={() => handleImageAlign('right')}
            className={`toolbar-btn ${
              editor.isActive({ textAlign: 'right' }) ? 'active' : ''
            }`}
          >
            Right
          </button>

          <button
            type="button"
            onClick={() => handleImageAlign('justify')}
            className={`toolbar-btn ${
              editor.isActive({ textAlign: 'justify' }) ? 'active' : ''
            }`}
          >
            Justify
          </button>

          {/* -------- Media Group -------- */}
          <div className="button-group">
            <div className="input-group">
              <input
                id="width"
                type="number"
                min="320"
                max="1024"
                placeholder="width"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="toolbar-input"
              />
              <input
                id="height"
                type="number"
                min="180"
                max="720"
                placeholder="height"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="toolbar-input"
              />
            </div>
            <button
              type="button"
              id="add"
              onClick={addYoutubeVideo}
              className="toolbar-btn"
            >
              Add YouTube video
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={addImage}
          className="toolbar-btn"
        >
          Add image from URL
        </button>
      </div>

      {/* -------- Text Formatting Buttons -------- */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}
      >
        Bold
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`toolbar-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
      >
        Italic
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={`toolbar-btn ${editor.isActive('strike') ? 'active' : ''}`}
      >
        Strike
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCode().run()}
        disabled={!editor.can().chain().focus().toggleCode().run()}
        className={`toolbar-btn ${editor.isActive('code') ? 'active' : ''}`}
      >
        Code
      </button>

      {/* -------- Clear Marks / Nodes -------- */}
      <div className="button-group">
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().run()}
          className="toolbar-btn"
        >
          Clear Marks
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().clearNodes().run()}
          className="toolbar-btn"
        >
          Clear Nodes
        </button>
      </div>

      {/* -------- Headings / Paragraph -------- */}
      <button
        type="button"
        onClick={() => editor.chain().focus().setParagraph().run()}
        className={`toolbar-btn ${editor.isActive('paragraph') ? 'active' : ''}`}
      >
        Paragraph
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`toolbar-btn ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`}
      >
        H1
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`toolbar-btn ${editor.isActive('heading', { level: 3 }) ? 'active' : ''}`}
      >
        H3
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        className={`toolbar-btn ${editor.isActive('heading', { level: 4 }) ? 'is-active' : ''}`}
      >
        H4
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
        className={`toolbar-btn ${editor.isActive('heading', { level: 5 }) ? 'is-active' : ''}`}
      >
        H5
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
        className={`toolbar-btn ${editor.isActive('heading', { level: 6 }) ? 'is-active' : ''}`}
      >
        H6
      </button>

      {/* -------- Lists -------- */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
      >
        Bullet List
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
      >
        Ordered List
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        className={`toolbar-btn ${editor.isActive('taskList') ? 'active' : ''}`}
      >
        Task List
      </button>

      {/* -------- Code Block & Blockquote -------- */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={`toolbar-btn ${editor.isActive('codeBlock') ? 'active' : ''}`}
      >
        Code Block
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`toolbar-btn ${editor.isActive('blockquote') ? 'active' : ''}`}
      >
        Blockquote
      </button>

      {/* -------- Other Actions (HR, Hard Break, Undo/Redo, Colors) -------- */}
      <div className="button-group">
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="toolbar-btn"
        >
          Horizontal Rule
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setHardBreak().run()}
          className="toolbar-btn"
        >
          Hard Break
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="toolbar-btn"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="toolbar-btn"
        >
          Redo
        </button>
      </div>

      {/* -------- Text Color Buttons -------- */}
      <button
        type="button"
        onClick={() => editor.chain().focus().setColor('#958DF1').run()}
        className={`toolbar-btn ${
          editor.isActive('textStyle', { color: '#958DF1' }) ? 'active' : ''
        }`}
      >
        Purple
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setColor('#000000').run()}
        className={`toolbar-btn ${
          editor.isActive('textStyle', { color: '#000000' }) ? 'active' : ''
        }`}
      >
        Reset
      </button>
    </div>
  );
};

export default MenuBar;
