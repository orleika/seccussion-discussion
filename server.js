const express = require('express')
const fs = require('fs')
const https = require('https')
const ECT = require('ect')
const WebSocket = require('ws')

const options = {
  key: fs.readFileSync('./keys/key.pem'),
  cert: fs.readFileSync('./keys/cert.pem')
}

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

app.get('/', (req, res) => {
  res.render('index', { LISTEN_PORT })
})

const server = https.createServer(options, app)
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
