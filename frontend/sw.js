// Cache Names
const CACHE_NAME = 'ai-wave-rider-cache-v2';
const IMAGE_CACHE_NAME = 'ai-wave-rider-images-v2';
const API_CACHE_NAME = 'ai-wave-rider-api-v2';
const urlsToCache = [
  // Add your core JS libraries
  '/static/js/react-lazy-load-image-component.js',
  '/static/js/embla-carousel-react.js',
  '/static/js/embla-carousel-autoplay.js',
  // Add more library files
];
// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg',
  '/offline-image.svg'
  // Add other important assets here
];

// Add these lines to track in-flight requests to prevent duplicates
const inFlightRequests = new Map();

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Install Event - Cache the static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  const cacheAllowlist = [CACHE_NAME, IMAGE_CACHE_NAME, API_CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheAllowlist.includes(cacheName)) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Now ready to handle fetches!');
      return self.clients.claim();
    })
  );
});

// Helper function to determine if a URL is an image
const isImageUrl = (url) => {
  // Check if URL ends with image extensions
  if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)($|\?)/i)) {
    return true;
  }
  
  // Check if URL contains Firebase storage paths that contain images
  if (url.includes('firebasestorage') && url.includes('/images/')) {
    return true;
  }
  
  // Also check custom storage paths
  if (url.includes('aiwaverider.firebasestorage.app/agents/')) {
    return true;
  }
  
  return false;
};

// Helper function to check if a URL is an API or authentication call
const isApiUrl = (url) => {
  return url.includes('firestore.googleapis.com') || 
         url.includes('identitytoolkit.googleapis.com') || 
         url.includes('securetoken.googleapis.com') ||
         url.includes('googleapis.com') ||
         url.includes('api') ||
         url.includes('sandbox.paypal.com');
};

// Add function to check if URL is a stats endpoint that should be ignored
const isStatsEndpoint = (url) => {
  return url.includes('/stats') || 
         url.includes('/analytics') || 
         url.endsWith('/sw.js:90') || 
         url.endsWith('/sw.js:148') ||
         // Skip Firebase real-time listeners that should maintain open connections
         (url.includes('firestore.googleapis.com') && url.includes('/Listen/channel')) ||
         (url.includes('googleapis.com') && url.includes('channel'));
};

// Helper function to create a network-first strategy with timeout
const networkFirstWithTimeout = async (request, timeout = 3000) => {
  try {
    // Skip stats endpoints that might return 404
    if (isStatsEndpoint(request.url)) {
      // Return a mock response to prevent 404 errors
      return new Response(JSON.stringify({ success: true, message: 'Stats skipped' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check if this request is already in flight
    const requestKey = request.url;
    if (inFlightRequests.has(requestKey)) {
      console.log('Request already in flight, reusing promise:', requestKey);
      return inFlightRequests.get(requestKey);
    }
    
    // Create a promise that rejects after the timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Network timeout')), timeout);
    });
    
    // Create a promise for the network request
    const networkPromise = fetch(request);
    
    // Store the promise in the in-flight map
    const responsePromise = Promise.race([networkPromise, timeoutPromise])
      .then(response => {
        // Remove from in-flight requests when done
        inFlightRequests.delete(requestKey);
        
        // If successful, clone and cache the response
        if (response && response.status === 200) {
          const cacheName = isImageUrl(request.url) ? IMAGE_CACHE_NAME : 
                          isApiUrl(request.url) ? API_CACHE_NAME : CACHE_NAME;
          
          const clone = response.clone();
          caches.open(cacheName).then(cache => cache.put(request, clone));
        }
        
        return response;
      })
      .catch(error => {
        // Remove from in-flight requests when error occurs
        inFlightRequests.delete(requestKey);
        throw error;
      });
    
    // Store the promise in the in-flight map
    inFlightRequests.set(requestKey, responsePromise);
    
    return responsePromise;
  } catch (error) {
    console.log('Network request failed, falling back to cache', request.url, error);
    
    // Try to get from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If it's an image, return the offline image
    if (isImageUrl(request.url)) {
      return caches.match('/offline-image.svg');
    }
    
    // For API calls, return an empty response to prevent errors
    if (isApiUrl(request.url)) {
      if (request.method === 'POST') {
        // For POST requests, return an offline-friendly response
        return new Response(JSON.stringify({
          error: 'offline',
          message: 'You are currently offline'
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // For other requests, return a generic offline response
    return new Response('Offline mode active', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};

// Fetch Event
self.addEventListener('fetch', (event) => {
  // Skip stats endpoints entirely
  if (isStatsEndpoint(event.request.url)) {
    event.respondWith(
      new Response(JSON.stringify({ success: true, message: 'Stats skipped' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    return;
  }
  
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    // For non-GET requests (like POST), try to fetch from network
    // If network fails, return a friendly offline response
    event.respondWith(
      fetch(event.request).catch(() => {
        if (isApiUrl(event.request.url)) {
          return new Response(JSON.stringify({
            error: 'offline',
            message: 'You are currently offline'
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response('Offline mode active', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      })
    );
    return;
  }
  
  // Handle cross-origin requests carefully
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('firebasestorage') && 
      !event.request.url.includes('googleapis') &&
      !isApiUrl(event.request.url)) {
    // For third-party requests, try network only
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // If it's an image, return the offline image
          if (isImageUrl(event.request.url)) {
            return caches.match('/offline-image.svg');
          }
          // Otherwise, just let the browser handle the error
          return;
        })
    );
    return;
  }
  
  // For images: Network first with timeout, then cache, fallback to offline image
  if (isImageUrl(event.request.url)) {
    event.respondWith(networkFirstWithTimeout(event.request));
    return;
  }
  
  // For API requests: Network first with short timeout
  if (isApiUrl(event.request.url)) {
    event.respondWith(networkFirstWithTimeout(event.request, 2000));
    return;
  }
  
  // For everything else: Cache first, network fallback
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached response if found
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Check if this request is already in flight
        const requestKey = event.request.url;
        if (inFlightRequests.has(requestKey)) {
          console.log('Request already in flight, reusing promise:', requestKey);
          return inFlightRequests.get(requestKey);
        }
        
        // Otherwise try network
        const fetchPromise = fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200) {
              return response;
            }
            
            // Cache successful responses
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseClone);
              });
            
            return response;
          })
          .catch(() => {
            // If network fails and it's an HTML request, return the cached index.html
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
            
            return new Response('Offline mode active', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            });
          })
          .finally(() => {
            // Remove from in-flight requests when done
            inFlightRequests.delete(requestKey);
          });
        
        // Store the promise in the in-flight map
        inFlightRequests.set(requestKey, fetchPromise);
        
        return fetchPromise;
      })
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'New notification',
      icon: data.icon || '/vite.svg',
      badge: data.badge || '/vite.svg',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(
        data.title || 'AI Waverider Notification', 
        options
      )
    );
  } catch (e) {
    console.error('Error handling push notification:', e);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

// Handle service worker messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Received SKIP_WAITING message, activating now...');
    self.skipWaiting();
  }
}); 