/**
 * Order Repository Tests
 */

// Mock Firebase admin
jest.mock('firebase-admin', () => {
  const firestoreMock = {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    set: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    get: jest.fn().mockResolvedValue({
      exists: true,
      id: 'test-doc-id',
      data: () => ({ 
        userId: 'user-1',
        items: [{ id: 'agent-1' }],
        status: 'pending'
      })
    }),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis()
  };
  
  return {
    firestore: jest.fn(() => firestoreMock),
    app: jest.fn().mockReturnThis(),
    apps: [],
    initializeApp: jest.fn(),
    credential: {
      cert: jest.fn()
    }
  };
});

// Mock logger
jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
}));

// Import repository after mocks
const admin = require('firebase-admin');
const OrderRepository = require('../../repositories/orderRepository');

describe('OrderRepository', () => {
  let firestoreMock;
  
  beforeEach(() => {
    jest.clearAllMocks();
    firestoreMock = admin.firestore();
  });
  
  describe('createOrder', () => {
    it('should create an order document', async () => {
      // Arrange
      const orderData = {
        id: 'order-1',
        userId: 'user-1',
        items: [{ id: 'agent-1' }],
        status: 'pending'
      };
      
      // Act
      const result = await OrderRepository.createOrder(orderData);
      
      // Assert
      expect(result).toEqual(orderData);
      expect(firestoreMock.collection).toHaveBeenCalledWith('orders');
      expect(firestoreMock.doc).toHaveBeenCalledWith('order-1');
      expect(firestoreMock.set).toHaveBeenCalledWith(orderData);
    });
    
    it('should handle errors when creating order', async () => {
      // Arrange
      const orderData = {
        id: 'order-1'
      };
      
      const error = new Error('Test error');
      firestoreMock.set.mockRejectedValueOnce(error);
      
      // Act & Assert
      await expect(OrderRepository.createOrder(orderData)).rejects.toThrow('Test error');
    });
  });
  
  describe('getOrderById', () => {
    it('should get an order by ID', async () => {
      // Arrange
      const mockOrderDoc = {
        exists: true,
        id: 'order-1',
        data: () => ({
          userId: 'user-1',
          items: [{ id: 'agent-1' }],
          status: 'completed'
        })
      };
      
      firestoreMock.get.mockResolvedValueOnce(mockOrderDoc);
      
      // Act
      const result = await OrderRepository.getOrderById('order-1');
      
      // Assert
      expect(result).toEqual({
        id: 'order-1',
        userId: 'user-1',
        items: [{ id: 'agent-1' }],
        status: 'completed'
      });
      expect(firestoreMock.collection).toHaveBeenCalledWith('orders');
      expect(firestoreMock.doc).toHaveBeenCalledWith('order-1');
    });
    
    it('should return null if order does not exist', async () => {
      // Arrange
      const mockOrderDoc = {
        exists: false
      };
      
      firestoreMock.get.mockResolvedValueOnce(mockOrderDoc);
      
      // Act
      const result = await OrderRepository.getOrderById('non-existent');
      
      // Assert
      expect(result).toBeNull();
    });
    
    it('should handle errors when getting order', async () => {
      // Arrange
      const error = new Error('Test error');
      firestoreMock.get.mockRejectedValueOnce(error);
      
      // Act & Assert
      await expect(OrderRepository.getOrderById('order-1')).rejects.toThrow('Test error');
    });
  });
  
  describe('updateOrder', () => {
    it('should update an order document', async () => {
      // Arrange
      const updateData = {
        status: 'completed',
        deliveryStatus: 'completed'
      };
      
      // Act
      await OrderRepository.updateOrder('order-1', updateData);
      
      // Assert
      expect(firestoreMock.collection).toHaveBeenCalledWith('orders');
      expect(firestoreMock.doc).toHaveBeenCalledWith('order-1');
      expect(firestoreMock.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'completed',
        deliveryStatus: 'completed',
        updatedAt: expect.any(String)
      }));
    });
    
    it('should handle errors when updating order', async () => {
      // Arrange
      const error = new Error('Test error');
      firestoreMock.update.mockRejectedValueOnce(error);
      
      // Act & Assert
      await expect(OrderRepository.updateOrder('order-1', {})).rejects.toThrow('Test error');
    });
  });
  
  describe('getUserOrders', () => {
    it('should get all orders for a user', async () => {
      // Arrange
      const mockOrdersSnapshot = {
        docs: [
          {
            id: 'order-1',
            data: () => ({
              userId: 'user-1',
              items: [{ id: 'agent-1' }],
              status: 'completed'
            })
          },
          {
            id: 'order-2',
            data: () => ({
              userId: 'user-1',
              items: [{ id: 'agent-2' }],
              status: 'pending'
            })
          }
        ]
      };
      
      firestoreMock.get.mockResolvedValueOnce(mockOrdersSnapshot);
      
      // Act
      const result = await OrderRepository.getUserOrders('user-1');
      
      // Assert
      expect(result).toEqual([
        {
          id: 'order-1',
          userId: 'user-1',
          items: [{ id: 'agent-1' }],
          status: 'completed'
        },
        {
          id: 'order-2',
          userId: 'user-1',
          items: [{ id: 'agent-2' }],
          status: 'pending'
        }
      ]);
      expect(firestoreMock.collection).toHaveBeenCalledWith('orders');
      expect(firestoreMock.where).toHaveBeenCalledWith('userId', '==', 'user-1');
      expect(firestoreMock.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });
    
    it('should handle errors when getting user orders', async () => {
      // Arrange
      const error = new Error('Test error');
      firestoreMock.get.mockRejectedValueOnce(error);
      
      // Act & Assert
      await expect(OrderRepository.getUserOrders('user-1')).rejects.toThrow('Test error');
    });
  });
  
  describe('deleteOrder', () => {
    it('should delete an order document', async () => {
      // Arrange
      firestoreMock.delete = jest.fn().mockResolvedValue({});
      
      // Act
      await OrderRepository.deleteOrder('order-1');
      
      // Assert
      expect(firestoreMock.collection).toHaveBeenCalledWith('orders');
      expect(firestoreMock.doc).toHaveBeenCalledWith('order-1');
      expect(firestoreMock.delete).toHaveBeenCalled();
    });
    
    it('should handle errors when deleting order', async () => {
      // Arrange
      firestoreMock.delete = jest.fn().mockRejectedValue(new Error('Test error'));
      
      // Act & Assert
      await expect(OrderRepository.deleteOrder('order-1')).rejects.toThrow('Test error');
    });
  });
}); 