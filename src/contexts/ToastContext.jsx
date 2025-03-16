import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((title, message, type = 'info', duration = 5000) => {
    const id = Date.now();
    setToasts(prevToasts => [...prevToasts, { id, title, message, type, duration }]);
    
    // Auto remove toast after duration
    setTimeout(() => {
      removeToast(id);
    }, duration);
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  // Toast component to display a single toast
  const Toast = ({ toast }) => {
    const { id, title, message, type } = toast;
    
    const getBackgroundColor = () => {
      switch (type) {
        case 'success': return 'bg-green-500';
        case 'error': return 'bg-red-500';
        case 'warning': return 'bg-yellow-500';
        default: return 'bg-blue-500';
      }
    };
    
    return (
      <div 
        className={`rounded-md shadow-md p-4 text-white flex justify-between ${getBackgroundColor()} mb-2`}
        role="alert"
      >
        <div>
          {title && <h3 className="font-bold">{title}</h3>}
          <p>{message}</p>
        </div>
        <button 
          onClick={() => removeToast(id)}
          className="ml-4 text-white"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    );
  };

  // The container that holds all toasts
  const ToastContainer = () => {
    if (toasts.length === 0) return null;

    return (
      <div className="fixed top-4 right-4 z-50 max-w-md">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} />
        ))}
      </div>
    );
  };

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

export default ToastProvider; 