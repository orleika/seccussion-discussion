const express = require('express')
const http = require('http')
const WebSocket = require('ws')

const LISTEN_PORT = 3000
const app = express()

const server = http.createServer(app)
const wss = new WebSocket.Server({ server })

const INIT_MESSAGES = `Secussionへようこそ。\n
ここではセキュリティに関する質問にお答えしたり，疑問に思っているテーマに関して情報を収集し意見を提示します。\n
興味のあるテーマに関して書き込んでください。\n
Secussionと議論を深めましょう。`

const sleep = msec => new Promise(resolve => setTimeout(resolve, msec))

wss.on('connection', (ws) => {
  ws.on('message', (order) => {
    (async (order) => {
      console.log(order)
      await sleep(1000)
      if (order === '/init') {
        ws.send(INIT_MESSAGES)
      } else {
        ws.send('Hello')
      }
    })(order)
  }).on('close', () => {
    console.log('disconnected...')
  })
})

server.listen(LISTEN_PORT, () => {
  console.log('Listening on %d', server.address().port)
})
