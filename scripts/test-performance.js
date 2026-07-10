// scripts/test-performance.js
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testPerformance() {
    console.log('⚡ Testing Performance...');
    console.log('====================================');
    
    // Check if server is running
    try {
        await axios.get(`${BASE_URL}`);
        console.log('✅ Server is running');
    } catch (error) {
        console.log('❌ Server is not running. Please start with: npm run dev');
        return;
    }
    
    const endpoints = [
        { name: 'Home', url: '/' },
        { name: 'Blog', url: '/blog' },
        { name: 'Publications', url: '/publications' },
        { name: 'API - Popular', url: '/api/analytics/popular' },
    ];
    
    const results = [];
    
    for (const endpoint of endpoints) {
        console.log(`\n📡 Testing ${endpoint.name}...`);
        const times = [];
        
        // Run 5 times
        for (let i = 0; i < 5; i++) {
            const start = Date.now();
            try {
                await axios.get(`${BASE_URL}${endpoint.url}`);
                const end = Date.now();
                times.push(end - start);
                process.stdout.write('.');
            } catch (error) {
                console.log(`\n   ❌ Error: ${error.message}`);
                times.push(null);
            }
        }
        console.log('');
        
        // Calculate stats
        const validTimes = times.filter(t => t !== null);
        if (validTimes.length > 0) {
            const avg = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
            const min = Math.min(...validTimes);
            const max = Math.max(...validTimes);
            
            results.push({
                name: endpoint.name,
                avg: avg.toFixed(0),
                min: min,
                max: max
            });
            
            console.log(`   ✅ Avg: ${avg.toFixed(0)}ms, Min: ${min}ms, Max: ${max}ms`);
        } else {
            console.log(`   ❌ All requests failed`);
        }
    }
    
    console.log('\n====================================');
    console.log('📊 Performance Summary:');
    console.log('');
    console.log('| Endpoint | Avg (ms) | Min (ms) | Max (ms) | Status |');
    console.log('|----------|----------|----------|----------|--------|');
    results.forEach(r => {
        const status = parseInt(r.avg) < 100 ? '✅ GOOD' : 
                       parseInt(r.avg) < 300 ? '⚠️ OK' : '❌ SLOW';
        console.log(`| ${r.name.padEnd(8)} | ${r.avg.padEnd(8)} | ${String(r.min).padEnd(8)} | ${String(r.max).padEnd(8)} | ${status.padEnd(6)} |`);
    });
    
    const avgAll = results.length > 0 ? results.reduce((a, b) => a + parseInt(b.avg), 0) / results.length : 0;
    console.log(`\n📊 Overall average: ${avgAll.toFixed(0)}ms`);
    console.log(avgAll < 200 ? '✅ Performance is good!' : '⚠️ Consider optimizing slow endpoints');
    
    console.log('\n✅ Performance test completed!');
}

// Run the test
testPerformance().catch(console.error);