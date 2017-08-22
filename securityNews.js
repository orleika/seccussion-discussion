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
  let topNews = news.trim().replace(/\d{4}\/\d{2}\/\d{2}/g, '').replace(/ - /g, '。').replace(/「/g, '').replace(/」/g, '').split('\n').slice(0, 3)
  console.log(topNews)

  const speak = (text) => {
    return exec(`jtalk ${text}`)
  }

  const introSentence = '最新のセキュリティに関するニュースをお伝えします。'
  const speakSentence = introSentence + topNews.join('。')
  speak(speakSentence)
    .then((result) => {
      const stdout = result.stdout
      const stderr = result.stderr
      console.log('stdout: ', stdout)
      console.log('stderr: ', stderr)
    })
    .catch((err) => {
      console.error('exec error: ', err)
    })
})
