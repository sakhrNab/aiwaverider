import React from 'react';
import { Link } from 'react-router-dom';
import './WishlistSection.css';

const WishlistCard = ({ wishlist }) => {
  return (
    <Link to={`/agents/wishlist/${wishlist.id}`} className="wishlist-card">
      <div className="wishlist-header">
        <div className="wishlist-info">
          <img 
            src={wishlist.creator.avatar} 
            alt={wishlist.creator.name}
            className="wishlist-avatar"
          />
          <div>
            <h3 className="wishlist-name">{wishlist.name}</h3>
            <p className="wishlist-creator">by {wishlist.creator.name}</p>
          </div>
        </div>
      </div>
      <div className="wishlist-items">
        {wishlist.items.map(item => (
          <img 
            key={item.id}
            src={item.imageUrl} 
            alt={item.name}
            className="wishlist-item"
          />
        ))}
      </div>
    </Link>
  );
};

const WishlistSection = ({ wishlists, isLoading }) => {
  if (isLoading) {
    return <div>Loading wishlists...</div>;
  }

  if (!wishlists || wishlists.length === 0) {
    return null;
  }

  return (
    <div className="wishlists-section">
      <h2 className="wishlists-title">Wishlists you might like</h2>
      <p className="wishlists-subtitle">Based on your interests and activity</p>
      <div className="wishlists-grid">
        {wishlists.map(wishlist => (
          <WishlistCard key={wishlist.id} wishlist={wishlist} />
        ))}
      </div>
    </div>
  );
};

export default WishlistSection; 