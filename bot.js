const mineflayer = require('mineflayer')
const express = require('express')
const socketIO = require('socket.io')
//const { mineflayer: viewer } = require('prismarine-viewer')

const app = express()
const server = require('http').createServer(app)
const io = socketIO(server)

// Configuration
const config = {
  username: 'Waluka_Me',
  password: 'waluka',
  host: 'mc.cwresports.lk',
  version: '1.8.9'
}

// Create bot
const bot = mineflayer.createBot({
  username: config.username,
  password: config.password,
  host: config.host,
  version: config.version,
  auth: 'mojang'
})

let isAfk = true
let movementInterval

// Bot events
bot.on('login', () => {
  console.log('Logged in!')
  bot.chat('/server skyblock')
  
  // Start periodic movement
  movementInterval = setInterval(() => {
    if (isAfk) {
      bot.setControlState('forward', true)
      setTimeout(() => {
        bot.setControlState('forward', false)
        bot.look(bot.entity.yaw + 0.1, bot.entity.pitch)
      }, 100)
    }
  }, 60000) // Move every minute
})

bot.on('kicked', (reason) => {
  console.log('Kicked:', reason)
  setTimeout(() => bot = mineflayer.createBot(config), 60000) // Reconnect after 1 minute
})

bot.on('error', (err) => {
  console.log('Error:', err)
  setTimeout(() => bot = mineflayer.createBot(config), 60000) // Reconnect after 1 minute
})

bot.on('serverAuth', () => {
  bot.chat('/login waluka')
})

// Web Interface
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html')
})

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected')
  
  // Send initial bot status
  socket.emit('status', {
    username: bot.username,
    position: bot.entity.position,
    health: bot.health,
    food: bot.food,
    isAfk
  })
  
  // Handle commands from UI
  socket.on('command', (cmd) => {
    if (cmd === 'toggle-afk') {
      isAfk = !isAfk
      io.emit('afk-status', isAfk)
    } else if (cmd.startsWith('chat:')) {
      const message = cmd.substring(5)
      bot.chat(message)
    }
  })
})


server.listen(3000, () => {
  console.log('Web interface running on http://localhost:3000')
})
