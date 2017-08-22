const client = require('cheerio-httpcli')

const targetUrl = 'http://www.security-next.com/'

client.fetch('http://www.google.com/search', { q: 'security' }, (err, $, res) => {
  console.log(res.headers)
  console.log($('title').text())
  $('a').each(function (idx) {
    console.log($(this).attr('href'))
  })
})
