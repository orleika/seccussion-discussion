const fs = require('fs')
const WebSocket = require('ws')
const exec = require('child-process-promise').exec
const client = require('cheerio-httpcli')
const moment = require('moment')
const striptags = require('striptags')
const yml = require('yml')

const config = yml.load('config.yml')
