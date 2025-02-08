// backend/utils/sanitize.js

const sanitizeHtml = require('sanitize-html');

const sanitizeContent = (html) => {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'img', 'iframe', 'h1', 'h2', 'h3', 'h4' , 'h5', 'pre', 'code', 'div', 'span'
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      '*': ['style', 'class'], // Allow style on all elements
      'img': ['src', 'alt', 'class', 'width', 'height', 'style', 'data-align'],
      'a': ['href', 'name', 'target'],
      'iframe': ['src', 'width', 'height', 'allow', 'allowfullscreen'],
    },
    allowedStyles: {
      '*': {
        'margin-top': [/.*/],
        'margin-bottom': [/.*/],
        'font-size': [/.*/],
        'line-height': [/.*/],
        'text-wrap': [/.*/],
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
