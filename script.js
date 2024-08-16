function pubsub() {
    this.queue = {},
    this.on = function (subName, fn) {
        if (this.queue[subName] == undefined) {this.queue[subName] = []}
        if (Array.isArray(fn)) {fn.forEach(func => this.queue[subName].push(func))}
        else {this.queue[subName].push(fn)}
    },
    this.off = function (subName, fn) {
        let index = this.queue[subName].indexOf(fn)
        this.queue[subName].splice(index, 1)
    },
    this.emit = (subName, values) => {
        this.queue[subName].forEach(fn => fn(values))
    },
    this.clear = () => this.queue = {}
}

const PubSub = new pubsub()

function Gameboard() {
    board = {}
    getBoard = () => Object.values(board).flat()
    getPlays = (player) => board[player]
    clear = () => board = {}
    addPlay = (obj) => {
        let allPlays = getBoard()
        let play = parseInt(obj.play)
        if (!allPlays.includes(play)) {
            if (board[obj.player] == undefined) {board[obj.player] = []} 
            board[obj.player].push(play)
            PubSub.emit('validPlay', {player: obj.player, event: obj.event})
        }
    }
    PubSub.on('newPlay', addPlay)
    return {addPlay, getPlays, clear}
}

function Player(symbol, playerName) {
    symbol = symbol
    playerName = playerName
    getSymbol = () => symbol
    getName = () => playerName
    return {getSymbol, getName}
}

const GameStatus = (function(board) {
    const combinations = [[1,2,3], [4,5,6], [7,8,9], [7,4,1], [8,5,2], [9,6,3], [7,5,3], [1,5,9]]
    let matchCount = 0
    let winner = 'noWinner'
    combinations.forEach(combination => {
        combination.forEach(num => {
            if (board.includes(num)) {matchCount++}
        })
        if (matchCount == 3) {winner = combination}
        matchCount = 0
    })
    return winner
})

function Play(players) {
    let playerList = [new Player('X', players.get('x-name')), new Player('O', players.get('o-name'))]
    let board = new Gameboard()
    let front = new FrontEnd()
    front.start()
    function checkWinner(obj) {
        let plays = board.getPlays(obj.player)
        let winnerCheck = GameStatus(plays)
        let player = playerList.filter(elem => elem.getSymbol() == obj.player)[0]
        if (Array.isArray(winnerCheck)) { 
            PubSub.emit('Winner', { player: player, combination: winnerCheck})
        }
    }
    function clearBoard() {
        board.clear()
        PubSub.clear()
    }
    PubSub.on('validPlay', checkWinner)
    PubSub.on('newGame', clearBoard)
}

function FrontEnd() {
    let info = document.querySelector('.game-information')
    let board = document.querySelector('.game-board')
    let boxes = document.querySelectorAll('div[class*="box"]')
    const listener = (e) =>  boxClicked(e.target)

    start = () => {
        let form = document.querySelector('form')
        form.classList.add('form-slide')
        setTimeout(() => form.classList.add('hidden'), 900);
        setTimeout(() => board.classList.remove('hidden'), 905);
        board.classList.add('board-slide')
        board.addEventListener('click', listener )
        PubSub.on('Winner', [stop, updateInfo, colorBoxes])
    }
    stop = () => {
        board.removeEventListener('click', listener )
        PubSub.on('newGame', clear)
    }
    updateInfo = (obj) => { 
        let playAgain = document.querySelector('.game-information > button')
        let winnerP = document.querySelector('.game-information > p')
        winnerP.textContent = `${obj.player.getName()} Won!`
        playAgain.addEventListener('click', () => {
            let data = new FormData(document.querySelector('form'))
            PubSub.emit('newGame')
            Play(data)
        })
        info.classList.remove('hidden')
        info.classList.add('winner-anim')
    }
    function boxClicked(event) {
        let currentTurn = info.dataset.turn
        let target = event.dataset.id
        function validPlay(obj) {
            changeTurn(obj.player)
            updateBox(obj.event, obj.player)
            updateBoxes()
        }
        PubSub.on('validPlay', validPlay)
        PubSub.emit('newPlay', { play: target, player: currentTurn, event: event})
        PubSub.off('validPlay', validPlay)
    }
    changeTurn = (currentTurn) => {
        info.dataset.turn = currentTurn == 'X' ? 'O' : 'X'
    }
    updateBox = (box, symbol) => {
        if (box.textContent == '') {
            box.textContent = symbol
            box.classList.add('box-anim')
        }
    }
    updateBoxes = () => {
        boxes.forEach(box => box.classList.toggle('box-O'))}
    colorBoxes = (obj) => {
        winnerBoxes = Array.from(boxes).filter(box => (obj.combination.includes(parseInt(box.dataset.id))))
        if (obj.player.getSymbol() == 'X') {winnerBoxes.forEach(box => box.classList.add('winner-X'))}
        else {winnerBoxes.forEach(box => box.classList.add('winner-O'))}
    }
    clear = () => {
        info.classList.add('hidden')
        info.dataset.turn = 'X'
        boxes.forEach(box => {
            box.className = 'box-X'
            box.textContent = ''
        })
    }
    return {start}
}

document.addEventListener('readystatechange', () => {
    let form = document.querySelector('form')
    form.addEventListener('submit', (event) => {
        event.preventDefault()
        let data = new FormData(document.querySelector('form'))
        Play(data)
    })
})