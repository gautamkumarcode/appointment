const axios = require('axios');

const API_URL = 'http://localhost:4500/api';

async function testAuth() {
  try {
    console.log('Testing backend server...');

    // Test health endpoint
    const healthResponse = await axios.get('http://localhost:4500/health');
    console.log('Health check:', healthResponse.data);

    // Test login endpoint with dummy data
    const loginData = {
      email: 'test@example.com',
      password: 'testpassword',
    };

    console.log('Testing login endpoint...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, loginData, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Login response:', loginResponse.data);
  } catch (error) {
    console.error('Test error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });
  }
}

testAuth();
