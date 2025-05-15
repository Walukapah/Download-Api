const mineflayer = require('mineflayer');
const express = require('express');

const app = express();
const server = require('http').createServer(app);

// Server configuration
const config = {
  username: 'Waluka_Me', // ඔබේ Minecraft username එක
  host: 'mc.cwresports.lk',
  version: '1.20.4',
  auth: 'offline'
};

// Create bot instance
const bot = mineflayer.createBot(config);

let isAfk = true;

// Bot events
bot.on('login', () => {
  console.log('Successfully connected to server!');
  
  // Login to server with password
  setTimeout(() => {
    bot.chat('/login waluka'); // ඔබේ password එක මෙතන යොදන්න
    console.log('Attempting to login with password...');
    
    // Join skyblock after login
    setTimeout(() => {
      bot.chat('/server skyblock');
      console.log('Joining Skyblock server...');
    }, 3000);
  }, 5000);
});

// AFK system
bot.on('spawn', () => {
  console.log('Bot spawned in world! Starting AFK system...');
  
  setInterval(() => {
    if(isAfk) {
      // Small movements to avoid AFK kick
      bot.setControlState('jump', true);
      setTimeout(() => {
        bot.setControlState('jump', false);
        bot.look(bot.entity.yaw + 0.1, bot.entity.pitch);
      }, 100);
    }
  }, 60000); // Every 1 minute
});

// Error handling
bot.on('kicked', (reason) => {
  console.log('Kicked from server:', reason);
  console.log('Will attempt to reconnect in 60 seconds...');
  setTimeout(() => {
    console.log('Reconnecting...');
    createBot();
  }, 60000);
});

bot.on('error', (err) => {
  console.log('Bot error:', err);
  console.log('Reconnecting in 60 seconds...');
  setTimeout(() => {
    console.log('Reconnecting...');
    createBot();
  }, 60000);
});

// Web interface
app.get('/', (req, res) => {
  res.send(`
    <h1>Minecraft AFK Bot</h1>
    <p>Status: <strong>${bot ? 'Connected' : 'Disconnected'}</strong></p>
    <p>Username: ${config.username}</p>
    <p>Server: ${config.host}</p>
  `);
});

// Start web server
server.listen(3000, () => {
  console.log('Web interface running on port 3000');
});

// Helper function to recreate bot
function createBot() {
  const newBot = mineflayer.createBot(config);
  // Transfer all event listeners to new bot
  // ... (add event listeners same as above)
}
