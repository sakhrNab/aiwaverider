import React from 'react';
import { useCurrentEditor } from '@tiptap/react';
import '../styles/toolbarbtn.scss'; // Ensure this path is correct
// import '../styles/styles.scss'

const MenuBar = () => {
  const [height, setHeight] = React.useState(480)
  const [width, setWidth] = React.useState(640)
  const { editor } = useCurrentEditor();

  const addImage = () => {
    const url = window.prompt('URL')

    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  if (!editor) {
    return null;
  }

  const handleImageAlign = (align) => {
    editor.chain().focus().setTextAlign(align).run();
  };


  const addYoutubeVideo = () => {
    const url = prompt('Enter YouTube URL')

    if (url) {
      editor.commands.setYoutubeVideo({
        src: url,
        width: Math.max(320, parseInt(width, 10)) || 640,
        height: Math.max(180, parseInt(height, 10)) || 480,
      })
    }
  }
  return (
    
    <div className="toolbar">
      <div className="control-group">
        <div className="button-group">
        <button
          onClick={() => handleImageAlign('left')}
          className={`toolbar-btn ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`}
        >
          Left
        </button>
        <button
          onClick={() => handleImageAlign('center')}
        className={`toolbar-btn ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`}
        >
          Center
        </button>
        <button
          onClick={() => handleImageAlign('right')}
          className={`toolbar-btn ${editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`}
          >
          Right
        </button>
        <button
          onClick={() => handleImageAlign('justify')}
          className={`toolbar-btn ${editor.isActive({ textAlign: 'justify' }) ? 'active' : ''}`}
        >
          Justify
        </button>
        {/* Media Group */}
        <div className="button-group">
          <div className="input-group">
            <input
              id="width"
              type="number"
              min="320"
              max="1024"
              placeholder="width"
              value={width}
              onChange={event => setWidth(event.target.value)}
              className='toolbar-input'
            />
            <input
              id="height"
              type="number"
              min="180"
              max="720"
              placeholder="height"
              value={height}
              onChange={event => setHeight(event.target.value)}
              className='toolbar-input'
            />
          </div>
          <button id="add" onClick={addYoutubeVideo}
                          className="toolbar-btn"
          >Add YouTube video</button>
        </div>
    </div>
      <button onClick={addImage}
              className="toolbar-btn"
      >Add image from URL</button>
    </div>
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}
        type="button"
      >
        Bold
      </button>
      <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={
            !editor.can()
              .chain()
              .focus()
              .toggleItalic()
              .run()
          }
          className={`toolbar-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
        >
          Italic
        </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={`toolbar-btn ${editor.isActive('strike') ? 'active' : ''}`}
        type="button"
      >
        Strike
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        disabled={!editor.can().chain().focus().toggleCode().run()}
        className={`toolbar-btn ${editor.isActive('code') ? 'active' : ''}`}
        type="button"
      >
        Code
      </button>
      <div className="button-group">

        <button onClick={() => editor.chain().focus().unsetAllMarks().run()} type="button"
          className='toolbar-btn'>
          Clear Marks
        </button>
        <button onClick={() => editor.chain().focus().clearNodes().run()} type="button"
          className='toolbar-btn'>
          Clear Nodes
        </button>
      </div>
      <button
        onClick={() => editor.chain().focus().setParagraph().run()}
        className={`toolbar-btn ${editor.isActive('paragraph') ? 'active' : ''}`}
        type="button"
      >
        Paragraph
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`toolbar-btn ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`}
        type="button"
      >
        H1
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}
        type="button"
      >
        H2
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`toolbar-btn ${editor.isActive('heading', { level: 3 }) ? 'active' : ''}`}
        type="button"
      >
        H3
      </button>
      <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
          className={`toolbar-btn ${editor.isActive('heading', { level: 4 }) ? 'is-active' : ''}`}
        >
          H4
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
          className={`toolbar-btn ${editor.isActive('heading', { level: 5 }) ? 'is-active' : ''}`}
        >
          H5
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
          className={`toolbar-btn ${editor.isActive('heading', { level: 6 }) ? 'is-active' : ''}`}
        >
          H6
        </button>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
        type="button"
      >
        Bullet List
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
        type="button"
      >
        Ordered List
      </button>
      <button
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        // disabled={!editor.can().chain().focus().toggleTaskList().run()}
        className={`toolbar-btn ${editor.isActive('taskList') ? 'active' : ''}`}
      >
        Task List
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={`toolbar-btn ${editor.isActive('codeBlock') ? 'active' : ''}`}
        type="button"
      >
        Code Block
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`toolbar-btn ${editor.isActive('blockquote') ? 'active' : ''}`}
        type="button"
      >
        Blockquote
      </button>
      <div className="button-group">
        <button onClick={() => editor.chain().focus().setHorizontalRule().run()} type="button"
          className='toolbar-btn'>
          Horizontal Rule
        </button>
        <button onClick={() => editor.chain().focus().setHardBreak().run()} 
          type="button"
          className='toolbar-btn'>
          Hard Break
        </button>
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          type="button"
          className='toolbar-btn'
        >
          Undo
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          type="button"
          className='toolbar-btn'
        >
          Redo
        </button>
      </div>
      <button
        onClick={() => editor.chain().focus().setColor('#958DF1').run()}
        className={`toolbar-btn ${editor.isActive('textStyle', { color: '#958DF1' }) ? 'active' : ''}`}
        type="button"
      >
        Purple
      </button>
      <button
        onClick={() => editor.chain().focus().setColor('#000000').run()}
        className={`toolbar-btn ${editor.isActive('textStyle', { color: '#000000' }) ? 'active' : ''}`}
        type="button"
      >
        Reset
      </button>
    </div>
  );
};

export default MenuBar;


