import React, { useState, useEffect, useMemo } from 'react';
import { FaExternalLinkAlt, FaSearch, FaCalendarAlt, FaArrowRight } from 'react-icons/fa';
import '../styles/AITools.css';
import * as aiToolsService from '../services/aiToolsService';
import { useTheme } from '../contexts/ThemeContext';
import { HashLoader } from 'react-spinners';

// Import icons
import promptIcon from '../assets/ai-tools/prompt-icon.svg';
import textEffectsIcon from '../assets/ai-tools/text-effects-icon.svg';
import relightIcon from '../assets/ai-tools/relight-icon.svg';
import hedraIcon from '../assets/ai-tools/hedra-icon.svg';
import adsIcon from '../assets/ai-tools/ads-icon.svg';
import eraserIcon from '../assets/ai-tools/eraser-icon.svg';
import mindmapIcon from '../assets/ai-tools/mindmap-icon.svg';
import viralIcon from '../assets/ai-tools/viral-icon.svg';
import defaultAiIcon from '../assets/ai-tools/default-ai-icon.svg';

// Import theme classes
const themeClasses = "bg-gradient-to-br from-[#4158D0] via-[#C850C0] to-[#FFCC70] stars-pattern";

// Setup icon map for fallbacks
const iconMap = {
  "Prompt": promptIcon,
  "Text Effects": textEffectsIcon,
  "Relight": relightIcon,
  "Hedra": hedraIcon,
  "Ads": adsIcon,
  "Eraser": eraserIcon,
  "Mind Map": mindmapIcon,
  "Viral": viralIcon,
  "default": defaultAiIcon
};

// Available default tags if none are found in the database
const defaultAvailableTags = [
  'All',
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

const AITools = () => {
  const { darkMode } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tools, setTools] = useState([]);
  const [tags, setTags] = useState(['All']);
  const [retryCount, setRetryCount] = useState(0);

  // Helper function to ensure links have proper format
  const formatLink = (link) => {
    if (!link) return '#';
    
    // Check if the link already has http:// or https:// prefix
    if (link.startsWith('http://') || link.startsWith('https://')) {
      return link;
    }
    
    // Otherwise, add https:// prefix
    return `https://${link}`;
  };

  // Image loading handler
  const handleImageLoad = (e) => {
    const img = e.target;
    const { naturalWidth, naturalHeight } = img;
    
    // Determine aspect ratio
    if (naturalHeight > naturalWidth * 1.2) {
      // Portrait image (taller than wide)
      img.setAttribute('data-aspect', 'portrait');
    } else if (naturalWidth > naturalHeight * 1.2) {
      // Landscape image (wider than tall)
      img.setAttribute('data-aspect', 'landscape');
    } else {
      // Roughly square image
      img.setAttribute('data-aspect', 'square');
    }
    
    // Remove loading state
    img.classList.remove('img-loading');
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const fetchedTools = await aiToolsService.getAllAITools();
      if (fetchedTools && fetchedTools.length > 0) {
        setTools(fetchedTools);
        
        // Extract unique tags from the tools
        const toolTags = [...new Set(fetchedTools.flatMap(tool => tool.tags || []))];
        setTags(['All', ...toolTags]);
      } else {
        setTools([]);
      }
    } catch (err) {
      console.error('Error fetching AI tools:', err);
      setError('Failed to load AI tools. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [retryCount]); // Adding retryCount to enable manual refresh

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const filteredTools = tools.filter((tool) => {
    const titleMatch = tool.title.toLowerCase().includes(searchTerm.toLowerCase());
    const tagMatch = selectedTag === '' || selectedTag === 'All' || (tool.tags && tool.tags.includes(selectedTag));
    return titleMatch && tagMatch;
  });

  // Use the new loader component
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-b from-gray-900 to-blue-900">
        <div className="mb-8">
          <HashLoader color="#4FD1C5" size={70} speedMultiplier={0.8} />
        </div>
        <div className="text-white text-xl font-semibold mt-4">
          Loading AI Tools
        </div>
        <div className="text-blue-300 text-sm mt-2">
          Discovering the best tools for you...
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-16 ${darkMode ? "dark bg-[#2D1846]" : "bg-gray-50"} ${themeClasses}`}>
      {/* Custom booking header that matches the homepage */}
      <div className="bg-indigo-900 py-6 px-6">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-white">Wave Rider</h2>
            <p className="text-yellow-500 font-medium">Your Gateway to AI Mastery</p>
          </div>
          <div className="mt-4 md:mt-0">
            <a 
              href="https://calendly.com/your-booking-link" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-red-500 text-white rounded-full font-semibold flex items-center heartbeat-pulse"
            >
              <FaCalendarAlt className="mr-2" />
              Book a Training Session
              <FaArrowRight className="ml-2" />
            </a>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Page header using global class */}
          <div className="page-header-3d">
            <div className="absolute inset-0 bg-pattern opacity-30"></div>
            <div className="relative z-10">
              <h1 className="text-4xl sm:text-5xl font-bold text-center mb-4 tracking-tight">
                <span className="bg-gradient-to-r from-purple-300 via-pink-300 to-yellow-200 text-transparent bg-clip-text">
                  AI Tools Directory
                </span>
              </h1>
              <p className="text-white/80 text-center text-lg mb-2">
                Discover the best AI tools to enhance your workflow
              </p>
              <div className="w-20 h-1 bg-gradient-to-r from-purple-500 to-pink-500 mx-auto mt-4 rounded-full"></div>
            </div>
          </div>

          {/* Error state - Loading handled above */}
          {error ? (
            <div className="text-center py-12 glass-effect rounded-2xl p-6">
              <p className="text-red-400 text-lg mb-4">{error}</p>
              <button 
                onClick={handleRetry}
                className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 text-white transition-all"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* Search input with better positioning - using class-based approach */}
              <div className="mb-8">
                <div className="relative mx-auto max-w-3xl search-container">
                  <div className="search-icon-wrapper">
                    <FaSearch className="search-icon" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Search AI tools..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>

              {/* Tags filter - using global filter-tags-container */}
              {tools.length > 0 && (
                <div className="filter-tags-container">
                  <button
                    onClick={() => setSelectedTag('')}
                    className={`filter-button ${selectedTag === '' ? 'active' : ''}`}
                  >
                    All
                  </button>
                  {tags.filter(tag => tag !== 'All').map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(tag)}
                      className={`filter-button ${selectedTag === tag ? 'active' : ''}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}

              {/* Tools Container - Enhanced with glass effect */}
              {tools.length > 0 ? (
                <div className="glass-effect rounded-3xl p-6 shadow-xl transform transition-transform duration-700 hover:scale-[1.01]">
                  <div className="content-grid">
                    {filteredTools.length === 0 ? (
                      <div className="col-span-2 text-center py-12">
                        <p className="text-white/70">No tools match your search criteria. Try adjusting your filters.</p>
                      </div>
                    ) : (
                      filteredTools.map((tool, index) => (
                        <a
                          key={tool.id || `tool-${index}`}
                          href={formatLink(tool.link)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ai-tool-card glass-effect animate-fade-in shimmer-effect"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="tool-icon-container">
                            <img 
                              src={tool.image || iconMap[tool.keyword] || defaultAiIcon} 
                              alt={tool.title} 
                              className="img-loading w-full h-full" 
                              onLoad={handleImageLoad}
                              onError={(e) => {
                                e.target.src = iconMap[tool.keyword] || defaultAiIcon;
                                e.target.setAttribute('data-aspect', 'square');
                                e.target.classList.remove('img-loading');
                              }}
                            />
                          </div>
                          <div className="ai-tool-content">
                            <div className="flex justify-between items-center">
                              <h3 className="ai-tool-title">{tool.title}</h3>
                              <FaExternalLinkAlt className="external-link-icon" />
                            </div>
                            <p className="ai-tool-description">{tool.description}</p>
                            <div className="ai-tool-tags">
                              <span className="ai-tool-primary-tag">
                                {tool.keyword}
                              </span>
                              {tool.tags?.slice(0, 2).map((tag, tagIndex) => (
                                <span 
                                  key={tagIndex} 
                                  className="ai-tool-secondary-tag"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </a>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-white/70 mb-4">No AI tools found in the database.</p>
                  <p className="text-white/50 mb-6">AI tools need to be added by an administrator.</p>
                  
                  {/* Admin-only button */}
                  <a 
                    href="/admin/ai-tools"
                    className="px-6 py-3 bg-gradient-to-r from-purple-500/60 to-pink-500/60 rounded-lg text-white font-medium hover:from-purple-500/80 hover:to-pink-500/80 transition-all duration-300"
                  >
                    Go to Admin Panel
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default AITools;
 