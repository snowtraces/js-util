let Trie = function (key) {
    this.root = {}
    this.key = key
    this.WORD_FLAG_KEY = "_w"
    this.DATA_KEY = "_d"
}

Trie.prototype.push = function (word, data) {
    let node = this.root
    for (const c of word) {
        if (!node[c]) {
            node[c] = {}
        }
        node = node[c]
    }

    node[this.WORD_FLAG_KEY] = 1
    node[this.DATA_KEY] = data
}

Trie.prototype.pull = function (word) {
    let node = this.root
    let nodeList = [['', this.root]]
    for (let c of word) {
        node = node[c]
        nodeList.push([c, node])
    }

    // 1. 标记为非叶子节点
    delete node[this.WORD_FLAG_KEY]
    delete node[this.DATA_KEY]
    // 2. 向上递归，没有下级节点，移除当前节点
    let _node = nodeList.pop() // {c:node[c]}
    while (_node) {
        let key = _node[0]
        let node = _node[1]
        // 父级节点
        let _pNode = nodeList.pop()
        if (_pNode && Object.keys(node).length === 0) {
            delete _pNode[1][key]
            _node = _pNode
        } else {
            nodeList = null
            break
        }
    }
}

Trie.prototype.search = function (word, caseSensitive = false) {
    let node = this.root
    if (!caseSensitive) {
        // 大小写不敏感
        // [全大写, 全小写, 首字母大写] 匹配
        let upperWord = word.toUpperCase()
        let upperResult = this.search(upperWord, true)
        if (upperResult) return upperResult

        let lowerWord = word.toLowerCase()
        let lowerResult = this.search(lowerWord, true)
        if (lowerResult) return lowerResult

        let firstUpperWord = firstUpperCase(word)
        return this.search(firstUpperWord, true)
    }

    let resultList = []
    let idx = 0;
    for (let c of word) {
        if (node[c]) {
            node = node[c]
        } else {
            if (c === "*") {
                for (let _c in node) {
                    if (_c === this.WORD_FLAG_KEY || _c === this.DATA_KEY || _c === 'word') {
                        continue
                    }
                    let _resultList = this.search(word.substring(0, idx) + _c + word.substring(idx + 1, word.length), true)
                    resultList.push(..._resultList)
                }
                break
            } else {
                return resultList
            }
        }
        idx++;
    }
    if (idx === word.length) {
        node.word = word
        resultList.push(node)
    }

    return resultList
}

Trie.prototype.save2Local = function () {
    localStorage.setItem(this.key, JSON.stringify(this.root))
}

Trie.prototype.init = function (data) {
    let trieNodes = localStorage.getItem(this.key)
    if (trieNodes) {
        this.loadDataTrie(trieNodes)
        log('--- 从storage中加载数据 ---')
    } else {
        if (data) {
            let dictJS = document.createElement('script')
            dictJS.src = './js/dict.js'
            el('body').appendChild(dictJS)

            dictJS.onload = () => {
                this.loadDataJSON(window[data])
                window[data] = null
                log('--- 从js文件中加载数据 ---')
            }
        } else {
            localStorage.setItem(this.key, JSON.stringify(this.root))
        }
    }
}

Trie.prototype.loadDataTrie = function (data) {
    this.root = JSON.parse(data)
    successMsg('词典加载成功')
}

Trie.prototype.loadDataJSON = function (data) {
    if (typeof data === 'string') {
        data = JSON.parse(data)
    }
    for (let k in data) {
        this.push(k, data[k])
    }
    this.save2Local()
    successMsg('词典加载成功')
}

Trie.prototype.findWord = function (base, result, limit) {
    if (Object.keys(base).length === 0 || Object.keys(result).length >= limit) {
        return result
    }
    let _base = {}
    for (const baseWord in base) {
        let startNode = base[baseWord]
        for (let c in startNode) {
            if (c === this.WORD_FLAG_KEY || c === this.DATA_KEY || c === 'word') {
                continue
            }
            let _node = startNode[c]
            if (_node[this.WORD_FLAG_KEY]) {
                result[baseWord + c] = _node[this.DATA_KEY]
            }

            _base[baseWord + c] = _node
        }
    }

    return this.findWord(_base, result, limit)
}