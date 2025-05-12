import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaImage, FaSave, FaTimes } from 'react-icons/fa';
import { addAITool, updateAITool, deleteAITool, getAllAITools } from '../../../services/aiToolsService';
import './AIToolsManager.css';
import AdminLayout from '../../layout/AdminLayout';

const AIToolsManager = () => {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingTool, setEditingTool] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [toolToDelete, setToolToDelete] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  // Available tags for tools
  const availableTags = [
    'Free tools',
    'Video Generator',
    'Animation',
    'Make money with AI',
    '3D tools',
    'Content',
    'AI Coding',
    'Digital Influencer',
    'Video Editing',
    'Viral Video Hacks',
    'Organization'
  ];

  // Initial empty tool form
  const emptyTool = {
    title: '',
    description: '',
    keyword: '',
    link: '',
    image: '',
    tags: []
  };

  // Fetch tools on component mount
  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    setLoading(true);
    try {
      const fetchedTools = await getAllAITools();
      
      if (fetchedTools && fetchedTools.length > 0) {
        setTools(fetchedTools);
        setError(null);
      } else {
        setError('No AI tools found. This could be due to missing database permissions. Please contact support if this issue persists.');
      }
    } catch (err) {
      console.error('Error fetching AI tools:', err);
      
      // Display a more helpful error message for permission errors
      if (err.message && err.message.includes('permission')) {
        setError('You do not have sufficient permissions to access AI tools data. Please contact your administrator.');
      } else {
        setError('Failed to load AI tools. Please try again or contact support.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewTool = () => {
    setEditingTool({ ...emptyTool });
    setImagePreview(null);
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleEditTool = (tool) => {
    setEditingTool({ ...tool });
    setImagePreview(tool.image);
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTool(null);
    setImagePreview(null);
    setImageFile(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditingTool({ ...editingTool, [name]: value });
  };

  const handleTagToggle = (tag) => {
    if (editingTool.tags.includes(tag)) {
      setEditingTool({
        ...editingTool,
        tags: editingTool.tags.filter(t => t !== tag)
      });
    } else {
      setEditingTool({
        ...editingTool,
        tags: [...editingTool.tags, tag]
      });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveTool = async () => {
    // Validate form
    if (!editingTool.title || !editingTool.description || !editingTool.keyword || !editingTool.link) {
      setError('Please fill all required fields');
      return;
    }

    if (!imagePreview && !editingTool.image) {
      setError('Please upload an image');
      return;
    }

    if (editingTool.tags.length === 0) {
      setError('Please select at least one tag');
      return;
    }

    setLoading(true);
    try {
      let savedTool;
      
      if (editingTool.id) {
        // Update existing tool
        savedTool = await updateAITool(editingTool.id, editingTool, imageFile);
        setTools(tools.map(tool => tool.id === savedTool.id ? savedTool : tool));
      } else {
        // Add new tool
        savedTool = await addAITool(editingTool, imageFile);
        setTools([...tools, savedTool]);
      }
      
      setIsModalOpen(false);
      setEditingTool(null);
      setImagePreview(null);
      setImageFile(null);
      setError(null);
    } catch (err) {
      console.error('Error saving AI tool:', err);
      setError('Failed to save tool. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openDeleteConfirmation = (tool) => {
    setToolToDelete(tool);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteTool = async () => {
    if (!toolToDelete?.id) return;
    
    setLoading(true);
    try {
      await deleteAITool(toolToDelete.id);
      setTools(tools.filter(tool => tool.id !== toolToDelete.id));
      setIsDeleteModalOpen(false);
      setToolToDelete(null);
    } catch (err) {
      console.error('Error deleting AI tool:', err);
      setError('Failed to delete tool. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="ai-tools-manager">
        <div className="manager-header">
          <h2>Manage AI Tools</h2>
          <button 
            className="add-tool-btn"
            onClick={handleAddNewTool}
            disabled={loading}
          >
            <FaPlus /> Add New Tool
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading && !isModalOpen && !isDeleteModalOpen ? (
          <div className="loading-state">Loading AI tools...</div>
        ) : (
          <div className="tools-grid">
            {tools.length === 0 ? (
              <div className="no-tools">
                <p>No AI tools found. Click "Add New Tool" to create your first tool.</p>
              </div>
            ) : (
              tools.map(tool => (
                <div key={tool.id} className="tool-card">
                  <div className="tool-image">
                    <img src={tool.image} alt={tool.title} />
                  </div>
                  <div className="tool-content">
                    <h3>{tool.title}</h3>
                    <p className="tool-description">{tool.description}</p>
                    <div className="tool-keyword">Keyword: {tool.keyword}</div>
                    <div className="tool-tags">
                      {tool.tags.map(tag => (
                        <span key={tag} className="tool-tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="tool-actions">
                    <button 
                      className="edit-btn" 
                      onClick={() => handleEditTool(tool)}
                      title="Edit Tool"
                    >
                      <FaEdit />
                    </button>
                    <button 
                      className="delete-btn" 
                      onClick={() => openDeleteConfirmation(tool)}
                      title="Delete Tool"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tool Edit/Create Modal */}
        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>{editingTool?.id ? 'Edit AI Tool' : 'Add New AI Tool'}</h3>
                <button className="close-btn" onClick={handleCloseModal}>
                  <FaTimes />
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="title">Title*</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={editingTool?.title || ''}
                    onChange={handleInputChange}
                    placeholder="Tool title"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description">Description*</label>
                  <textarea
                    id="description"
                    name="description"
                    value={editingTool?.description || ''}
                    onChange={handleInputChange}
                    placeholder="Tool description"
                    rows={3}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="keyword">Keyword*</label>
                    <input
                      type="text"
                      id="keyword"
                      name="keyword"
                      value={editingTool?.keyword || ''}
                      onChange={handleInputChange}
                      placeholder="ex: ADS, MAP, etc."
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="link">Link*</label>
                    <input
                      type="url"
                      id="link"
                      name="link"
                      value={editingTool?.link || ''}
                      onChange={handleInputChange}
                      placeholder="https://..."
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Image*</label>
                  <div className="image-uploader">
                    {imagePreview ? (
                      <div className="image-preview">
                        <img src={imagePreview} alt="Tool preview" />
                        <button 
                          type="button" 
                          className="remove-image" 
                          onClick={() => {
                            setImagePreview(null);
                            setImageFile(null);
                            if (editingTool?.id) {
                              setEditingTool({...editingTool, image: ''});
                            }
                          }}
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ) : (
                      <div className="upload-placeholder">
                        <FaImage />
                        <p>Upload image</p>
                        <input
                          type="file"
                          id="image"
                          name="image"
                          onChange={handleImageChange}
                          accept="image/*"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Tags* (select at least one)</label>
                  <div className="tags-selector">
                    {availableTags.map(tag => (
                      <div 
                        key={tag} 
                        className={`tag-option ${editingTool?.tags?.includes(tag) ? 'selected' : ''}`}
                        onClick={() => handleTagToggle(tag)}
                      >
                        {tag}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  className="cancel-btn" 
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
                <button 
                  className="save-btn" 
                  onClick={handleSaveTool}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : <><FaSave /> Save</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && (
          <div className="modal-overlay">
            <div className="modal delete-modal">
              <div className="modal-header">
                <h3>Confirm Deletion</h3>
                <button className="close-btn" onClick={() => setIsDeleteModalOpen(false)}>
                  <FaTimes />
                </button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete <strong>{toolToDelete?.title}</strong>?</p>
                <p className="delete-warning">This action cannot be undone.</p>
              </div>
              <div className="modal-footer">
                <button 
                  className="cancel-btn" 
                  onClick={() => setIsDeleteModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="delete-confirm-btn" 
                  onClick={handleDeleteTool}
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AIToolsManager; 