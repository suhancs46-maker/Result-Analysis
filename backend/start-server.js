#!/usr/bin/env node

// Wrapper to run server with better error handling
const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');

function startServer() {
    console.log('🚀 Starting Result Analysis Backend Server...');
    
    const server = spawn('node', [serverPath], {
        stdio: 'inherit',
        cwd: __dirname
    });
    
    server.on('close', (code) => {
        console.log(`\n⚠️ Server process exited with code ${code}`);
        if (code !== 0) {
            console.log('🔄 Restarting server in 2 seconds...');
            setTimeout(startServer, 2000);
        }
    });
    
    server.on('error', (err) => {
        console.error('❌ Server error:', err);
        setTimeout(startServer, 2000);
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down server...');
        server.kill('SIGTERM');
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        server.kill('SIGTERM');
        process.exit(0);
    });
}

startServer();