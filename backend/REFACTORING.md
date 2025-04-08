# Backend Refactoring Guide

This document outlines the incremental refactoring approach for the backend codebase. The goal is to improve code organization, maintainability, and testability without breaking existing functionality.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Refactoring Approach](#refactoring-approach)
3. [Directory Structure](#directory-structure)
4. [Implementation Details](#implementation-details)
5. [Testing](#testing)
6. [Migration Guide](#migration-guide)

## Architecture Overview

The refactored architecture follows a layered approach with clear separation of concerns:

```
Client Request → Routes → Controllers → Services → Repositories → Database
                                           ↓
                                        External APIs
```

### Layers

- **Routes**: Define API endpoints and handle request routing
- **Controllers**: Handle HTTP requests/responses and input validation
- **Services**: Implement business logic and orchestrate operations
- **Repositories**: Abstract database operations
- **Utilities**: Provide common functionality across the application

## Refactoring Approach

The refactoring is performed incrementally using a side-by-side approach to minimize risk:

1. **Create new structures** alongside existing code
2. **Test new components** thoroughly
3. **Gradually migrate** endpoints to use the new code
4. **Remove old code** once new code is proven stable

This approach allows for incremental testing and reduces the risk of breaking changes.

## Directory Structure

```
backend/
├── controllers/           # HTTP request handlers
│   ├── orderController.js
│   └── orderController.refactored.js
├── services/              # Business logic layer
│   ├── order/
│   │   └── orderService.js
│   ├── user/
│   │   └── userService.js
│   └── agent/
│       └── agentService.js
├── repositories/          # Data access layer
│   ├── orderRepository.js
│   ├── userRepository.js
│   └── agentRepository.js
├── routes/                # API routes
│   ├── orders.js
│   └── orders.refactored.js
├── middleware/            # Express middleware
│   ├── auth.js
│   └── errorHandler.js
├── utils/                 # Utility functions
│   ├── logger.js
│   ├── mailer.js
│   └── asyncHandler.js
├── test/                  # Tests
│   ├── controllers/
│   ├── services/
│   └── repositories/
└── config/                # Configuration
```

## Implementation Details

### Repository Layer

The repository layer abstracts database operations and provides a clean interface for data access:

```javascript
// Example repository method
async getUserOrders(userId) {
  try {
    const ordersSnapshot = await db.collection('orders')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    logger.error(`Repository error getting user orders: ${error.message}`);
    throw error;
  }
}
```

### Service Layer

The service layer contains business logic and orchestrates operations:

```javascript
// Example service method
async processPaymentSuccess(paymentData) {
  try {
    // Extract data from payment
    const metadata = paymentData.metadata || {};
    const items = Array.isArray(paymentData.items) ? paymentData.items : [];
    
    // Create order record
    const order = await this.createOrder({
      orderId: metadata.order_id || uuidv4(),
      userId: paymentData.customer?.id,
      // ...other order data
    });
    
    // Handle template delivery
    const deliveryResults = await this.deliverTemplates(order, items);
    
    // Update order status
    await orderRepository.updateOrder(order.id, {
      deliveryStatus: calculateDeliveryStatus(deliveryResults),
      deliveryResults
    });
    
    return { success: true, orderId: order.id, deliveryStatus };
  } catch (error) {
    logger.error(`Error processing payment: ${error.message}`);
    throw error;
  }
}
```

### Controller Layer

The controller layer handles HTTP requests and responses:

```javascript
// Example controller method
const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const orders = await orderService.getUserOrders(userId);
    
    return res.json({ success: true, orders });
  } catch (error) {
    logger.error(`Controller error getting user orders: ${error.message}`);
    
    return res.status(500).json({ error: error.message });
  }
};
```

### Error Handling

Centralized error handling is implemented using middleware:

```javascript
// Error handler middleware
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    code: err.errorCode,
    // ...other error details
  });
};

// Custom error class
class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    // ...
  }
}
```

### Route Handler

Route handlers use the async handler utility for cleaner code:

```javascript
router.get(
  '/user/:userId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    // Authorization checks
    if (req.user.id !== userId && !req.user.isAdmin) {
      throw new AppError('Not authorized', 403, 'NOT_AUTHORIZED');
    }
    
    return await orderController.getUserOrders(req, res);
  })
);
```

## Testing

The refactored code includes unit tests for each layer:

- **Service Tests**: Test business logic with mocked repositories
- **Repository Tests**: Test data access with a test database
- **Controller Tests**: Test HTTP handling with mocked services
- **Integration Tests**: Test the full request flow

Example service test:

```javascript
describe('OrderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processPaymentSuccess', () => {
    it('should process payment and deliver templates', async () => {
      // Arrange
      const paymentData = { /* ... */ };
      orderRepository.createOrder.mockResolvedValue({ id: 'order-1' });
      
      // Act
      const result = await OrderService.processPaymentSuccess(paymentData);
      
      // Assert
      expect(result.success).toBe(true);
      expect(orderRepository.createOrder).toHaveBeenCalled();
    });
  });
});
```

## Migration Guide

Follow these steps to migrate existing routes to the new architecture:

1. Create repositories for the relevant data models
2. Implement service layer for the business logic
3. Create refactored controller using the service layer
4. Create new route file using the refactored controller
5. Add the new route to the router in `routes/index.js` (commented out initially)
6. Test the new implementation thoroughly
7. Switch to the new implementation by uncommenting in `routes/index.js`
8. Monitor for errors and revert if necessary
9. Remove old code once stability is confirmed

### Example migration step:

```javascript
// In routes/index.js

// Old route
router.use('/orders', require('./orders'));

// New route (initially commented)
// router.use('/orders', require('./orders.refactored'));

// After testing, switch to new implementation
// router.use('/orders', require('./orders.refactored'));
// Remove old route
```

By following this incremental approach, we can safely refactor the codebase without disrupting existing functionality. 