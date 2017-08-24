const fs = require('fs')
const { URL } = require('url')
const yml = require('yml')
const client = require('cheerio-httpcli')
const striptags = require('striptags')

const config = yml.load('config.yml')

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

const article = async (url) => {
  try {
    const result = await client.fetch(url)
    return result.$('[name = "raw_body"]').html()
  } catch (e) {
    console.error(e)
  }
}

const articles = async (urls) => {
  try {
    let targetArticles = []

    for (let url of urls) {
      const targetArticle = await article(url)
      console.log(targetArticle)
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

      if (partArticleUrls.length === 0) {
        break
      }

      articleUrls.push(...partArticleUrls)

      page++

      // wait next fetch, prevent DOS
      await sleep(3000)
    }

    return articleUrls
  } catch (e) {
    console.error(e)
  }
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
  // unique urls, remove duplicate
  articleUrls = Array.from(new Set(...articleUrls))

  const targetArticles = await articles(articleUrls)
  console.log(targetArticles)
}

main()
