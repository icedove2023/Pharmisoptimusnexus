// scripts/generate-secret.js
const crypto = require('crypto');

// Generate a 64-byte (512-bit) secure random string
const secret = crypto.randomBytes(64).toString('hex');

console.log('🔐 Your session secret:');
console.log(secret);
console.log('\nAdd this to your .env file as:');
console.log(`SESSION_SECRET=${secret}`);