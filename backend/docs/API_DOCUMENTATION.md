# AI Wave Rider API Documentation

This document provides an overview of the API documentation resources available for the AI Wave Rider platform.

## Documentation Resources

### 1. Swagger UI (Interactive Documentation)

The AI Wave Rider API comes with interactive Swagger documentation that allows you to explore and test the API endpoints directly from your browser.

**Access the Swagger UI:**
- When running the development server, navigate to `/api/docs` in your browser
- Example: `http://localhost:5000/api/docs`

**Features:**
- Interactive endpoint testing
- Request/response examples
- Schema definitions
- Authentication integration

### 2. API Guide (Markdown)

A comprehensive API guide is available in Markdown format at [`docs/api-guide.md`](../api-guide.md). This guide provides:

- Detailed endpoint descriptions
- Request/response examples
- Authentication information
- Error handling conventions

### 3. Postman Collection

For developers who prefer using Postman, we provide a complete Postman collection:

- File: [`docs/ai-wave-rider-api.postman_collection.json`](../ai-wave-rider-api.postman_collection.json)
- Import this file into Postman to get started quickly with API testing

## API Versioning

The API currently uses version 1.0.0. The version is specified in the Swagger configuration and is included in the API responses.

## Authentication

Most API endpoints require authentication using JWT (JSON Web Tokens):

1. Obtain a token by calling the `/api/auth/login` or `/api/auth/signup` endpoint
2. Include the token in the Authorization header of subsequent requests:
   ```
   Authorization: Bearer your_token_here
   ```

## Error Handling

All API endpoints follow a standardized error response format:

```json
{
  "error": "Error message describing what went wrong",
  "status": 400
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request (validation error)
- 401: Unauthorized (authentication required)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 500: Server Error

## Rate Limiting

The API implements rate limiting to prevent abuse:
- Authentication routes: 5 requests per minute
- General routes: 100 requests per minute

## Development

### Adding Documentation to New Endpoints

When adding new endpoints, use JSDoc annotations to automatically update the Swagger documentation:

```javascript
/**
 * Get all items
 * @route GET /api/items
 * @group Items - Item management operations
 * @param {string} [category.query] - Filter by category
 * @returns {Array<Item>} 200 - List of items
 * @returns {ErrorResponse} 500 - Server error
 */
router.get('/', asyncHandler(itemController.getItems));
```

### Updating the API Guide

When adding or modifying endpoints, make sure to update the [`docs/api-guide.md`](../api-guide.md) file with the new information.

### Testing Documentation

Ensure that your documentation is accurate by:
1. Checking the Swagger UI at `/api/docs`
2. Running the Postman collection to verify endpoints work as documented
3. Updating the API guide with any changes

## Support

For issues with the API or documentation, please contact the development team or create an issue in the project repository. 