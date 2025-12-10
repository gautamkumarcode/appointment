const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
});

async function testRedis() {
  try {
    // Test basic connectivity
    const pong = await redis.ping();
    console.log('✅ Redis ping:', pong);

    // Test set/get
    await redis.set('test-key', 'Hello Redis!');
    const value = await redis.get('test-key');
    console.log('✅ Redis set/get test:', value);

    // Test expiration
    await redis.setex('temp-key', 5, 'This will expire');
    const ttl = await redis.ttl('temp-key');
    console.log('✅ Redis TTL test:', ttl, 'seconds');

    // Clean up
    await redis.del('test-key', 'temp-key');
    console.log('✅ Redis connection test completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    process.exit(1);
  }
}

testRedis();
