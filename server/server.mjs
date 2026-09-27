import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'

const rooms = new Map()
const port = Number(process.env.PORT ?? 8787)
const projectRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const mimeTypes = { '.css': 'text/css', '.js': 'text/javascript', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' }
const httpServer = createServer(async (request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ service: 'TrackBack realtime party server', rooms: rooms.size }))
    return
  }
  const requestedPath = request.url?.split('?')[0] ?? '/'
  const filePath = requestedPath === '/' ? join(projectRoot, 'dist', 'index.html') : join(projectRoot, 'dist', requestedPath.replace(/^\//, ''))
  try {
    const file = await readFile(filePath)
    response.writeHead(200, { 'Content-Type': mimeTypes[extname(filePath)] ?? 'application/octet-stream' })
    response.end(file)
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain' })
    response.end('Not found')
  }
})
const webSocketServer = new WebSocketServer({ server: httpServer })

const send = (socket, message) => socket.send(JSON.stringify(message))
const broadcast = (room, message) => room.players.forEach((player) => send(player.socket, message))
const roomView = (room) => ({ code: room.code, players: room.players.map((player) => player.name), leader: room.leader, started: room.started, leaderboard: room.leaderboard })

webSocketServer.on('connection', (socket) => {
  let currentRoom
  let playerName

  socket.on('message', (rawMessage) => {
    let message
    try { message = JSON.parse(rawMessage.toString()) } catch { send(socket, { type: 'error', message: 'Érvénytelen kérés.' }); return }

    if (message.type === 'create') {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase()
      currentRoom = { code, leader: message.name, started: false, players: [{ name: message.name, socket }], leaderboard: [{ name: message.name, score: 0 }] }
      playerName = message.name
      rooms.set(code, currentRoom)
      send(socket, { type: 'room', room: roomView(currentRoom), leader: true })
      return
    }

    if (message.type === 'join') {
      const room = rooms.get(String(message.code).toUpperCase())
      if (!room) { send(socket, { type: 'error', message: 'Ez a party-kód nem létezik.' }); return }
      if (room.started) { send(socket, { type: 'error', message: 'Ez a party már elindult.' }); return }
      if (room.players.length >= 8) { send(socket, { type: 'error', message: 'A party megtelt.' }); return }
      playerName = message.name
      currentRoom = room
      room.players.push({ name: playerName, socket })
      send(socket, { type: 'room', room: roomView(room), leader: false })
      broadcast(room, { type: 'room', room: roomView(room), leader: false })
      return
    }

    if (!currentRoom) { send(socket, { type: 'error', message: 'Előbb lépj be egy partyba.' }); return }
    if (message.type === 'start' && currentRoom.leader === playerName) { currentRoom.started = true; currentRoom.currentTrack = message.track; broadcast(currentRoom, { type: 'started', room: roomView(currentRoom), track: currentRoom.currentTrack }); return }
    if (message.type === 'next' && currentRoom.leader === playerName) { currentRoom.currentTrack = message.track; broadcast(currentRoom, { type: 'next', track: currentRoom.currentTrack }); return }
    if (message.type === 'score') {
      const entry = currentRoom.leaderboard.find((item) => item.name === playerName)
      if (entry) entry.score += Number(message.points) || 0
      else currentRoom.leaderboard.push({ name: playerName, score: Number(message.points) || 0 })
      currentRoom.leaderboard.sort((a, b) => b.score - a.score)
      broadcast(currentRoom, { type: 'leaderboard', leaderboard: currentRoom.leaderboard })
    }
  })

  socket.on('close', () => {
    if (!currentRoom) return
    currentRoom.players = currentRoom.players.filter((player) => player.socket !== socket)
    if (currentRoom.players.length === 0) rooms.delete(currentRoom.code)
    else broadcast(currentRoom, { type: 'room', room: roomView(currentRoom), leader: currentRoom.leader === playerName })
  })
})

httpServer.listen(port, '0.0.0.0', () => console.log(`TrackBack party server listening on http://localhost:${port}`))
