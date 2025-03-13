/**
 * API Test Utility
 * 
 * Use this in the browser console to test API endpoints:
 * 
 * Example:
 * import { testRecommendationsAPI, testTrackViewAPI } from './utils/apiTest';
 * testRecommendationsAPI();
 * testTrackViewAPI('product-123');
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * Test the recommendations API endpoint
 */
export const testRecommendationsAPI = async () => {
  console.log('Testing recommendations API...');
  
  try {
    // Test the main endpoint
    console.log('Testing main API endpoint:', `${API_URL}/api/recommendations`);
    const mainResponse = await fetch(`${API_URL}/api/recommendations?limit=3`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Main API status:', mainResponse.status);
    if (mainResponse.ok) {
      const data = await mainResponse.json();
      console.log('Main API response:', data);
    } else {
      console.error('Main API failed with status:', mainResponse.status);
    }
    
    // Test the test endpoint
    console.log('Testing test API endpoint:', `${API_URL}/api-test/recommendations`);
    const testResponse = await fetch(`${API_URL}/api-test/recommendations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Test API status:', testResponse.status);
    if (testResponse.ok) {
      const testData = await testResponse.json();
      console.log('Test API response:', testData);
    } else {
      console.error('Test API failed with status:', testResponse.status);
    }
    
    return 'API test complete - check console for results';
  } catch (error) {
    console.error('Error testing recommendations API:', error);
    return 'API test failed - check console for errors';
  }
};

/**
 * Test the track view API endpoint
 * @param {string} productId - The product ID to track
 */
export const testTrackViewAPI = async (productId = 'test-product-123') => {
  console.log('Testing track view API...');
  
  try {
    console.log('Testing track view endpoint:', `${API_URL}/api/recommendations/track-view`);
    const response = await fetch(`${API_URL}/api/recommendations/track-view`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ productId })
    });
    
    console.log('Track view API status:', response.status);
    if (response.ok) {
      const data = await response.json();
      console.log('Track view API response:', data);
      return 'Track view test complete - check console for results';
    } else {
      console.error('Track view API failed with status:', response.status);
      return 'Track view test failed - check console for errors';
    }
  } catch (error) {
    console.error('Error testing track view API:', error);
    return 'Track view test failed - check console for errors';
  }
}; 