// src/components/layout/Footer.jsx

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFacebook, faInstagram, faTiktok, faYoutube } from '@fortawesome/free-brands-svg-icons';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white text-center py-4 mt-6">
      <p>&copy; 2024 AI Waverider. All rights reserved.</p>
      <p>
        <a href="/terms" className="hover:underline text-blue-400">Terms of Service</a> |
        <a href="/privacy" className="hover:underline text-blue-400"> Privacy Policy</a>
      </p>

      {/* Social Media Links */}
      <div className="mt-4 flex justify-center space-x-4">
        <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" className="text-xl hover:text-blue-600">
          <FontAwesomeIcon icon={faFacebook} />
        </a>
        <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" className="text-xl hover:text-pink-600">
          <FontAwesomeIcon icon={faInstagram} />
        </a>
        <a href="https://www.tiktok.com" target="_blank" rel="noopener noreferrer" className="text-xl hover:text-black">
          <FontAwesomeIcon icon={faTiktok} />
        </a>
        <a href="https://www.youtube.com/shorts" target="_blank" rel="noopener noreferrer" className="text-xl hover:text-red-600">
          <FontAwesomeIcon icon={faYoutube} />
        </a>
      </div>
    </footer>
  );
};

export default Footer;
