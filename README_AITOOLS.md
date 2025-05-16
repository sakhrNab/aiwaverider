# AI Tools Directory

This module provides a directory of AI tools that users can browse without requiring authentication.

## Features

- Display a collection of AI tools with images, descriptions, and links
- Filter tools by tags and search functionality
- Beautiful gradient UI with glass morphism elements
- Works offline with cached data
- Public read access for all users
- Admin-only write access

## Implementation Details

The AI Tools feature consists of these main components:

1. **Frontend UI (src/pages/AITools.jsx)**
   - Responsive grid display of AI tools
   - Search and tag filtering
   - Loading and error states

2. **Frontend Service (src/services/aiToolsService.js)**
   - Fetches data from Firebase with caching
   - Provides browser-side CRUD operations for tools

3. **Backend API (backend/routes/ai-tools.js)**
   - Public read access endpoints
   - Authentication-protected write endpoints
   - Admin-only seed endpoint

4. **Firebase Rules (backend/config/firebase-rules.js)**
   - Public read access to AI tools collection
   - Admin-only write access to AI tools collection
   - Public read access to AI tool images

## Setup Firebase Security Rules

For the AI Tools to be publicly accessible without authentication, you need to configure Firebase Security Rules correctly.

In your Firebase Console:

1. Go to Firestore Database > Rules
2. Add this rule to allow public read access but require authentication for writes:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow public read access to AI tools
    match /ai_tools/{document=**} {
      allow read: true;  // Anyone can read AI tools
      allow write: if request.auth != null &&  // Only authenticated admins can modify
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Other collections should require authentication
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Seeding Initial Data

To populate the database with sample AI tools, either:

1. Run the seed script from the command line:
```
cd backend
node scripts/seedAITools.js
```

2. Use the API endpoint (admin only):
```
POST /api/ai-tools/seed
```

## Caching Mechanism

The application implements caching to ensure fast loading and offline access:

1. Firebase data is cached in localStorage with a 5-minute expiration
2. Cache is automatically invalidated when admins make changes
3. Cache can be force refreshed when needed

## Administration

New AI tools can be added through:

1. The admin panel (requires admin authentication)
2. Running the seed script (when database is empty)
3. Directly via Firebase Console 

## Deploying Firebase Rules

To deploy the security rules to your Firebase project:

1. Create a `firebase.json` file in your project root (if not already present):

```json
{
  "firestore": {
    "rules": "firebase-rules.firestore.rules",
    "indexes": "firebase-indexes.json"
  },
  "storage": {
    "rules": "firebase-rules.storage.rules"
  }
}
```

2. Create the rules files from the configuration in `backend/config/firebase-rules.js`:

```bash
node -e "const {firestoreRules} = require('./backend/config/firebase-rules.js'); require('fs').writeFileSync('firebase-rules.firestore.rules', firestoreRules);"

node -e "const {storageRules} = require('./backend/config/firebase-rules.js'); require('fs').writeFileSync('firebase-rules.storage.rules', storageRules);"
```

3. Deploy the rules to Firebase:

```bash
firebase deploy --only firestore:rules,storage:rules
```

These rules ensure that AI tools can be read by anyone, but only written by authenticated admin users. 