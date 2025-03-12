import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaStar, FaUsers, FaShoppingBag } from 'react-icons/fa';

const WishlistDetail = () => {
  const { wishlistId } = useParams();
  const [wishlist, setWishlist] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real implementation, this would fetch the wishlist data from the API
    setTimeout(() => {
      setWishlist({
        id: wishlistId,
        title: 'Free resources god bless',
        creator: {
          id: 'creator-1',
          name: 'zil',
          avatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50"%3E%3Ccircle cx="25" cy="25" r="25" fill="%23e0e0e0"/%3E%3Ctext x="25" y="30" font-family="Arial" font-size="20" text-anchor="middle" fill="%23999"%3Ez%3C/text%3E%3C/svg%3E'
        },
        products: 563,
        followers: 16,
        description: 'This collection features all the free resources I\'ve found that have helped me in my journey. Sharing with all of you!',
        items: Array.from({ length: 16 }, (_, i) => ({
          id: `item-${i}`,
          title: `Item ${i + 1}`,
          price: i % 3 === 0 ? 'Free' : `$${(Math.random() * 50).toFixed(2)}`,
          image: `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"%3E%3Crect width="300" height="300" fill="%23f0f0f0"/%3E%3Ctext x="150" y="150" font-family="Arial" font-size="24" text-anchor="middle" fill="%23999"%3EItem ${i+1}%3C/text%3E%3C/svg%3E`,
          creator: {
            id: `creator-${i}`,
            name: `Creator ${i + 1}`,
            avatar: `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50"%3E%3Ccircle cx="25" cy="25" r="25" fill="%23e0e0e0"/%3E%3Ctext x="25" y="30" font-family="Arial" font-size="20" text-anchor="middle" fill="%23999"%3EC${i+1}%3C/text%3E%3C/svg%3E`
          },
          rating: {
            average: (3 + Math.random() * 2).toFixed(1),
            count: Math.floor(Math.random() * 500) + 1
          }
        }))
      });
      setIsLoading(false);
    }, 800);
  }, [wishlistId]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <nav className="mb-6 text-sm">
        <Link to="/agents" className="text-blue-600 hover:underline">← Back to Agents</Link>
      </nav>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-start gap-4 mb-4">
          <img 
            src={wishlist.creator.avatar} 
            alt={wishlist.creator.name} 
            className="w-16 h-16 rounded-full" 
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{wishlist.title}</h1>
            <div className="text-gray-600">By {wishlist.creator.name}</div>
            <div className="flex items-center gap-4 mt-2 text-gray-600">
              <div className="flex items-center">
                <FaShoppingBag className="mr-1" />
                <span>{wishlist.products} products</span>
              </div>
              <div className="flex items-center">
                <FaUsers className="mr-1" />
                <span>{wishlist.followers} followers</span>
              </div>
            </div>
          </div>
        </div>
        
        {wishlist.description && (
          <div className="mb-4 text-gray-700">
            {wishlist.description}
          </div>
        )}
        
        <button className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          Follow Wishlist
        </button>
      </div>
      
      <h2 className="text-xl font-semibold mb-4">Items in this Wishlist</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {wishlist.items.map((item) => (
          <div key={item.id} className="agent-card">
            <Link to={`/agents/${item.id}`} className="agent-link">
              <img src={item.image} alt={item.title} className="agent-image" />
              <div className="agent-content">
                <h3 className="agent-title">{item.title}</h3>
                <div className="agent-creator">
                  <img src={item.creator.avatar} alt={item.creator.name} className="creator-avatar" />
                  <span className="creator-name">{item.creator.name}</span>
                </div>
                <div className="agent-footer">
                  <div className="agent-price">{item.price}</div>
                  {item.rating && (
                    <div className="agent-rating">
                      <FaStar className="rating-star" />
                      <span>{item.rating.average} ({item.rating.count})</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WishlistDetail; 