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

function createBot() {
  return mineflayer.createBot({
    host: SERVER_IP,
    username: BOT_USERNAME,
    version: '1.8.9',
    auth: 'offline'
  })
}

let bot = createBot()

// Web interface routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html')
})

// Bot event handlers
bot.on('login', () => {
  console.log('Bot logged in')
  io.emit('status', 'Logged in')
  
  setTimeout(() => {
    bot.chat('/login ' + BOT_PASSWORD)
  }, 3000)
})

bot.on('message', (message) => {
  const msg = message.toString()
  console.log('Message:', msg)
  io.emit('message', msg)
  
  if (msg.includes('Successfully logged in!')) {
    setTimeout(() => {
      bot.chat('/server ' + SKYBLOCK_SERVER)
    }, 2000)
  }
})

// ... rest of the event handlers remain the same as previous version ...

// Movement controls via websocket
io.on('connection', (socket) => {
  console.log('Web client connected')
  
  // Movement and chat handlers remain the same
  // ...

  // Send player list periodically
  setInterval(() => {
    if (bot && bot.players) {
      const players = Object.keys(bot.players).filter(name => name !== BOT_USERNAME)
      socket.emit('players', players)
      
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
    bot.look(bot.entity.yaw + 0.5, bot.entity.pitch, true)
    bot.swingArm()
  }
}, 60000)
