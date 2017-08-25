const fs = require('fs')
const crypto = require('crypto')
const { URL } = require('url')
const yml = require('yml')
const dotenv = require('dotenv')
const mysql = require('mysql')
const client = require('cheerio-httpcli')
const striptags = require('striptags')
const kuromoji = require('kuromoji')

const config = yml.load(`${__dirname}/config.yml`)
const env = dotenv.config().parsed

const connection = mysql.createConnection({
  host: env.MYSQL_HOST,
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  database: env.MYSQL_DATABASE
})

const query = (...args) => {
  return new Promise((resolve, reject) => {
    connection.query(...args, (err, results, fields) => {
      if (err) reject(err)
      resolve({results, fields})
    })
  })
}

const sleep = (time) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, time)
  })
}

const readFile = (...args) => {
  return new Promise((resolve, reject) => {
    fs.readFile(...args, (err, data) => {
      if (err) reject(err)
      resolve(data)
    })
  })
}

const writeFile = (...args) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(...args, (err) => {
      if (err) reject(err)
      resolve()
    })
  })
}

const appendFile = (...args) => {
  return new Promise((resolve, reject) => {
    fs.appendFile(...args, (err) => {
      if (err) reject(err)
      resolve()
    })
  })
}

const article = async (url) => {
  try {
    console.log(url)
    const result = await client.fetch(url)
    return result.$('[name = "raw_body"]').html()
  } catch (e) {
    console.error(e)
  }
}

const articles = async (urls) => {
  let targetArticles = []
  try {
    for (let url of urls) {
      const targetArticle = await article(url)
      targetArticles.push(targetArticle)
      // wait next fetch, prevent DOS
      await sleep(3000)
    }
    return targetArticles
  } catch (e) {
    console.error(e)
  }
}

const urls = async (target) => {
  try {
    const origin = new URL(target).origin
    let articleUrls = []
    let page = 1

    while (true) {
      const result = await client.fetch(target.replace('{PAGE}', page))
      const partArticleUrls = result.$('.searchResult_itemTitle > a')
        .map((index, element) => {
          return origin + result.$(element).attr('href')
        }).get()
      // TEMPORARY: limit the fetching page
      if (partArticleUrls.length === 0) {
        break
      }
      articleUrls.push(...partArticleUrls)
      console.log(`articleUrls at ${target}, page: ${page}`)
      page++
      // wait next fetch, prevent DOS
      await sleep(3000)
    }

    return articleUrls
  } catch (e) {
    console.error(e)
  }
}

const normalize = (article) => {
  // trim HTML tag
  let normalized = striptags(article)
  // trim code
  normalized = normalized
    .replace(/```[\s\S]*?```/gm, '')
    .replace(/`[\s\S]*?`/g, '')
  // trim checkbox list
    .replace(/^\s*-\s*\[.*?]\s*/gm, '')
  // trim number list
    .replace(/^\s*\d+\./gm, '')
  // trim disc list
    .replace(/^\s*[*+-]+/gm, '')
  // trim blockquotes
    .replace(/^\s*>\s*/gm, '')
  // trim hr
    .replace(/^[\s*-]+$/gm, '')
  // trim table
    .replace(/\|\s*/g, '')
    .replace(/:-/g, '')
    .replace(/-+:/g, '')
  // trim header text and header tag on markdown
    .replace(/^\s*#+.+$/gm, '')
    .replace(/\S*?\n---/gm, '\n')
  // trim image
    .replace(/^\s*!\[\S+]\(http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- ./?%&=]*)?\s*.*?\)\s*$/gm, '')
  // trim URL
    .replace(/http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- ./?%&=]*)?/g, '')
  // trim strike
    .replace(/~\S*?~/g, '')
  // trim em
    .replace(/__?(\S+)__?/g, '$1')
  // trim strong
    .replace(/\*\*?(\S*?)\*\*?/g, '$1')
  // trim blank line
    .replace(/^\n/gm, '')
  // trim header space and tail space
    .replace(/^\s*/gm, '')
    .replace(/\s*$/gm, '')

  return normalized
}

const extractURL = (article) => {
  // extract markdown style URLs
  const mUrlRegExp =
    /\[\S*?]\((http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- ./?%&=]*)?\))/g
  let mUrls = article.match(mUrlRegExp)
  if (!mUrls) {
    mUrls = []
  }
  // extract simple URLs
  let urls = article.replace(mUrlRegExp)
    .match(/(http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- ./?%&=]*)?)/g)
  if (!urls) {
    urls = []
  }

  return urls.concat(mUrls)
}

const builder = kuromoji.builder({
  dicPath: 'node_modules/kuromoji/dict/'
})

const tokenize = (text) => {
  return new Promise((resolve, reject) => {
    builder.build((err, tokenizer) => {
      if (err) reject(err)
      resolve(tokenizer.tokenize(text))
    })
  })
}

const main = async () => {
  const targetUrls = config.portals.map((portal) => {
    return config.keywords.map((keyword) => {
      return portal.replace('{KEYWORD}', encodeURIComponent(keyword))
    })
  }).reduce((a, b) => { // flatten array
    return a.concat(b)
  })

  let articleUrls = await Promise.all(targetUrls.map((target) => {
    return urls(target)
  }))
  // remove duplicate URLs
  articleUrls = Array.from(new Set(...articleUrls))

  // fetch articles, then insert into mysql
  connection.connect()
  const sql = 'INSERT INTO ngram ' +
    '(text_hash, word, position, pos) ' +
    'VALUES (?, ?, ?, ?)'
  try {
    for (let articleUrl of articleUrls) {
      const targetArticle = await article(articleUrl)
      const normalizedArticle = normalize(targetArticle)
      const hash = crypto.createHash('sha1')
        .update(normalizedArticle).digest('hex')
      const tokens = await tokenize(normalizedArticle)

      for (let token of tokens) {
        // skip blank words
        if (token.surface_form.match(/^\s+$/gm)) {
          continue
        }
        // skip symbols
        if (token.pos === '記号') {
          continue
        }
        const params = [
          hash, token.surface_form, token.word_position, token.pos
        ]
        try {
          const result = await query(sql, params)
          console.log(result)
        } catch (e) {
          console.error(e)
        }
      }
      // wait next fetch, prevent DOS
      await sleep(3000)
    }
  } catch (e) {
    console.error(e)
  }

  connection.end()
}
main()
