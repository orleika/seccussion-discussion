module.exports = class Markov {
  constructor (n) {
    this.data = {}
  }

  add (words) {
    for (var i = 0; i <= words.length; i++) {
      var now = words[i]
      if (now === undefined) { now = null };
      var prev = words[i - 1]
      if (prev === undefined) { prev = null };

      if (this.data[prev] === undefined) {
        this.data[prev] = []
      }
      this.data[prev].push(now)
    }
  }

  sample (word) {
    var words = this.data[word]
    if (words === undefined) { words = [] }

    return words[Math.floor(Math.random() * words.length)]
  }

  make () {
    var sentence = []
    var word = this.sample(null)
    while (word) {
      sentence.push(word)
      word = this.sample(word)
    }
    return sentence.join('')
  }
}
