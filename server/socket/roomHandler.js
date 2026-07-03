const wordSniperLogic = require('./games/wordSniper');
const ticTacToeLogic = require('./games/ticTacToe');
const blindDealLogic = require('./games/blindDeal');
const secretMissionLogic = require('./games/secretMission');
const bluffBattleLogic = require('./games/bluffBattle');
const drawAndGuessLogic = require('./games/drawAndGuess');
const exposeLogic = require('./games/expose');
const wyrLogic = require('./games/wouldYouRather');
const wkmLogic = require('./games/whoKnowsMe');
const emojiStoryLogic = require('./games/emojiStory');
const fastQuizLogic = require('./games/fastQuiz');
const tolLogic = require('./games/truthOrLie');
const mathHackerLogic = require('./games/mathHacker');
const mindReaderLogic = require('./games/mindReader');
const lieDetectorLogic = require('./games/lieDetector');
const paradoxLogic = require('./games/paradox');
const flashBuzzLogic = require('./games/flashBuzz');
const fortuneSamosaLogic = require('./games/fortuneSamosa');

const activeRooms = {}; 

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

module.exports = (io, socket) => {
    
    socket.on('createRoom', (playerName) => {
        let roomCode = generateRoomCode();
        while (activeRooms[roomCode]) {
            roomCode = generateRoomCode();
        }

        activeRooms[roomCode] = {
            id: roomCode,
            hostId: socket.id,
            players: [{ id: socket.id, name: playerName, isHost: true, score: 0 }],
            currentWord: "",
            tttBoard: ['', '', '', '', '', '', '', '', ''],
            tttTurn: 'X'
        };

        socket.join(roomCode);
        socket.emit('roomCreated', { roomCode: roomCode, players: activeRooms[roomCode].players });
    });

    socket.on('joinRoom', (data) => {
        const playerName = data.playerName;
        const roomCode = data.roomCode.toUpperCase(); 

        const room = activeRooms[roomCode];
        if (!room) return socket.emit('errorMsg', 'Galat Room Code!');
        
        room.players.push({ id: socket.id, name: playerName, isHost: false, score: 0 });
        socket.join(roomCode);

        socket.emit('roomJoined', { roomCode: roomCode, players: room.players });
        io.to(roomCode).emit('updatePlayersList', room.players);
    });

    socket.on('startGame', (roomCode) => {
        io.to(roomCode).emit('gameStarted');
    });

    // Games Connect ki
    wordSniperLogic(io, socket, activeRooms);
    ticTacToeLogic(io, socket, activeRooms);
    blindDealLogic(io, socket, activeRooms);
    secretMissionLogic(io, socket, activeRooms);
    bluffBattleLogic(io, socket, activeRooms);
    drawAndGuessLogic(io, socket, activeRooms);
    exposeLogic(io, socket, activeRooms);
    wyrLogic(io, socket, activeRooms);
    wkmLogic(io, socket, activeRooms);
    emojiStoryLogic(io, socket, activeRooms);
    fastQuizLogic(io, socket, activeRooms);
    tolLogic(io, socket, activeRooms);
    mathHackerLogic(io, socket, activeRooms);
    mindReaderLogic(io, socket, activeRooms);
    lieDetectorLogic(io, socket, activeRooms);
    paradoxLogic(io, socket, activeRooms);
    flashBuzzLogic(io, socket, activeRooms);
    fortuneSamosaLogic(io, socket, activeRooms);
};