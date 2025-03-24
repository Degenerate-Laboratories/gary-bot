#!/usr/bin/env node

// This line is needed to make the CLI executable
const path = require('path');
const { spawn } = require('child_process');

console.log('🤖 Starting Gary Bot...');
console.log('🎤 Gary Gensler is warming up his voice...');

// Get the path to the compiled index.js file
const botPath = path.join(__dirname, '../lib/index.js');

// Spawn the bot process
const bot = spawn('node', [botPath], {
    stdio: 'inherit',
    env: process.env
});

// Handle process events
bot.on('error', (err) => {
    console.error('Failed to start Gary Bot:', err);
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('\n👋 Gary Gensler is going back to his office...');
    bot.kill();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Gary Gensler is going back to his office...');
    bot.kill();
    process.exit(0);
}); 