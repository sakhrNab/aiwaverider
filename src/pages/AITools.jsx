import React, { useState, useEffect, useMemo } from 'react';
import { FaExternalLinkAlt } from 'react-icons/fa';
import '../styles/AITools.css';
import * as aiToolsService from '../services/aiToolsService';

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
  const [darkMode] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tools, setTools] = useState([]);
  const [tags, setTags] = useState(['All']);
  const [retryCount, setRetryCount] = useState(0);

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

  return (
    <div className={`min-h-screen pb-16 ${darkMode ? "dark bg-[#2D1846]" : "bg-gray-50"} ${themeClasses}`}>
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-[#2D1846] bg-opacity-70 backdrop-blur-lg rounded-3xl p-8 mb-8 shadow-lg border border-white/10 transition-all duration-700">
            <h1 className="text-4xl sm:text-5xl font-bold text-white text-center mb-4">
              <span className="bg-gradient-to-r from-purple-300 to-pink-300 text-transparent bg-clip-text">
                AI Tools Directory
              </span>
            </h1>
            <p className="text-white/80 text-center text-lg mb-2">
              Discover the best AI tools to enhance your workflow
            </p>
            <div className="flex justify-center mt-4">
              <a 
                href="/booking" 
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white font-medium hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300"
              >
                Book a Training Session
              </a>
            </div>
          </div>

          {/* Loading and Error states */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
              <p className="text-white text-lg">Loading AI tools...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 bg-white/10 backdrop-blur-md rounded-2xl p-6">
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
              {/* Search input */}
              <div className="mb-8">
                <div className="relative mx-auto max-w-3xl">
                  <input 
                    type="text" 
                    placeholder="Search AI tools..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-4 pl-12 bg-gradient-to-r from-white/15 to-white/10 backdrop-blur-lg border border-white/20 rounded-full text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 shadow-lg transition-all duration-300 focus:shadow-xl"
                  />
                  <svg 
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50" 
                    width="20" 
                    height="20" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      d="M19 19L13.5 13.5M15.5 8.5C15.5 12.366 12.366 15.5 8.5 15.5C4.63401 15.5 1.5 12.366 1.5 8.5C1.5 4.63401 4.63401 1.5 8.5 1.5C12.366 1.5 15.5 4.63401 15.5 8.5Z" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Tags filter */}
              {tools.length > 0 && (
                <div className="mb-8">
                  <div className="flex flex-wrap justify-center gap-3">
                    <button
                      onClick={() => setSelectedTag('')}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                        selectedTag === '' ? 
                        'bg-gradient-to-r from-purple-500/40 to-pink-500/40 text-white shadow-md border border-white/30' : 
                        'bg-white/10 backdrop-blur-sm border border-white/10 text-white/70 hover:bg-white/15'
                      }`}
                    >
                      All
                    </button>
                    {tags.filter(tag => tag !== 'All').map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTag(tag)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                          selectedTag === tag ? 
                          'bg-gradient-to-r from-purple-500/40 to-pink-500/40 text-white shadow-md border border-white/30' : 
                          'bg-white/10 backdrop-blur-sm border border-white/10 text-white/70 hover:bg-white/15'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tools Container */}
              {tools.length > 0 ? (
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 shadow-lg transform transition-transform duration-700 hover:scale-[1.01]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredTools.length === 0 ? (
                      <div className="col-span-2 text-center py-12">
                        <p className="text-white/70">No tools match your search criteria. Try adjusting your filters.</p>
                      </div>
                    ) : (
                      filteredTools.map((tool, index) => (
                        <a
                          key={tool.id || `tool-${index}`}
                          href={tool.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/15 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg flex items-start gap-4 group animate-fade-in"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="w-14 h-14 bg-gradient-to-br from-purple-500/40 to-pink-500/40 rounded-xl p-2.5 flex items-center justify-center border border-white/20 shadow-inner group-hover:scale-110 transition-transform duration-300">
                            <img 
                              src={tool.image || iconMap[tool.keyword] || defaultAiIcon} 
                              alt={tool.title} 
                              className="w-full h-full object-contain" 
                              onError={(e) => {
                                e.target.src = iconMap[tool.keyword] || defaultAiIcon;
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <h3 className="font-semibold text-lg">{tool.title}</h3>
                              <FaExternalLinkAlt className="opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>
                            <p className="text-sm text-white/70 mt-1 line-clamp-2">{tool.description}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="inline-block px-3 py-1 bg-white/10 border border-white/15 rounded-full text-xs font-medium">
                                {tool.keyword}
                              </span>
                              {tool.tags?.slice(0, 2).map((tag, tagIndex) => (
                                <span 
                                  key={tagIndex} 
                                  className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-white/60"
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
 