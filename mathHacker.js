module.exports = (io, socket, activeRooms) => {

    function generateMathProblem() {
        const types = ['add', 'sub', 'mult', 'square'];
        const type = types[Math.floor(Math.random() * types.length)];
        let q = "", a = 0;
        
        if (type === 'add') {
            let n1 = Math.floor(Math.random() * 90) + 10;
            let n2 = Math.floor(Math.random() * 90) + 10;
            q = `${n1} + ${n2}`; a = n1 + n2;
        } else if (type === 'sub') {
            let n1 = Math.floor(Math.random() * 100) + 50;
            let n2 = Math.floor(Math.random() * 50) + 1;
            q = `${n1} - ${n2}`; a = n1 - n2;
        } else if (type === 'mult') {
            let n1 = Math.floor(Math.random() * 15) + 5;
            let n2 = Math.floor(Math.random() * 15) + 5;
            // 11s multiplication trick chances
            if (Math.random() > 0.5) n2 = 11;
            q = `${n1} × ${n2}`; a = n1 * n2;
        } else if (type === 'square') {
            // Numbers ending in 5 for easy squares
            let bases = [15, 25, 35, 45, 55, 65, 11, 12];
            let n = bases[Math.floor(Math.random() * bases.length)];
            q = `${n}²`; a = n * n;
        }
        return { question: q, answer: a.toString() };
    }

    socket.on('startMathHacker', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room) return;

        startNextMathRound(io, roomCode, room);
    });

    function startNextMathRound(io, roomCode, room) {
        if(room.mathTimer) clearInterval(room.mathTimer);

        const problem = generateMathProblem();
        room.mathGame = {
            currentAnswer: problem.answer,
            timeLeft: 30
        };

        io.to(roomCode).emit('loadMathHacker', {
            problem: problem.question,
            scores: room.players.map(pl => ({name: pl.name, score: pl.score}))
        });

        // Start Timer
        room.mathTimer = setInterval(() => {
            room.mathGame.timeLeft--;
            io.to(roomCode).emit('mathTimeUpdate', room.mathGame.timeLeft);

            if(room.mathGame.timeLeft <= 0) {
                clearInterval(room.mathTimer);
                io.to(roomCode).emit('mathTurnOver', {
                    reason: 'timeout',
                    answer: room.mathGame.currentAnswer,
                    scores: room.players.map(pl => ({name: pl.name, score: pl.score}))
                });
            }
        }, 1000);
    }

    socket.on('submitMathGuess', (data) => {
        const room = activeRooms[data.roomCode];
        if(!room || !room.mathGame || room.mathGame.timeLeft <= 0) return;

        const guess = data.guess.trim();
        const guesser = room.players.find(p => p.id === socket.id);
        
        if (guess === room.mathGame.currentAnswer) {
            clearInterval(room.mathTimer);
            if(guesser) guesser.score += 25; // 25 Points for cracking the vault!
            
            io.to(data.roomCode).emit('mathTurnOver', {
                reason: 'hacked',
                winnerName: guesser.name,
                answer: room.mathGame.currentAnswer,
                scores: room.players.map(pl => ({name: pl.name, score: pl.score}))
            });
        } else {
            socket.emit('mathWrongGuess'); // Sirf usko jhatka lagega jisne galat likha
        }
    });

    socket.on('nextMathRound', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room) return;
        startNextMathRound(io, roomCode, room);
    });
};