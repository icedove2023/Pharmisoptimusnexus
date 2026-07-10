// vercel-build.js
const { execSync } = require('child_process');

console.log('🔨 Running Vercel build...');

// Install dependencies
console.log('📦 Installing dependencies...');
execSync('npm install --production', { stdio: 'inherit' });

console.log('✅ Build complete!');