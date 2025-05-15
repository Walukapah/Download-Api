const mineflayer = require('mineflayer')
const express = require('express')
const socketio = require('socket.io')
const { Vec3 } = require('vec3')

const app = express()
app.use(express.static('public'))
app.use(express.json())

const server = app.listen(3000, () => {
  console.log('Web server running on port 3000')
})

const io = socketio(server)

// Bot configuration
const BOT_USERNAME = process.env.BOT_USERNAME || 'Waluka_Me'
const BOT_PASSWORD = process.env.BOT_PASSWORD || 'waluka'
const SERVER_IP = process.env.SERVER_IP || 'mc.cwresports.lk'
const SKYBLOCK_SERVER = 'skyblock'

let bot = null
let afkInterval = null

function createBot() {
  const newBot = mineflayer.createBot({
    host: SERVER_IP,
    username: BOT_USERNAME,
    version: '1.8.9',
    auth: 'offline'
  })

  newBot.on('login', () => {
    console.log('Bot logged in')
    io.emit('status', 'Logged in')
    
    setTimeout(() => {
      newBot.chat('/login ' + BOT_PASSWORD)
    }, 3000)
  })

  newBot.on('spawn', () => {
    console.log('Bot spawned in world')
    io.emit('status', 'Spawned in world')
    newBot.setControlState('sneak', true) // Sneak to prevent falling
    
    // Start AFK interval only after spawn
    if (afkInterval) clearInterval(afkInterval)
    afkInterval = setInterval(() => {
      if (newBot.entity) {
        newBot.look(newBot.entity.yaw + 0.5, newBot.entity.pitch, true)
        newBot.swingArm()
      }
    }, 60000)
  })

  newBot.on('message', (message) => {
    const msg = message.toString()
    console.log('Message:', msg)
    io.emit('message', msg)
    
    if (msg.includes('Successfully logged in!')) {
      setTimeout(() => {
        newBot.chat('/server ' + SKYBLOCK_SERVER)
      }, 2000)
    }
  })

  newBot.on('kicked', (reason) => {
    console.log('Kicked:', reason)
    io.emit('status', `Kicked: ${reason}`)
    reconnect()
  })

  newBot.on('error', (err) => {
    console.log('Error:', err)
    io.emit('status', `Error: ${err.message}`)
    reconnect()
  })

  newBot.on('end', () => {
    console.log('Disconnected')
    io.emit('status', 'Disconnected')
    if (afkInterval) clearInterval(afkInterval)
    reconnect()
  })

  return newBot
}

function reconnect() {
  setTimeout(() => {
    console.log('Attempting to reconnect...')
    io.emit('status', 'Reconnecting...')
    bot = createBot()
  }, 5000)
}

// Initial connection
bot = createBot()

// Web interface routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html')
})

// Movement controls via websocket
io.on('connection', (socket) => {
  console.log('Web client connected')
  
  socket.on('move', (direction) => {
    if (!bot || !bot.entity) return
    
    const movements = {
      'forward': () => bot.setControlState('forward', true),
      'back': () => bot.setControlState('back', true),
      'left': () => bot.setControlState('left', true),
      'right': () => bot.setControlState('right', true),
      'jump': () => bot.setControlState('jump', true),
      'stop': () => {
        bot.clearControlStates()
        if (bot.entity) {
          bot.look(bot.entity.yaw + 0.1, bot.entity.pitch)
        }
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
  
  // Send player list and position periodically
  const updateInterval = setInterval(() => {
    if (bot) {
      // Player list
      if (bot.players) {
        const players = Object.keys(bot.players).filter(name => name !== BOT_USERNAME)
        socket.emit('players', players)
      }
      
      // Position
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
  
  socket.on('disconnect', () => {
    clearInterval(updateInterval)
  })
})
