const client = require('cheerio-httpcli')
const moment = require('moment')
const striptags = require('striptags')
const exec = require('child-process-promise').exec

const targetUrl = 'http://www.security-next.com/'

client.fetch(targetUrl, (err, $, res) => {
  if (err) {
    console.log(err)
    process.exit(1)
  }

  const now = moment()
  const today = now.format('YYYY/MM/DD')
  const yesterday = now.subtract(1, 'days').format('YYYY/MM/DD')

  let news = striptags($(`dt:contains('${today}')`).parent().html())
  if (!news) {
    news = striptags($(`dt:contains('${yesterday}')`).parent().html())
  }
  let topNews = news.trim().replace(/\d{4}\/\d{2}\/\d{2}/g, '').split('\n').slice(0, 3)
  console.log(topNews)

  const speak = (text) => {
    return function () {
      return exec(`jtalk ${text}`)
    }
  }

  let speakingTasks = topNews.map((news) => {
    return speak(news)
  })
  speakingTasks.reduce((prev, curr) => {
    return prev.then(curr)
  }, Promise.resolve())
})
