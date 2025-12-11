const axios = require('axios');

const API_URL = 'http://localhost:4500/api';

// Create axios instance with cookie support
const client = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

async function testSessionPersistence() {
  try {
    console.log('🧪 Testing session persistence...');

    // Step 1: Login
    console.log('\n1. Attempting login...');
    const loginResponse = await client.post('/auth/login', {
      email: 'test@example.com', // Replace with actual test credentials
      password: 'password123',
    });

    console.log('✅ Login successful:', loginResponse.data);

    // Step 2: Check auth immediately
    console.log('\n2. Checking auth immediately after login...');
    const meResponse1 = await client.get('/auth/me');
    console.log('✅ Auth check 1 successful:', meResponse1.data);

    // Step 3: Wait a bit and check again
    console.log('\n3. Waiting 2 seconds and checking auth again...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const meResponse2 = await client.get('/auth/me');
    console.log('✅ Auth check 2 successful:', meResponse2.data);

    console.log('\n🎉 Session persistence test passed!');
  } catch (error) {
    console.error('❌ Session test failed:', error.response?.data || error.message);
  }
}

// Run the test
testSessionPersistence();
