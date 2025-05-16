import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaPaperPlane, FaRedo, FaCommentAlt } from 'react-icons/fa';
import chatIcon from '../../assets/chat-icon.jpg';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: 'Hi there! 👋 I can help you navigate the AI Waverider website and answer questions about our offerings. How can I assist you today?' 
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const retryLastMessage = () => {
    // Find the last user message
    const lastUserMessageIndex = [...messages].reverse().findIndex(msg => msg.role === 'user');
    if (lastUserMessageIndex !== -1) {
      const lastUserMessage = messages[messages.length - 1 - lastUserMessageIndex];
      // Remove the error message
      setMessages(prevMessages => prevMessages.filter((_, index) => index !== prevMessages.length - 1));
      // Set loading state
      setIsLoading(true);
      setHasError(false);
      // Send the message again
      sendMessageToAPI(lastUserMessage.content, messages.filter((_, index) => index !== prevMessages.length - 1));
    }
  };

  const sendMessageToAPI = async (messageText, currentMessages) => {
    try {
      console.log('Sending chat message to API...');
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: currentMessages.filter(msg => msg.role !== 'error'),
        }),
      });
      
      console.log('API Response Status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('API Response Data:', data);
      
      // Add assistant response to chat
      setMessages(prevMessages => [...prevMessages, { 
        role: 'assistant', 
        content: data.success ? data.message : 'Sorry, I encountered an error. Please try again.'
      }]);
      setHasError(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prevMessages => [
        ...prevMessages, 
        { 
          role: 'error', 
          content: 'Sorry, I encountered an error: ' + error.message
        }
      ]);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (inputMessage.trim() === '') return;
    
    const userMessage = { role: 'user', content: inputMessage };
    
    // Add user message to chat
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setHasError(false);
    
    // Call the API
    await sendMessageToAPI(inputMessage, [...messages, userMessage]);
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
        <div 
          onClick={toggleChat}
          style={{
            width: '45px',
            height: '45px',
            borderRadius: '50%',
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <img 
            src={chatIcon} 
            alt="Chat with us" 
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      </div>
      
      {/* Chat Interface */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            width: '350px',
            height: '500px',
            backgroundColor: 'white',
            borderRadius: '10px',
            boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            overflow: 'hidden',
            animation: 'slideUp 0.3s ease'
          }}
        >
          {/* Chat Header */}
          <div
            style={{
              backgroundColor: '#4FD1C5',
              color: 'white',
              padding: '15px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🤖</span> AI Waverider Assistant
            </h3>
            <button
              onClick={toggleChat}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              <FaTimes />
            </button>
          </div>
          
          {/* Chat Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '15px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            {messages.map((message, index) => (
              <div
                key={index}
                style={{
                  alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                  backgroundColor: message.role === 'user' ? '#e2f8f5' 
                    : message.role === 'error' ? '#ffeded' : '#f0f0f0',
                  color: message.role === 'error' ? '#d32f2f' : '#333',
                  padding: '10px 15px',
                  borderRadius: message.role === 'user' ? '18px 18px 0 18px' : '18px 18px 18px 0',
                  maxWidth: '80%',
                  wordBreak: 'break-word'
                }}
              >
                {message.content}
                {message.role === 'error' && (
                  <button
                    onClick={retryLastMessage}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#d32f2f',
                      cursor: 'pointer',
                      marginTop: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '14px',
                      padding: '0'
                    }}
                  >
                    <FaRedo /> Retry
                  </button>
                )}
              </div>
            ))}
            {isLoading && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: '#f0f0f0',
                  color: '#333',
                  padding: '10px 15px',
                  borderRadius: '18px 18px 18px 0',
                  maxWidth: '80%'
                }}
              >
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Chat Input */}
          <div
            style={{
              borderTop: '1px solid #eee',
              padding: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <input
              type="text"
              value={inputMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              style={{
                flex: 1,
                padding: '10px 15px',
                borderRadius: '20px',
                border: '1px solid #ddd',
                outline: 'none',
                fontSize: '14px',
                color: '#333' // Dark text color
              }}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={inputMessage.trim() === '' || isLoading}
              style={{
                backgroundColor: '#4FD1C5',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: inputMessage.trim() === '' || isLoading ? 'not-allowed' : 'pointer',
                opacity: inputMessage.trim() === '' || isLoading ? 0.7 : 1
              }}
            >
              <FaPaperPlane />
            </button>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        
        .typing-indicator span {
          width: 8px;
          height: 8px;
          background-color: #999;
          border-radius: 50%;
          animation: typing 1s infinite ease-in-out;
        }
        
        .typing-indicator span:nth-child(1) {
          animation-delay: 0s;
        }
        
        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        @keyframes typing {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
      `}</style>
    </>
  );
};

export default ChatBot; 