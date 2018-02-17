;(function () {
  const ws = new WebSocket('ws://localhost:3000')
  const logsForm = document.getElementById('logs')
  const orderForm = document.getElementById('order')

  orderForm.value = ''

  ws.addEventListener('open', () => {
    loading(true)
    send('/init')
  })

  ws.addEventListener('message', event => {
    loading(false)
    const reply = event.data
    appendLogs(reply)
    logsForm.scrollTop = logsForm.scrollHeight
  })

  document.addEventListener('keypress', event => {
    const order = orderForm.value
    if (event.keyCode === 13 && order) {
      appendLogs(order, true)
      send(order)
      orderForm.value = ''
      logsForm.scrollTop = logsForm.scrollHeight
    }
  });

  function send(order) {
    ws.send(order)
    loading(true)
  }

  const loadingDom = document.createElement('div')
  loadingDom.classList.add('message-loading')
  let loadingStatus = false
  function loading(enable) {
    let op = loadingStatus ^ enable
    if (op && enable) {
      logsForm.appendChild(loadingDom)
    } else if (op && !enable) {
      logsForm.removeChild(loadingDom)
    }
    loadingStatus = enable
  }

  function appendLogs(message, order) {
    if (!message) {
      return
    }
    const messages = message.split('\n').filter(t => t)
    messages.forEach(m => {
      const t = document.createTextNode(m)
      const e = document.createElement('div')
      e.classList.add('message')
      if (order) {
        e.classList.add('message-order')
      }
      e.appendChild(t)
      logsForm.appendChild(e)
    })
  }
}())
