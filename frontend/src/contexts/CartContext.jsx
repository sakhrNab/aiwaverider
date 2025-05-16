import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';

// Define a consistent key for localStorage
const CART_STORAGE_KEY = 'aiwaverider_cart';

// Add debounce for localStorage operations
const debounce = (fn, ms) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
};

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [initialized, setInitialized] = useState(false);
  // Add a ref to track if the component is mounted
  const isMounted = useRef(false);
  // Add a ref to track cart storage operations
  const storageInProgress = useRef(false);

  // Load cart from localStorage on mount - only runs once
  useEffect(() => {
    isMounted.current = true;
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Loading cart from localStorage:', 
          savedCart ? `${savedCart.length} characters` : 'empty');
      }
      
      if (savedCart && savedCart !== 'undefined' && savedCart !== 'null') {
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart) && parsedCart.length > 0) {
          if (process.env.NODE_ENV === 'development') {
            console.log('Restoring cart with items:', parsedCart.length);
          }
          setCart(parsedCart);
        }
      }
    } catch (error) {
      console.error('Failed to load cart from localStorage:', error);
    } finally {
      // Mark as initialized after loading completes
      setInitialized(true);
    }

    return () => {
      isMounted.current = false;
    };
  }, []);

  // Create a debounced save function to avoid frequent writes
  const debouncedSaveCart = useCallback(
    debounce((cartData) => {
      if (storageInProgress.current) return;
      storageInProgress.current = true;
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('Saving cart to localStorage, items:', cartData.length);
        }
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartData));
      } catch (error) {
        console.error('Failed to save cart to localStorage:', error);
      } finally {
        storageInProgress.current = false;
      }
    }, 500), // 500ms debounce
    []
  );

  // Replace the localStorage effect with the debounced version
  useEffect(() => {
    if (initialized && cart) {
      debouncedSaveCart(cart);
    }
  }, [cart, initialized, debouncedSaveCart]);
  
  // Calculate cart totals using memoization instead of effects to avoid setState during render
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);
  
  // Calculate VAT using the memoized cart total
  const vat = useMemo(() => {
    return cartTotal * 0.19; // 19% VAT for Germany
  }, [cartTotal]);
  
  // Calculate total with VAT
  const totalWithVat = useMemo(() => {
    return cartTotal + vat;
  }, [cartTotal, vat]);

  // Add memoized functions to prevent unnecessary re-renders
  const addToCart = useCallback((product) => {
    let toastMessage = '';
    
    setCart(prevCart => {
      // Check if the product is already in the cart
      const existingItemIndex = prevCart.findIndex(item => item.id === product.id);
      
      if (existingItemIndex >= 0) {
        // If product exists, increase quantity
        const newCart = [...prevCart];
        newCart[existingItemIndex].quantity += 1;
        
        toastMessage = `${product.title} quantity increased!`;
        
        return newCart;
      } else {
        // Otherwise, add new item with quantity 1
        toastMessage = `${product.title} added to cart!`;
        
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
    
    // Show toast notification outside the state update function
    if (toastMessage) {
      toast.success(toastMessage);
    }
  }, []);

  const removeFromCart = useCallback((productId) => {
    let itemTitle = '';
    
    setCart(prevCart => {
      const item = prevCart.find(item => item.id === productId);
      if (item) {
        itemTitle = item.title;
      }
      return prevCart.filter(item => item.id !== productId);
    });
    
    // Show toast notification outside the state update function
    if (itemTitle) {
      toast.info(`${itemTitle} removed from cart`);
    }
  }, []);

  const updateQuantity = useCallback((productId, newQuantity) => {
    if (newQuantity < 1) return;
    
    setCart(prevCart => 
      prevCart.map(item => 
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    localStorage.removeItem(CART_STORAGE_KEY);
    toast.success('Cart cleared');
  }, []);

  // Test localStorage functionality
  const testLocalStorage = useCallback(() => {
    try {
      localStorage.setItem('test_storage', 'test');
      const testValue = localStorage.getItem('test_storage');
      localStorage.removeItem('test_storage');
      return testValue === 'test';
    } catch (e) {
      console.error('localStorage test failed:', e);
      return false;
    }
  }, []);

  // Check localStorage on mount - Move toast notification to a useEffect
  useEffect(() => {
    let storageChecked = false;
    
    const checkLocalStorage = async () => {
      if (storageChecked) return;
      storageChecked = true;
      
      const storageAvailable = testLocalStorage();
      if (!storageAvailable && isMounted.current) {
        console.error('localStorage is not available. Cart persistence will not work.');
        // Only show toast if component is still mounted
        setTimeout(() => {
          if (isMounted.current) {
            toast.error('Your browser storage is disabled. Cart items will not be saved between visits.');
          }
        }, 0);
      }
    };
    
    checkLocalStorage();
  }, [testLocalStorage]);

  // Calculate itemCount using useMemo to avoid recalculations
  const itemCount = useMemo(() => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  }, [cart]);

  // Use useMemo for the context value to prevent unnecessary rerenders
  const value = useMemo(() => ({
    cart,
    cartTotal,
    vat,
    totalWithVat,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    itemCount
  }), [cart, cartTotal, vat, totalWithVat, itemCount, addToCart, removeFromCart, updateQuantity, clearCart]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export default CartContext; 