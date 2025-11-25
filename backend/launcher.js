#!/usr/bin/env node

// Stable server launcher
const { spawn } = require('child_process');
const path = require('path');

let server = null;

function startServer() {
    console.log('🚀 Starting Result Analysis Server...');
    
    server = spawn('node', ['simple-server.js'], {
        cwd: __dirname,
        stdio: ['ignore', 'pipe', 'pipe']
    });
    
    server.stdout.on('data', (data) => {
        console.log(data.toString());
    });
    
    server.stderr.on('data', (data) => {
        console.error('Server error:', data.toString());
    });
    
    server.on('close', (code) => {
        if (code !== 0) {
            console.log(`⚠️ Server exited with code ${code}, restarting in 3 seconds...`);
            setTimeout(startServer, 3000);
        }
    });
    
    server.on('error', (err) => {
        console.error('❌ Failed to start server:', err);
    });
}

// Handle shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    if (server) server.kill();
    process.exit(0);
});

process.on('SIGTERM', () => {
    if (server) server.kill();
    process.exit(0);
});

startServer();