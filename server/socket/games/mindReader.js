const mindQuestions = [
    { q: "Ek normal insaan apni poari zindagi mein galti se kitne Kilo mitti/dhool kha jata hai? 🌍", a: 3 },
    { q: "Mumbai local mein ek din mein average kitne log bina ticket ke pakde jaate hain? 🎫", a: 4200 },
    { q: "Ek normal ladka din mein kitni baar galti se apna phone check karta hai bina kisi notification ke? 📱", a: 110 },
    { q: "Duniya mein kitne percent log nahaate waqt gaane gaate hain (Bathroom Singers)? 🎤", a: 68 },
    { q: "Ek saal mein average ek insaan kitni baar galti se doston ke samne paad (fart) deta hai? 💨", a: 45 },
    { q: "Average ek student pure saal mein kitne ghante college ke lectures mein sofe par baithe-baithe sota hai? 💤", a: 140 },
    { q: "Kitne percent log shopping mall mein sirf AC ki hawa khaane aur timepass karne jaate hain? 🛍️", a: 74 },
    { q: "Ek group mein average kitne percent doston ka plan last minute par cancel hota hai? 🚫", a: 82 }
];

const aiBots = [
    { name: "Bot Pappu 🤡" },
    { name: "Bot Dhinchak 💅" },
    { name: "Bot Shana 🤓" }
];

module.exports = (io, socket, activeRooms) => {
    
    socket.on('startMindReader', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room) return;

        room.mindGame = {
            currentQuestion: mindQuestions[Math.floor(Math.random() * mindQuestions.length)],
            guesses: {}, 
            timeLeft: 25
        };

        // UI Load Event
        io.to(roomCode).emit('loadMindReaderUI', {
            question: room.mindGame.currentQuestion.q,
            isSolo: room.players.length === 1,
            scores: room.players.map(pl => ({ name: pl.name, score: pl.score }))
        });

        // Start 25s Timer
        room.mindTimer = setInterval(() => {
            room.mindGame.timeLeft--;
            io.to(roomCode).emit('mindTimeUpdate', room.mindGame.timeLeft);

            if(room.mindGame.timeLeft <= 0) {
                clearInterval(room.mindTimer);
                revealMindResults(io, roomCode, room);
            }
        }, 1000);
    });

    socket.on('submitMindGuess', (data) => {
        const room = activeRooms[data.roomCode];
        if(!room || !room.mindGame || room.mindGame.timeLeft <= 0) return;

        room.mindGame.guesses[socket.id] = parseInt(data.guess) || 0;

        // Agar saare real players ne guess kar diya, toh direct reveal
        if(Object.keys(room.mindGame.guesses).length === room.players.length) {
            clearInterval(room.mindTimer);
            revealMindResults(io, data.roomCode, room);
        }
    });

    function revealMindResults(io, roomCode, room) {
        const correctAnswer = room.mindGame.currentQuestion.a;
        let finalResults = [];

        // 1. Real Players ka data process karo
        room.players.forEach(p => {
            const userGuess = room.mindGame.guesses[p.id] !== undefined ? room.mindGame.guesses[p.id] : 0;
            const diff = Math.abs(userGuess - correctAnswer);
            finalResults.push({ name: p.name, guess: userGuess, diff: diff, isBot: false, id: p.id });
        });

        // 2. 🤖 AI BOTS GENERATION (Agar player akela hai ya doston ke sath bhi maza badhana hai)
        if (room.players.length === 1) {
            aiBots.forEach(bot => {
                // AI randomly sahi answer ke aas-pass ka guess marega comedy tarike se
                const variance = Math.floor(correctAnswer * 0.4) + 5;
                const botGuess = Math.max(0, correctAnswer + (Math.random() > 0.5 ? variance : -variance));
                const diff = Math.abs(botGuess - correctAnswer);
                finalResults.push({ name: bot.name, guess: botGuess, diff: diff, isBot: true });
            });
        }

        // Sort karo jiska difference sabse kam hai (Who is closer)
        finalResults.sort((a, b) => a.diff - b.diff);

        // Winner ko 30 points (Bots ko points nahi milenge)
        const closestResult = finalResults[0];
        if (!closestResult.isBot) {
            const winner = room.players.find(p => p.id === closestResult.id);
            if(winner) winner.score += 30;
        }

        io.to(roomCode).emit('mindReaderResults', {
            correctAnswer: correctAnswer,
            leaderboard: finalResults.map(r => ({ name: r.name, guess: r.guess })),
            winnerName: closestResult.name,
            scores: room.players.map(pl => ({ name: pl.name, score: pl.score }))
        });
    }

    socket.on('nextMindRound', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room) return;
        // Trigger next question logic smoothly
        socket.emit('startMindReader', roomCode);
    });
};