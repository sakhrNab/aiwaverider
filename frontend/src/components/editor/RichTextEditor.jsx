// src/components/RichTextEditor.jsx
import React from 'react';
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

import DOMPurify from 'dompurify';
import MenuBar from '../common/MenuBar'; // Adjust the path if needed
import '../../styles/TipTapEditor.module.scss'; // Adjust path if needed

// We'll replicate the same Tiptap extensions from PostDetail
const CustomTaskItem = TaskItem.extend({
  content: 'inline*',
});

const editorExtensions = [
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

const RichTextEditor = ({ content, onChange }) => {
  // We assume in CreatePost, user is always "admin" enough to edit
  const isEditable = true;

  return (
    <EditorProvider
      extensions={editorExtensions}
      content={content}
      editable={isEditable}
      onUpdate={(props) => {
        // Get the raw HTML from TipTap
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
        onChange(sanitized);
      }}
    >
      <div className="my-tiptap-editor">
        <MenuBar />
        {/* Where TipTap renders the content */}
        <div className="ProseMirror" />
      </div>
    </EditorProvider>
  );
};

export default RichTextEditor;
