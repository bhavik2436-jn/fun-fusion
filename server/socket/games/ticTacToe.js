const tttWinPatterns = [
    [0,1,2], [3,4,5], [6,7,8], // Rows
    [0,3,6], [1,4,7], [2,5,8], // Columns
    [0,4,8], [2,4,6]           // Diagonals
];

module.exports = (io, socket, activeRooms) => {
    socket.on('startTicTacToe', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room) return;

        room.tttBoard = ['', '', '', '', '', '', '', '', ''];
        room.tttTurn = 'X'; 

        const gameData = {
            board: room.tttBoard,
            turn: room.tttTurn,
            scores: room.players.map(p => ({name: p.name, score: p.score}))
        };
        io.to(roomCode).emit('loadTicTacToe', gameData);
    });

    socket.on('ticTacToeMove', (data) => {
        const room = activeRooms[data.roomCode];
        if(!room) return;

        const mySymbol = (socket.id === room.hostId) ? 'X' : 'O';
        
        if (room.tttTurn !== mySymbol) return;
        if (room.tttBoard[data.index] !== '') return;

        room.tttBoard[data.index] = mySymbol;
        
        let isWinner = false;
        for (let pattern of tttWinPatterns) {
            const [a, b, c] = pattern;
            if (room.tttBoard[a] && room.tttBoard[a] === room.tttBoard[b] && room.tttBoard[a] === room.tttBoard[c]) {
                isWinner = true;
                break;
            }
        }

        const isDraw = !room.tttBoard.includes('');

        if (isWinner) {
            const player = room.players.find(p => p.id === socket.id);
            if(player) player.score += 15; 

            io.to(data.roomCode).emit('ticTacToeResult', {
                status: 'win',
                winnerName: data.playerName,
                symbol: mySymbol,
                scores: room.players.map(p => ({name: p.name, score: p.score}))
            });
        } else if (isDraw) {
            io.to(data.roomCode).emit('ticTacToeResult', {
                status: 'draw',
                scores: room.players.map(p => ({name: p.name, score: p.score}))
            });
        } else {
            room.tttTurn = (room.tttTurn === 'X') ? 'O' : 'X';
            io.to(data.roomCode).emit('updateTicTacToe', {
                board: room.tttBoard,
                turn: room.tttTurn,
                scores: room.players.map(p => ({name: p.name, score: p.score}))
            });
        }
    });
};