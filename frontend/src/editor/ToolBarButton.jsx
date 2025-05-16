// src\editor\ToolBarButton.jsx
import React from 'react';
import './toolbarbtn.css'

const ToolBarButton = ({ active, onClick, icon, label, className }) => {
  return (
    <button
      type="button"
      aria-label={`Toggle ${label}`}
      className={`toolbar-btn ${active ? 'active' : ''} ${className || ''}`}
      onClick={onClick}
    >
      {icon}
      <span className="ml-1">{label}</span>
    </button>
  );
};

export default ToolBarButton;

