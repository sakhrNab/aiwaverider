import React, { useState, useRef, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import { FaEye, FaEyeDropper } from 'react-icons/fa';
import './ColorPicker.css';

const ColorPicker = ({ color, onChange }) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerRef = useRef(null);
  
  // Handle click outside to close the picker
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsPickerOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Handle color change
  const handleColorChange = (newColor) => {
    onChange(newColor);
  };
  
  return (
    <div className="color-picker-container" ref={pickerRef}>
      <div className="color-picker-preview">
        <div 
          className="color-swatch"
          style={{ backgroundColor: color }}
          onClick={() => setIsPickerOpen(!isPickerOpen)}
        >
          <FaEyeDropper className="eyedropper-icon" />
        </div>
        <input 
          type="text" 
          value={color} 
          onChange={(e) => handleColorChange(e.target.value)}
          className="color-input"
        />
      </div>
      
      {isPickerOpen && (
        <div className="color-picker-popup">
          <HexColorPicker color={color} onChange={handleColorChange} />
        </div>
      )}
    </div>
  );
};

export default ColorPicker; 