# AI Wave Rider API Guide

This document provides an overview of the AI Wave Rider platform API. For interactive documentation with request/response examples, visit the Swagger UI at `/api/docs` when running the server.

## Table of Contents

1. [Authentication](#authentication)
2. [Users & Profiles](#users--profiles)
3. [Agents](#agents)
4. [Orders](#orders)
5. [Wishlists](#wishlists)
6. [Posts & Comments](#posts--comments)
7. [Prices](#prices)
8. [Error Handling](#error-handling)

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Most endpoints require a valid token to be included in the Authorization header.

### Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/signup` | Register a new user | Public |
| POST | `/api/auth/login` | Authenticate a user and get tokens | Public |
| POST | `/api/auth/session` | Create session with Firebase token | Public |
| POST | `/api/auth/logout` | Logout a user | Private |
| POST | `/api/auth/signout` | Sign out a user (alias for logout) | Public |
| POST | `/api/auth/refresh` | Refresh access token | Public |
| POST | `/api/auth/verify-user` | Verify a user token | Public |
| GET | `/api/auth/me` | Get current user data | Private |
| POST | `/api/auth/password/reset-request` | Request password reset | Public |
| POST | `/api/auth/password/reset` | Reset password with token | Public |
| GET | `/api/auth/google/signin` | Google OAuth signin | Public |
| GET | `/api/auth/google/signup` | Google OAuth signup | Public |
| GET | `/api/auth/google/callback` | Google OAuth callback | Public |

### Authentication Examples

**Sign up a new user**
```http
POST /api/auth/signup
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Get current user**
```http
GET /api/auth/me
Authorization: Bearer <jwt_token>
```

## Users & Profiles

User profiles contain information about registered users including their bio, interests, and notification preferences.

### Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/profile/me` | Get logged-in user's profile | Private |
| GET | `/api/profile/:userId` | Get user profile by ID | Private |
| PATCH | `/api/profile/update` | Update user profile | Private |
| PATCH | `/api/profile/avatar` | Upload and update user avatar | Private |
| PATCH | `/api/profile/interests` | Update user interests | Private |
| PATCH | `/api/profile/notifications` | Update user notification settings | Private |

### Profile Examples

**Update a profile**
```http
PATCH /api/profile/update
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "bio": "AI enthusiast and developer"
}
```

**Update notification settings**
```http
PATCH /api/profile/notifications
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "emailNotifications": true,
  "pushNotifications": false
}
```

## Agents

Agents represent AI assistants or tools that users can browse, purchase, and interact with.

### Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/agents` | Get all agents with pagination and filtering | Public |
| GET | `/api/agents/featured` | Get featured agents | Public |
| GET | `/api/agents/categories` | Get agents grouped by categories | Public |
| GET | `/api/agents/top-rated` | Get top rated agents | Public |
| GET | `/api/agents/newest` | Get newest agents | Public |
| GET | `/api/agents/creator/:creatorId` | Get agents by creator | Public |
| GET | `/api/agents/:agentId` | Get agent by ID | Public |
| GET | `/api/agents/:agentId/similar` | Get similar agents | Public |
| GET | `/api/agents/doc/:docId` | Get agent by document ID | Public |
| GET | `/api/agents/agent-:numericId` | Get agent by numeric ID | Public |
| GET | `/api/agents/:agentId/downloads` | Get download count for an agent | Public |
| POST | `/api/agents/:agentId/downloads` | Increment download count | Private |
| GET | `/api/agents/wishlists` | Get user's wishlists | Private |
| POST | `/api/agents/wishlists/:agentId` | Toggle agent in wishlist | Private |
| GET | `/api/agents/wishlists/:wishlistId` | Get wishlist by ID | Private |
| POST | `/api/agents` | Create a new agent | Admin |
| PATCH | `/api/agents/:agentId` | Update an agent | Admin |
| DELETE | `/api/agents/:agentId` | Delete an agent | Admin |

### Agent Examples

**Get agents with filtering**
```http
GET /api/agents?category=productivity&limit=10&page=1
```

**Create an agent (admin only)**
```http
POST /api/agents
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Productivity Assistant",
  "description": "Helps you organize your tasks and manage your time effectively",
  "category": "productivity",
  "tags": ["organization", "time-management", "tasks"]
}
```

## Orders

Orders represent purchases of agents by users.

### Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/orders/:orderId` | Get order by ID | Private |
| GET | `/api/orders/user/:userId` | Get all orders for a user | Private |
| POST | `/api/orders` | Create a new order | Private |
| POST | `/api/orders/payment-success` | Process successful payment | Public |
| GET | `/api/orders/template/:agentId` | Get agent template content | Private |

### Order Examples

**Create a new order**
```http
POST /api/orders
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "agentId": "agent-123",
  "amount": 29.99,
  "currency": "USD"
}
```

**Get user orders**
```http
GET /api/orders/user/user-456
Authorization: Bearer <jwt_token>
```

## Wishlists

Wishlists allow users to save agents they're interested in.

### Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/wishlists/public` | Get all public wishlists | Public |
| GET | `/api/wishlists/my` | Get all wishlists for the logged-in user | Private |
| GET | `/api/wishlists/:wishlistId` | Get a wishlist by ID | Mixed |
| POST | `/api/wishlists` | Create a new wishlist | Private |
| PUT | `/api/wishlists/:wishlistId` | Update a wishlist | Private |
| DELETE | `/api/wishlists/:wishlistId` | Delete a wishlist | Private |
| POST | `/api/wishlists/:wishlistId/agents/:agentId` | Add an agent to a wishlist | Private |
| DELETE | `/api/wishlists/:wishlistId/agents/:agentId` | Remove an agent from a wishlist | Private |
| PUT | `/api/wishlists/:wishlistId/agents/:agentId/toggle` | Toggle an agent in a wishlist | Private |
| GET | `/api/wishlists/agents/:agentId/check` | Check if an agent is in any of the user's wishlists | Private |

### Wishlist Examples

**Create a wishlist**
```http
POST /api/wishlists
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "My Favorite Agents",
  "description": "Agents I plan to purchase later",
  "isPublic": true
}
```

**Add an agent to a wishlist**
```http
POST /api/wishlists/wishlist-123/agents/agent-456
Authorization: Bearer <jwt_token>
```

## Posts & Comments

The platform includes a community feature with posts and comments.

### Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/posts` | Get all posts with optional category filtering | Public |
| GET | `/api/posts/multi-category` | Get posts from multiple categories | Public |
| GET | `/api/posts/:postId` | Get a post by ID | Public |
| GET | `/api/posts/:postId/comments` | Get comments for a specific post | Public |
| POST | `/api/posts` | Create a new post | Private |
| PUT | `/api/posts/:postId` | Update a post | Private |
| DELETE | `/api/posts/:postId` | Delete a post | Private |
| POST | `/api/posts/:postId/like` | Toggle like status on a post | Private |
| POST | `/api/posts/:postId/comments` | Add a comment to a post | Private |
| PUT | `/api/posts/comments/:commentId` | Update a comment | Private |
| DELETE | `/api/posts/comments/:commentId` | Delete a comment | Private |
| POST | `/api/posts/comments/:commentId/like` | Like a comment | Private |
| DELETE | `/api/posts/comments/:commentId/like` | Unlike a comment | Private |

### Post Examples

**Create a post**
```http
POST /api/posts
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

{
  "title": "My experience with productivity agents",
  "content": "Here's a review of the top productivity agents I've used...",
  "category": "reviews"
}
```

**Get posts by category**
```http
GET /api/posts?category=reviews&limit=10
```

## Prices

Pricing information for agents.

### Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/prices/agent/:agentId` | Get price by agent ID | Public |
| POST | `/api/prices/agents` | Get prices for multiple agents | Public |
| GET | `/api/prices` | Get all prices with pagination | Public |
| GET | `/api/prices/currency/:currency` | Get prices by currency | Public |
| GET | `/api/prices/range` | Get prices within a range | Public |
| GET | `/api/prices/sale` | Get agents on sale | Public |
| PUT | `/api/prices/agent/:agentId` | Create or update price for an agent | Admin |
| DELETE | `/api/prices/agent/:agentId` | Delete price for an agent | Admin |

### Price Examples

**Get price for an agent**
```http
GET /api/prices/agent/agent-123
```

**Get prices in a range**
```http
GET /api/prices/range?min=10&max=50&currency=USD
```

**Update a price (admin only)**
```http
PUT /api/prices/agent/agent-123
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "amount": 39.99,
  "currency": "USD",
  "onSale": true,
  "saleAmount": 29.99,
  "saleEndDate": "2023-12-31T23:59:59Z"
}
```

## Error Handling

All API endpoints follow a standardized error handling approach:

### Error Response Format

```json
{
  "error": "Error message describing what went wrong",
  "status": 400
}
```

### Common HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input or validation error |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Server Error - Something went wrong on the server |

### Error Response Examples

**Resource Not Found**
```json
{
  "error": "Agent not found",
  "status": 404
}
```

**Authentication Required**
```json
{
  "error": "Authentication required to access this resource",
  "status": 401
}
```

**Validation Error**
```json
{
  "error": "Username is required",
  "status": 400
}
``` 