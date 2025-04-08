# AI Wave Rider Documentation

This directory contains documentation for the AI Wave Rider platform.

## API Documentation

- **[API Guide](api-guide.md)**: Comprehensive guide to all API endpoints organized by resource type.
- **Swagger UI**: When running the server, interactive API documentation is available at `/api/docs`.
- **OpenAPI Specification**: Raw API specification is available at `/api/api-docs` when the server is running.

## How to Use the Documentation

1. **For a quick overview**: Refer to the [API Guide](api-guide.md) to understand available endpoints and their purpose.
2. **For detailed examples**: Use the Swagger UI (`/api/docs`) when the server is running to see request/response examples, try endpoints, and view schema definitions.
3. **For integrating with tools**: Use the OpenAPI specification at `/api/api-docs` which can be imported into Postman, Insomnia, or other API tools.

## Authentication

Most API endpoints require authentication with a JWT token. You can obtain a token by:

1. Creating an account using `/api/auth/signup`
2. Logging in with `/api/auth/login`
3. Using the token in the `Authorization` header as `Bearer <token>`

## Common HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input or validation error |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Server Error - Something went wrong on the server |

## Local Development

To run the server locally and access the API documentation:

1. Start the server: `npm run dev`
2. Access Swagger UI: http://localhost:4000/api/docs
3. Access the API: http://localhost:4000/api/... 