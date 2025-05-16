# Image Storage Migration: GitHub to Firebase Storage

## Summary of Changes

We've migrated the image upload functionality from GitHub to Firebase Storage to fix authentication issues and streamline our storage solution.

### Key Changes

1. Created a new utility module `backend/utils/storage.js` for Firebase Storage operations
2. Updated `postsController.js` to use the new Firebase Storage functions instead of GitHub
3. Changed the database schema from `imageSha` to `imageFilename` for tracking uploaded files
4. Updated corresponding test files to mock the new Firebase Storage functions

### Implementation Details

- Images are now stored in Firebase Storage under the following paths:
  - Post images: `posts/{hash}-{filename}`
  - Avatar images: `avatars/{hash}-{filename}`
- Images are deduped by using a content hash in the filename
- Public URLs are generated for all uploaded images

### File Changes

1. Added: `backend/utils/storage.js` - New Firebase Storage utilities
2. Modified: `backend/controllers/posts/postsController.js` - Updated to use Firebase Storage
3. Modified: `backend/test/mockFirebase.js` - Updated to use new field names
4. Modified: `backend/test/postsController.spec.js` - Updated mocks for storage

## For Developers

- No changes to API contracts or responses
- Image URLs remain in the same format in responses
- The `imageFilename` field replaces `imageSha` in the database for tracking uploads 