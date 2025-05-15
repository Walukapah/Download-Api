const mineflayer = require('mineflayer')
const express = require('express')
const socketio = require('socket.io')
const { createBot } = require('mineflayer')
const viewer = require('prismarine-viewer').mineflayer
const { Vec3 } = require('vec3')
const axios = require('axios')

const app = express()
app.use(express.static('public'))
app.use(express.json())

const server = app.listen(3000, () => {
  console.log('Web server running on port 3000')
})

const io = socketio(server)

// Bot configuration
const BOT_USERNAME = 'Waluka_Me'
const BOT_PASSWORD = 'waluka'
const SERVER_IP = 'mc.cwresports.lk'
const SKYBLOCK_SERVER = 'skyblock'

let bot = createBot({
  host: SERVER_IP,
  username: BOT_USERNAME,
  version: '1.20.4',
  auth: 'offline'
})

// Web interface routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html')
})

// Bot event handlers
bot.on('login', () => {
  console.log('Bot logged in')
  io.emit('status', 'Logged in')
  
  // Login to server account
  setTimeout(() => {
    bot.chat('/login ' + BOT_PASSWORD)
  }, 3000)
})

bot.on('message', (message) => {
  const msg = message.toString()
  console.log('Message:', msg)
  io.emit('message', msg)
  
  // Automatically switch to skyblock server
  if (msg.includes('Successfully logged in!')) {
    setTimeout(() => {
      bot.chat('/server ' + SKYBLOCK_SERVER)
    }, 2000)
  }
})

bot.on('kicked', (reason) => {
  console.log('Kicked:', reason)
  io.emit('status', `Kicked: ${reason}`)
  reconnect()
})

bot.on('error', (err) => {
  console.log('Error:', err)
  io.emit('status', `Error: ${err.message}`)
  reconnect()
})

bot.on('end', () => {
  console.log('Disconnected')
  io.emit('status', 'Disconnected')
  reconnect()
})

function reconnect() {
  setTimeout(() => {
    console.log('Attempting to reconnect...')
    io.emit('status', 'Reconnecting...')
    bot = createBot({
      host: SERVER_IP,
      username: BOT_USERNAME,
      version: '1.20.4',
      auth: 'offline'
    })
    setupBotEvents()
  }, 5000)
}

function setupBotEvents() {
  bot.on('login', () => {
    console.log('Reconnected successfully')
    io.emit('status', 'Reconnected')
    setTimeout(() => {
      bot.chat('/login ' + BOT_PASSWORD)
    }, 3000)
  })
}

// Movement controls via websocket
io.on('connection', (socket) => {
  console.log('Web client connected')
  
  socket.on('move', (direction) => {
    if (!bot) return
    
    const movements = {
      'forward': () => bot.setControlState('forward', true),
      'back': () => bot.setControlState('back', true),
      'left': () => bot.setControlState('left', true),
      'right': () => bot.setControlState('right', true),
      'jump': () => bot.setControlState('jump', true),
      'stop': () => {
        bot.clearControlStates()
        // Small movement to prevent AFK kick
        bot.look(bot.entity.yaw + 0.1, bot.entity.pitch)
      }
    }
    
    if (movements[direction]) movements[direction]()
  })
  
  socket.on('chat', (message) => {
    if (bot) bot.chat(message)
  })
  
  socket.on('command', (command) => {
    if (bot) bot.chat(command)
  })
  
  // Send player list periodically
  setInterval(() => {
    if (bot && bot.players) {
      const players = Object.keys(bot.players).filter(name => name !== BOT_USERNAME)
      socket.emit('players', players)
      
      // Send bot position
      if (bot.entity) {
        socket.emit('position', {
          x: bot.entity.position.x,
          y: bot.entity.position.y,
          z: bot.entity.position.z,
          yaw: bot.entity.yaw,
          pitch: bot.entity.pitch
        })
      }
    }
  }, 1000)
})

// AFK movement to prevent kicking
setInterval(() => {
  if (bot) {
    // Small movement or rotation
    bot.look(bot.entity.yaw + 0.5, bot.entity.pitch, true)
    bot.swingArm()
  }
}, 60000) // Every minute

// Start viewer (for minimap)
bot.once('spawn', () => {
  viewer(bot, { port: 3001, firstPerson: false })
  io.emit('status', 'Spawned in world')
  
  // Auto AFK position
  bot.setControlState('sneak', true) // Sneak to prevent falling
})
