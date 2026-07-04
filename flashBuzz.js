const quizDatabase = [
    { q: "Computer ka dimaag (Brain) kise kaha jata hai? 🧠", options: ["RAM", "Hard Disk", "CPU", "UPS"], correct: "CPU" },
    { q: "HTML ka full form kya hai? 🌐", options: ["Hyper Text Markup Language", "High Tech Multi Language", "Hyper Tabular Machine Log", "None"], correct: "Hyper Text Markup Language" },
    { q: "Isme se kaunsi language AI/Machine Learning mein sabse zyada use hoti hai? 🤖", options: ["Java", "Python", "C++", "HTML"], correct: "Python" },
    { q: "JavaScript mein variable declare karne ke liye kis keyword ka use hota hai? 💻", options: ["var", "let", "const", "All of the above"], correct: "All of the above" },
    { q: "World Wide Web (WWW) ka invention kisne kiya tha? 🌐", options: ["Bill Gates", "Tim Berners-Lee", "Steve Jobs", "Elon Musk"], correct: "Tim Berners-Lee" },
    { q: "CSS ka use web design mein kisliye kiya jata hai? 🎨", options: ["Database ke liye", "Styling aur Layout ke liye", "Server chalane ke liye", "Logic ke liye"], correct: "Styling aur Layout ke liye" },
    { q: "Google Chrome kya hai? 🌐", options: ["Operating System", "Web Browser", "Search Engine Company", "Programming Language"], correct: "Web Browser" },
    { q: "Social media platform Instagram ka parent company kaunsa hai? 📸", options: ["Google", "Microsoft", "Meta", "Apple"], correct: "Meta" },
    { q: "Internet par data secure bhejne ke liye kaunsa protocol use hota hai? 🔐", options: ["HTTP", "HTTPS", "FTP", "SMTP"], correct: "HTTPS" },
    { q: "VS Code kya hai? 🛠️", options: ["Operating System", "Source Code Editor", "Web Browser", "Database"], correct: "Source Code Editor" }
];

module.exports = (io, socket, activeRooms) => {
    
    socket.on('startFlashBuzz', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room) return;

        startNextBuzzRound(io, roomCode, room);
    });

    function startNextBuzzRound(io, roomCode, room) {
        if(room.buzzTimer) clearInterval(room.buzzTimer);

        const currentQ = quizDatabase[Math.floor(Math.random() * quizDatabase.length)];
        room.buzzGame = {
            questionObj: currentQ,
            buzzerPressedBy: null,
            timeLeft: 15,
            isSolo: room.players.length === 1
        };

        io.to(roomCode).emit('loadFlashBuzzUI', {
            question: currentQ.q,
            options: currentQ.options,
            isSolo: room.buzzGame.isSolo
        });

        // 15 Seconds Buzzer Window Timer
        room.buzzTimer = setInterval(() => {
            room.buzzGame.timeLeft--;
            io.to(roomCode).emit('buzzTimeUpdate', room.buzzGame.timeLeft);

            // 🤖 SOLO MODE AI TRIGGER: Timer ke beech mein AI kisi bhi random second par buzzer daba dega!
            if (room.buzzGame.isSolo && !room.buzzGame.buzzerPressedBy && room.buzzGame.timeLeft <= (Math.floor(Math.random() * 5) + 10)) {
                room.buzzGame.buzzerPressedBy = "AI_BOT";
                clearInterval(room.buzzTimer);
                
                // AI automatically answers (80% chance to be correct, 20% to be wrong)
                const isAiCorrect = Math.random() > 0.2;
                const aiAnswer = isAiCorrect ? currentQ.correct : currentQ.options.find(o => o !== currentQ.correct);
                
                setTimeout(() => {
                    io.to(roomCode).emit('buzzTurnOver', {
                        reason: 'ai_hacked',
                        winnerName: "🤖 Rogue AI Bot",
                        aiSelection: aiAnswer,
                        correctAnswer: currentQ.correct,
                        scores: room.players.map(pl => ({ name: pl.name, score: pl.score }))
                    });
                }, 1200);
                return;
            }

            if(room.buzzGame.timeLeft <= 0) {
                clearInterval(room.buzzTimer);
                io.to(roomCode).emit('buzzTurnOver', {
                    reason: 'timeout',
                    correctAnswer: currentQ.correct,
                    scores: room.players.map(pl => ({ name: pl.name, score: pl.score }))
                });
            }
        }, 1000);
    }

    socket.on('pressBuzzer', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room || !room.buzzGame || room.buzzGame.buzzerPressedBy) return;

        // Lock the buzzer for this player
        room.buzzGame.buzzerPressedBy = socket.id;
        clearInterval(room.buzzTimer);

        const jumper = room.players.find(p => p.id === socket.id);
        io.to(roomCode).emit('buzzerLocked', { playerName: jumper.name, playerId: socket.id });
    });

    socket.on('submitBuzzAnswer', (data) => {
        const room = activeRooms[data.roomCode];
        if(!room || !room.buzzGame || room.buzzGame.buzzerPressedBy !== socket.id) return;

        const isCorrect = (data.selectedOption === room.buzzGame.questionObj.correct);
        const player = room.players.find(p => p.id === socket.id);

        if (isCorrect) {
            if(player) player.score += 20; // 20 Points for right answer
        } else {
            if(player) player.score -= 10; // Negative marking for wrong answer!
        }

        io.to(data.roomCode).emit('buzzTurnOver', {
            reason: isCorrect ? 'correct' : 'wrong',
            winnerName: player ? player.name : "Unknown",
            playerSelection: data.selectedOption,
            correctAnswer: room.buzzGame.questionObj.correct,
            scores: room.players.map(pl => ({ name: pl.name, score: pl.score }))
        });
    });
};