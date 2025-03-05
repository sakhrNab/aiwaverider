import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaStar, FaHeart, FaRegHeart, FaCheckCircle, FaDownload, FaRegClock, FaShareAlt } from 'react-icons/fa';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { toggleWishlist } from '../utils/api';
import { toast } from 'react-toastify';
import DOMPurify from 'dompurify';

const StarRating = ({ rating }) => {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <FaStar 
          key={star} 
          className={star <= Math.round(rating) ? "text-yellow-400" : "text-gray-300"} 
        />
      ))}
    </div>
  );
};

const AgentDetail = () => {
  const { agentId } = useParams();
  const { user } = useContext(AuthContext);
  const [agent, setAgent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [reviewInput, setReviewInput] = useState('');
  const [userRating, setUserRating] = useState(5);

  useEffect(() => {
    const fetchAgentDetails = async () => {
      setIsLoading(true);
      try {
        // In production, replace with actual API call
        const response = await fetch(`/api/agents/${agentId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch agent details');
        }
        const data = await response.json();
        setAgent(data);
        // In a real implementation, you'd check if the current user has wishlisted this agent
        setIsWishlisted(false);
      } catch (error) {
        console.error('Error fetching agent details:', error);
        toast.error('Failed to load agent details');
        
        // Fallback to mock data for development
        setAgent({
          id: agentId,
          name: '2024 Crypto Market Halving Report & Analysis',
          description: 'Discover the secrets of Bitcoin Halving—a rare event occurring every four years that historically triggers significant price changes—with info-rich analysis giving you actionable insights to seize the unprecedented opportunity and maximize profits.',
          longDescription: `
            <h2>About This Agent</h2>
            <p>This comprehensive report analyzes the upcoming Bitcoin halving event and its potential impact on the crypto market. Based on historical data and expert analysis, it provides actionable insights for investors.</p>
            
            <h2>Key Features</h2>
            <ul>
              <li>Detailed analysis of previous halving events and their market impact</li>
              <li>Price prediction models based on historical patterns</li>
              <li>Investment strategies for before, during, and after the halving</li>
              <li>Risk assessment and volatility forecasts</li>
              <li>Expert opinions from leading cryptocurrency analysts</li>
            </ul>
            
            <h2>Use Cases</h2>
            <p>This report is perfect for:</p>
            <ul>
              <li>Cryptocurrency investors looking to maximize returns</li>
              <li>Traders developing halving-specific strategies</li>
              <li>Financial analysts studying market patterns</li>
              <li>Anyone interested in understanding the Bitcoin ecosystem</li>
            </ul>
          `,
          imageUrl: 'https://picsum.photos/600/400?random=crypto-report',
          category: 'Business & Money',
          price: 29.99,
          isFree: false,
          rating: 4.7,
          reviewCount: 238,
          dateCreated: new Date(Date.now() - 30000000),
          popularity: 95,
          fileSize: '1.47 MB',
          pageCount: 98,
          requirements: 'Any PDF reader',
          creator: {
            id: 'creator-special',
            name: 'TokenGenius',
            avatar: 'https://picsum.photos/50/50?random=special',
            bio: 'Expert cryptocurrency analysis and market insights'
          },
          reviews: [
            {
              id: 'review-1',
              user: {
                name: 'Anonymous',
                avatar: 'https://picsum.photos/50/50?random=rev1'
              },
              rating: 5,
              date: new Date(Date.now() - 5000000),
              text: 'Excellent, informative and well-researched Bitcoin report with everything you need.'
            },
            {
              id: 'review-2',
              user: {
                name: 'Future Byte',
                avatar: 'https://picsum.photos/50/50?random=rev2'
              },
              rating: 4,
              date: new Date(Date.now() - 15000000),
              text: 'Simple but effective. Good information.'
            },
            {
              id: 'review-3',
              user: {
                name: 'Anonymous',
                avatar: 'https://picsum.photos/50/50?random=rev3'
              },
              rating: 5,
              date: new Date(Date.now() - 25000000),
              text: 'Thank you for sharing your knowledge.'
            },
            {
              id: 'review-4',
              user: {
                name: 'CryptoExpert',
                avatar: 'https://picsum.photos/50/50?random=rev4'
              },
              rating: 5,
              date: new Date(Date.now() - 35000000),
              text: 'Concise and informative.'
            }
          ],
          relatedAgents: Array(4).fill().map((_, i) => ({
            id: `related-${i+1}`,
            name: `Related Agent ${i+1}`,
            description: 'A related product you might be interested in.',
            imageUrl: `https://picsum.photos/300/200?random=${i+100}`,
            price: Math.floor(Math.random() * 40) + 10,
            rating: (Math.random() * 2 + 3).toFixed(1),
            reviewCount: Math.floor(Math.random() * 200) + 10
          }))
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgentDetails();
  }, [agentId]);

  const handleWishlist = async () => {
    if (!user) {
      toast.info('Please sign in to add items to your wishlist');
      return;
    }
    
    try {
      setWishlistLoading(true);
      const result = await toggleWishlist(agentId);
      setIsWishlisted(!isWishlisted); // Toggle state based on current state
      toast.success(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      toast.error('Failed to update wishlist');
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.info('Please sign in to submit a review');
      return;
    }
    
    if (!reviewInput.trim()) {
      toast.error('Please enter a review comment');
      return;
    }
    
    // In a real app, this would submit to the API
    toast.success('Your review has been submitted for approval');
    setReviewInput('');
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const calculateRatingPercentages = (reviews) => {
    if (!reviews || reviews.length === 0) return {
      5: 0, 4: 0, 3: 0, 2: 0, 1: 0
    };
    
    const counts = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0};
    reviews.forEach(review => {
      counts[review.rating] = (counts[review.rating] || 0) + 1;
    });
    
    const total = reviews.length;
    return {
      5: Math.round((counts[5] / total) * 100),
      4: Math.round((counts[4] / total) * 100),
      3: Math.round((counts[3] / total) * 100),
      2: Math.round((counts[2] / total) * 100),
      1: Math.round((counts[1] / total) * 100)
    };
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  const ratingPercentages = calculateRatingPercentages(agent.reviews);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <nav className="mb-6 text-sm">
        <Link to="/agents" className="text-blue-600 hover:underline">← Back to Agents</Link>
      </nav>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left column - Image and info */}
        <div className="lg:col-span-3">
          <div className="agent-image-container rounded-lg overflow-hidden shadow-lg mb-6">
            <img src={agent.imageUrl} alt={agent.name} className="w-full h-auto" />
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex border-b pb-4 mb-4">
              <button 
                className={`mr-6 pb-2 ${activeTab === 'description' ? 'text-indigo-600 border-b-2 border-indigo-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('description')}
              >
                Description
              </button>
              <button 
                className={`mr-6 pb-2 ${activeTab === 'reviews' ? 'text-indigo-600 border-b-2 border-indigo-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('reviews')}
              >
                Reviews ({agent.reviews ? agent.reviews.length : 0})
              </button>
              <button 
                className={`pb-2 ${activeTab === 'related' ? 'text-indigo-600 border-b-2 border-indigo-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('related')}
              >
                Related Items
              </button>
            </div>
            
            {activeTab === 'description' && (
              <div className="description-content">
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(agent.longDescription) }} className="prose max-w-none text-gray-700" />
              </div>
            )}
            
            {activeTab === 'reviews' && (
              <div className="reviews-content">
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4">Ratings ({agent.reviewCount || 0})</h2>
                  
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1">
                      {[5, 4, 3, 2, 1].map(rating => (
                        <div key={rating} className="flex items-center mb-2">
                          <span className="w-12 text-sm text-gray-600">{rating} stars</span>
                          <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-yellow-400 h-2.5 rounded-full" 
                              style={{ width: `${ratingPercentages[rating]}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-8">{ratingPercentages[rating]}%</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex flex-col items-center justify-center border-l pl-8">
                      <div className="text-5xl font-bold text-yellow-500 mb-2">{agent.rating || 0}</div>
                      <StarRating rating={agent.rating || 0} />
                      <div className="text-sm text-gray-500 mt-2">out of 5</div>
                      <div className="text-xs text-gray-400 mt-1">({agent.reviewCount || 0} ratings)</div>
                    </div>
                  </div>
                </div>
                
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4">Reviews</h2>
                  
                  {agent.reviews && agent.reviews.length > 0 ? (
                    <div className="space-y-4">
                      {agent.reviews.map(review => (
                        <div key={review.id} className="border-b pb-4">
                          <div className="flex items-center mb-2">
                            <img 
                              src={review.user.avatar} 
                              alt={review.user.name} 
                              className="w-10 h-10 rounded-full mr-3" 
                            />
                            <div>
                              <div className="font-medium">{review.user.name}</div>
                              <div className="text-sm text-gray-500">{formatDate(review.date)}</div>
                            </div>
                          </div>
                          <div className="flex mb-2">
                            <StarRating rating={review.rating} />
                          </div>
                          <p className="text-gray-700">{review.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No reviews yet.</p>
                  )}
                </div>
                
                <div>
                  <h2 className="text-xl font-semibold mb-4">Add Your Review</h2>
                  
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Your Rating</label>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button 
                            key={star}
                            type="button"
                            className="text-2xl focus:outline-none"
                            onClick={() => setUserRating(star)}
                          >
                            <FaStar 
                              className={star <= userRating ? "text-yellow-400" : "text-gray-300"} 
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="review" className="block text-sm font-medium text-gray-700 mb-1">Your Review</label>
                      <textarea
                        id="review"
                        rows="4"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={reviewInput}
                        onChange={(e) => setReviewInput(e.target.value)}
                        placeholder="Share your thoughts about this item..."
                      ></textarea>
                    </div>
                    
                    <button 
                      type="submit" 
                      className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      Submit Review
                    </button>
                  </form>
                </div>
              </div>
            )}
            
            {activeTab === 'related' && (
              <div className="related-content">
                <h2 className="text-xl font-semibold mb-4">You Might Also Like</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {agent.relatedAgents && agent.relatedAgents.map(relatedAgent => (
                    <Link key={relatedAgent.id} to={`/agents/${relatedAgent.id}`} className="block">
                      <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                        <img 
                          src={relatedAgent.imageUrl} 
                          alt={relatedAgent.name} 
                          className="w-full h-32 object-cover" 
                        />
                        <div className="p-3">
                          <h3 className="font-medium text-gray-800 mb-1 truncate">{relatedAgent.name}</h3>
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                              <span className="font-medium text-indigo-600">${relatedAgent.price.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center text-sm">
                              <FaStar className="text-yellow-400 mr-1" />
                              <span>{relatedAgent.rating}</span>
                              <span className="text-gray-400 ml-1">({relatedAgent.reviewCount})</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Right column - Purchase info */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">{agent.name}</h1>
            
            <div className="agent-creator mb-4 flex items-center">
              <img src={agent.creator.avatar} alt={agent.creator.name} className="w-10 h-10 rounded-full mr-3" />
              <span className="text-gray-600">By <span className="font-medium">{agent.creator.name}</span></span>
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="text-3xl font-bold text-indigo-600">${agent.price.toFixed(2)}</div>
              <button 
                className={`wishlist-button flex items-center justify-center h-10 w-10 rounded-full border ${isWishlisted ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}
                onClick={handleWishlist}
                disabled={wishlistLoading}
              >
                {isWishlisted ? 
                  <FaHeart className="text-red-500 text-xl" /> : 
                  <FaRegHeart className="text-gray-400 text-xl" />
                }
              </button>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center mb-2">
                <StarRating rating={agent.rating} />
                <span className="ml-2 text-gray-600">
                  {agent.rating} ({agent.reviewCount} reviews)
                </span>
              </div>
              
              <p className="text-gray-700 mb-4">{agent.description}</p>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-gray-600">
                  <FaCheckCircle className="text-green-500 mr-2" />
                  <span>Instant digital download</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <FaDownload className="text-gray-500 mr-2" />
                  <span>File size: {agent.fileSize}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <FaRegClock className="text-gray-500 mr-2" />
                  <span>Pages: {agent.pageCount}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3 mb-6">
              <button className="w-full py-3 px-6 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center">
                Add to Cart
              </button>
              
              <button className="w-full py-3 px-6 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center">
                Buy Now
              </button>
            </div>
            
            <div>
              <button className="w-full py-2 flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors">
                <FaShareAlt className="mr-2" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentDetail; 