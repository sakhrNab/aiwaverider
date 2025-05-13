// import React, { useState, useEffect } from 'react';
// import { Link } from 'react-router-dom';
// import { FaExclamationTriangle } from 'react-icons/fa';
// import './WishlistSection.css';

// const WishlistCard = ({ wishlist }) => {
//   // Function to handle image errors and use a default placeholder
//   const handleImageError = (e) => {
//     // Use a data URI for the placeholder instead of a missing file
//     e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cpath d='M35 40 L65 60 M65 40 L35 60' stroke='%23999' stroke-width='2'/%3E%3C/svg%3E";
//     e.target.onerror = null; // Prevent infinite error loops
//   };

//   // Generate a default avatar using data URI instead of via.placeholder.com
//   const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23e0e0e0'/%3E%3Ctext x='50' y='55' font-family='Arial' font-size='24' text-anchor='middle' fill='%23999'%3EAW%3C/text%3E%3C/svg%3E";
  
//   // Check if creator exists, otherwise provide defaults
//   const creator = wishlist.creator || { name: 'Unknown Creator', avatar: defaultAvatar };
//   const avatarSrc = creator.avatar || defaultAvatar;
//   const creatorName = creator.name || 'Unknown Creator';

//   return (
//     <Link to={`/agents/wishlist/${wishlist.id}`} className="wishlist-card">
//       <div className="wishlist-header">
//         <div className="wishlist-info">
//           <img 
//             src={avatarSrc} 
//             alt={creatorName}
//             className="wishlist-avatar"
//             onError={handleImageError}
//           />
//           <div>
//             <h3 className="wishlist-name">{wishlist.name || 'Unnamed Wishlist'}</h3>
//             <p className="wishlist-creator">by {creatorName}</p>
//           </div>
//         </div>
//       </div>
//       <div className="wishlist-items">
//         {wishlist.items && wishlist.items.length > 0 ? (
//           wishlist.items.map((item, index) => (
//             <img 
//               key={item.id || `item-${index}`}
//               src={item.imageUrl || defaultAvatar} 
//               alt={item.title || 'Agent'}
//               className="wishlist-item"
//               onError={handleImageError}
//             />
//           ))
//         ) : (
//           <div className="no-items">No items in this wishlist</div>
//         )}
//       </div>
//       <div className="wishlist-footer">
//         <span className="wishlist-item-count">{wishlist.itemCount || 0} items</span>
//         <span className="wishlist-date">
//           {wishlist.updatedAt ? new Date(wishlist.updatedAt).toLocaleDateString() : 'N/A'}
//         </span>
//       </div>
//     </Link>
//   );
// };

// const WishlistSection = ({ wishlists, isLoading }) => {
//   if (isLoading) {
//     return (
//       <div className="wishlists-section">
//         <div className="loading-container">
//           <div className="loading-spinner"></div>
//         </div>
//       </div>
//     );
//   }

//   if (!wishlists || wishlists.length === 0) {
//     return null;
//   }

//   return (
//     <div className="wishlists-section">
//       <h2 className="wishlists-title">Wishlists you might like</h2>
//       <p className="wishlists-subtitle">Based on your interests and activity</p>
      
//       <div className="wishlists-grid">
//         {wishlists.map(wishlist => (
//           <WishlistCard key={wishlist.id} wishlist={wishlist} />
//         ))}
//       </div>
//     </div>
//   );
// };

// export default WishlistSection; 