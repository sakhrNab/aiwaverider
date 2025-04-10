# Firebase Setup Guide for AI Tools

This guide explains how to manage your Firebase database with AI tools data.

## Prerequisites

1. You must have a Firebase project set up with Firestore Database and Storage enabled.
2. You need to have Firebase authentication properly configured in your app.
3. Make sure your Firebase security rules allow write access for uploading images and creating documents.

## Setup Steps

### Using the Firebase Admin Panel

1. Access your Firebase console at [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Navigate to Firestore Database
3. Create a new collection called "ai_tools"
4. Add documents with the following structure:
   ```
   {
     title: "Tool Name",
     description: "Tool description",
     link: "https://tool-url.com",
     image: "https://url-to-image.com/image.png",
     keyword: "Category",
     tags: ["tag1", "tag2"],
     createdAt: Timestamp,
     updatedAt: Timestamp
   }
   ```

### Using the API

The application provides API endpoints to manage AI tools:

1. `GET /api/ai-tools` - Get all AI tools
2. `GET /api/ai-tools/:id` - Get a single AI tool by ID
3. `POST /api/ai-tools` - Create a new AI tool (admin only)
4. `PUT /api/ai-tools/:id` - Update an AI tool (admin only)
5. `DELETE /api/ai-tools/:id` - Delete an AI tool (admin only)

## Icon Management

You can upload icons directly to Firebase Storage:

1. Navigate to your Firebase console
2. Go to Storage section
3. Create a folder called "ai_tools" if it doesn't exist
4. Upload your icon files
5. Get the download URLs for each icon

## Troubleshooting

### Firebase Permission Errors

If you see "Missing or insufficient permissions" errors:

1. Check that your Firebase security rules allow read/write access to the necessary collections.
2. Make sure you're properly authenticated with admin permissions.
3. Verify that your Firebase configuration is correct in `.env` or similar config files.

### Image Upload Errors

If images fail to upload:

1. Check that Firebase Storage is properly enabled in your Firebase project.
2. Verify that your Firebase Storage rules allow uploads.
3. Make sure your Firebase Storage bucket exists and is correctly referenced.

## Firebase Rules

Here's a sample of Firebase rules that would allow the setup scripts to work:

```
// Firestore rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /ai_tools/{document=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}

// Storage rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /ai_tools/{allImages=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

Remember to customize these rules according to your security requirements.

## Next Steps

After successfully populating your database, verify that:

1. The AI tools appear correctly on your website
2. The icons are displayed properly
3. Any filtering or search functionality works as expected

If you encounter any issues, check the browser console for error messages and review your Firebase console logs. 