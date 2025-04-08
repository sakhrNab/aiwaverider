/**
 * Order Service Tests
 */

// Import dependencies
jest.mock('../../../repositories/orderRepository', () => ({
  createOrder: jest.fn(),
  getOrderById: jest.fn(),
  updateOrder: jest.fn(),
  getUserOrders: jest.fn()
}));

jest.mock('../../../repositories/agentRepository', () => ({
  getAgentById: jest.fn()
}));

jest.mock('../../../repositories/userRepository', () => ({
  getUserById: jest.fn()
}));

// Mock mailer
jest.mock('../../../utils/mailer', () => ({
  sendAgentPurchaseEmail: jest.fn()
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid')
}));

// Import dependencies after mocks
const orderRepository = require('../../../repositories/orderRepository');
const agentRepository = require('../../../repositories/agentRepository');
const userRepository = require('../../../repositories/userRepository');
const mailer = require('../../../utils/mailer');
const OrderService = require('../../../services/order/orderService');

describe('OrderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAgentTemplate', () => {
    it('should return template content if agent exists', async () => {
      // Arrange
      const agent = {
        id: 'agent-1',
        title: 'Test Agent',
        description: 'A test agent',
        template: 'Test template content'
      };
      
      agentRepository.getAgentById.mockResolvedValue(agent);
      
      // Act
      const result = await OrderService.getAgentTemplate('agent-1');
      
      // Assert
      expect(result).toBe('Test template content');
      expect(agentRepository.getAgentById).toHaveBeenCalledWith('agent-1');
    });
    
    it('should generate basic template if agent has no template', async () => {
      // Arrange
      const agent = {
        id: 'agent-1',
        title: 'Test Agent',
        description: 'A test agent',
        category: 'Productivity'
      };
      
      agentRepository.getAgentById.mockResolvedValue(agent);
      
      // Act
      const result = await OrderService.getAgentTemplate('agent-1');
      
      // Assert
      expect(result).toContain('# Test Agent - AI Agent Template');
      expect(result).toContain('A test agent');
      expect(result).toContain('Productivity');
      expect(agentRepository.getAgentById).toHaveBeenCalledWith('agent-1');
    });
    
    it('should throw error if agent does not exist', async () => {
      // Arrange
      agentRepository.getAgentById.mockResolvedValue(null);
      
      // Act & Assert
      await expect(OrderService.getAgentTemplate('non-existent')).rejects.toThrow('Agent not found');
      expect(agentRepository.getAgentById).toHaveBeenCalledWith('non-existent');
    });
  });
  
  describe('createOrder', () => {
    it('should create order with provided data', async () => {
      // Arrange
      const orderData = {
        orderId: 'order-1',
        userId: 'user-1',
        items: [{ id: 'agent-1' }]
      };
      
      const createdOrder = {
        id: 'order-1',
        userId: 'user-1',
        items: [{ id: 'agent-1' }],
        status: 'pending'
      };
      
      orderRepository.createOrder.mockResolvedValue(createdOrder);
      
      // Act
      const result = await OrderService.createOrder(orderData);
      
      // Assert
      expect(result).toEqual(createdOrder);
      expect(orderRepository.createOrder).toHaveBeenCalledWith(expect.objectContaining({
        id: 'order-1',
        userId: 'user-1',
        items: [{ id: 'agent-1' }]
      }));
    });
    
    it('should generate order ID if not provided', async () => {
      // Arrange
      const orderData = {
        userId: 'user-1',
        items: [{ id: 'agent-1' }]
      };
      
      const createdOrder = {
        id: 'test-uuid',
        userId: 'user-1',
        items: [{ id: 'agent-1' }],
        status: 'pending'
      };
      
      orderRepository.createOrder.mockResolvedValue(createdOrder);
      
      // Act
      const result = await OrderService.createOrder(orderData);
      
      // Assert
      expect(result).toEqual(createdOrder);
      expect(orderRepository.createOrder).toHaveBeenCalledWith(expect.objectContaining({
        id: 'test-uuid'
      }));
    });
  });
  
  describe('processPaymentSuccess', () => {
    it('should process payment and deliver templates', async () => {
      // Arrange
      const paymentData = {
        id: 'payment-1',
        amount: 2000, // $20.00
        currency: 'usd',
        payment_method_types: ['card'],
        customer: {
          id: 'user-1',
          email: 'test@example.com'
        },
        items: [
          { id: 'agent-1' }
        ],
        metadata: {
          order_id: 'order-1'
        }
      };
      
      const order = {
        id: 'order-1',
        userId: 'user-1',
        userEmail: 'test@example.com',
        items: [{ id: 'agent-1' }],
        total: 20,
        status: 'completed'
      };
      
      const agent = {
        id: 'agent-1',
        title: 'Test Agent',
        description: 'A test agent',
        template: 'Test template content'
      };
      
      const user = {
        id: 'user-1',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com'
      };
      
      orderRepository.createOrder.mockResolvedValue(order);
      agentRepository.getAgentById.mockResolvedValue(agent);
      userRepository.getUserById.mockResolvedValue(user);
      mailer.sendAgentPurchaseEmail.mockResolvedValue({ messageId: 'email-1', success: true });
      
      // Act
      const result = await OrderService.processPaymentSuccess(paymentData);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order-1');
      expect(result.deliveryStatus).toBe('completed');
      expect(orderRepository.createOrder).toHaveBeenCalled();
      expect(agentRepository.getAgentById).toHaveBeenCalledWith('agent-1');
      expect(userRepository.getUserById).toHaveBeenCalledWith('user-1');
      expect(mailer.sendAgentPurchaseEmail).toHaveBeenCalled();
      expect(orderRepository.updateOrder).toHaveBeenCalledWith('order-1', expect.objectContaining({
        deliveryStatus: 'completed'
      }));
    });
    
    it('should skip template delivery if no email provided', async () => {
      // Arrange
      const paymentData = {
        id: 'payment-1',
        amount: 2000,
        currency: 'usd',
        payment_method_types: ['card'],
        customer: {
          id: 'user-1'
          // No email
        },
        items: [
          { id: 'agent-1' }
        ],
        metadata: {
          order_id: 'order-1'
        }
      };
      
      const order = {
        id: 'order-1',
        userId: 'user-1',
        items: [{ id: 'agent-1' }],
        total: 20,
        status: 'completed'
      };
      
      orderRepository.createOrder.mockResolvedValue(order);
      
      // Act
      const result = await OrderService.processPaymentSuccess(paymentData);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order-1');
      expect(result.deliveryStatus).toBe('skipped');
      expect(result.message).toContain('no email');
      expect(orderRepository.createOrder).toHaveBeenCalled();
      expect(agentRepository.getAgentById).not.toHaveBeenCalled();
      expect(mailer.sendAgentPurchaseEmail).not.toHaveBeenCalled();
    });
    
    it('should handle partial delivery if some agents not found', async () => {
      // Arrange
      const paymentData = {
        id: 'payment-1',
        amount: 3000,
        currency: 'usd',
        payment_method_types: ['card'],
        customer: {
          id: 'user-1',
          email: 'test@example.com'
        },
        items: [
          { id: 'agent-1' },
          { id: 'non-existent' }
        ],
        metadata: {
          order_id: 'order-1'
        }
      };
      
      const order = {
        id: 'order-1',
        userId: 'user-1',
        userEmail: 'test@example.com',
        items: [{ id: 'agent-1' }, { id: 'non-existent' }],
        total: 30,
        status: 'completed'
      };
      
      const agent = {
        id: 'agent-1',
        title: 'Test Agent',
        description: 'A test agent',
        template: 'Test template content'
      };
      
      const user = {
        id: 'user-1',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com'
      };
      
      orderRepository.createOrder.mockResolvedValue(order);
      agentRepository.getAgentById.mockImplementation(async (id) => {
        if (id === 'agent-1') return agent;
        return null;
      });
      userRepository.getUserById.mockResolvedValue(user);
      mailer.sendAgentPurchaseEmail.mockResolvedValue({ messageId: 'email-1', success: true });
      
      // Act
      const result = await OrderService.processPaymentSuccess(paymentData);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order-1');
      expect(result.deliveryStatus).toBe('partial');
      expect(result.deliveryResults).toHaveLength(2);
      expect(result.deliveryResults[0].success).toBe(true);
      expect(result.deliveryResults[1].success).toBe(false);
      expect(orderRepository.updateOrder).toHaveBeenCalledWith('order-1', expect.objectContaining({
        deliveryStatus: 'partial'
      }));
    });
  });
  
  describe('getOrderById', () => {
    it('should return order if it exists', async () => {
      // Arrange
      const order = {
        id: 'order-1',
        userId: 'user-1',
        items: [{ id: 'agent-1' }]
      };
      
      orderRepository.getOrderById.mockResolvedValue(order);
      
      // Act
      const result = await OrderService.getOrderById('order-1');
      
      // Assert
      expect(result).toEqual(order);
      expect(orderRepository.getOrderById).toHaveBeenCalledWith('order-1');
    });
    
    it('should throw error if order does not exist', async () => {
      // Arrange
      orderRepository.getOrderById.mockResolvedValue(null);
      
      // Act & Assert
      await expect(OrderService.getOrderById('non-existent')).rejects.toThrow('Order not found');
      expect(orderRepository.getOrderById).toHaveBeenCalledWith('non-existent');
    });
  });
  
  describe('getUserOrders', () => {
    it('should return user orders', async () => {
      // Arrange
      const orders = [
        {
          id: 'order-1',
          userId: 'user-1',
          items: [{ id: 'agent-1' }]
        },
        {
          id: 'order-2',
          userId: 'user-1',
          items: [{ id: 'agent-2' }]
        }
      ];
      
      orderRepository.getUserOrders.mockResolvedValue(orders);
      
      // Act
      const result = await OrderService.getUserOrders('user-1');
      
      // Assert
      expect(result).toEqual(orders);
      expect(orderRepository.getUserOrders).toHaveBeenCalledWith('user-1');
    });
  });
}); 