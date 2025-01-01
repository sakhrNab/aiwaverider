// backend/utils/sanitize.js

const sanitizeHtml = require('sanitize-html');

const sanitizeContent = (html) => {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'iframe', 'h1', 'h2', 'h3', 'pre', 'code']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      'img': ['src', 'alt', 'class', 'width', 'height', 'style', 'data-align'],  // Add style
      '*': ['style', 'class'], // Allow style on all elements
      'a': ['href', 'name', 'target'],
      'iframe': ['src', 'width', 'height', 'allow', 'allowfullscreen'],
    },
    allowedStyles: {
      '*': {
        'max-width': [/.*/],
        'height': [/.*/],
        'width': [/.*/],
        'margin': [/.*/],
        'display': [/.*/],
        'float': [/.*/],
        'text-align': [/.*/]
      }
    },
    allowedSchemes: ['data', 'http', 'https'],
    allowedSchemesByTag: {
      iframe: ['http', 'https'],
      img: ['data', 'http', 'https'],
    },
    allowProtocolRelative: false,
  });
};

module.exports = sanitizeContent;
