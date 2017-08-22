const express = require('express')
const http = require('http')
const ECT = require('ect')
const WebSocket = require('ws')

const LISTEN_PORT = 8080
const app = express()
const ectRenderer = ECT({
  watch: true,
  root: `${__dirname}/views`,
  ext: '.ect'
})

app.set('view engine', 'ect')
app.engine('ect', ectRenderer.render)
app.use(express.static('public'))

app.get('/', function (req, res) {
  res.render('index', { LISTEN_PORT })
})

const server = http.createServer(app)
const wss = new WebSocket.Server({ server })

wss.on('connection', (ws) => {
  console.log('connected')
  ws.on('message', (word) => {
    console.log('recognized: %s', word)
  }).on('close', () => {
    console.log('disconnected...')
  })
})

server.listen(LISTEN_PORT, () => {
  console.log('Listening on %d', server.address().port)
})
