const emojiDatabase = [
    // 🎬 Bollywood Blockbusters
    { emoji: "👳‍♂️🚂🏃‍♀️💔", ans: "DDLJ", hint: "Bollywood Movie" },
    { emoji: "👨‍🎓👨‍🎓👨‍🎓📸", ans: "3 IDIOTS", hint: "Bollywood Movie" },
    { emoji: "👽🛸📻👦", ans: "PK", hint: "Bollywood Movie" },
    { emoji: "👯‍♀️💃🏏🥇", ans: "DANGAL", hint: "Bollywood Movie" },
    { emoji: "👮‍♂️🕶️💪🔫", ans: "DABANGG", hint: "Bollywood Movie" },
    { emoji: "🏏👨‍🌾💰🚫", ans: "LAGAAN", hint: "Bollywood Movie" },
    { emoji: "👨‍🦯🎹🔪🩸", ans: "ANDHADHUN", hint: "Bollywood Movie" },
    { emoji: "👻🏰👧🧵", ans: "STREE", hint: "Bollywood Movie" },
    { emoji: "👨‍🦲👩‍🦲💧🏜️", ans: "BALA", hint: "Bollywood Movie" },
    { emoji: "🐍👩😡🐍", ans: "NAGIN", hint: "Bollywood Classic" },
    { emoji: "🦁👑🌅🐒", ans: "LION KING", hint: "Hollywood Animation" },
    // 🎥 Hollywood & Web Series
    { emoji: "🚢🧊🥶💑", ans: "TITANIC", hint: "Hollywood Movie" },
    { emoji: "🦖🦕🏃‍♂️🚙", ans: "JURASSIC PARK", hint: "Hollywood Movie" },
    { emoji: "🧙‍♂️⚡👓🏰", ans: "HARRY POTTER", hint: "Hollywood Movie" },
    { emoji: "🦇👨🌃🚗", ans: "BATMAN", hint: "Hollywood Superhero" },
    { emoji: "🕷️👨🕸️🏙️", ans: "SPIDERMAN", hint: "Hollywood Superhero" },
    { emoji: "🦸‍♂️🔴🔵🛡️", ans: "CAPTAIN AMERICA", hint: "Hollywood Superhero" },
    { emoji: "🦹‍♂️🃏🤡🩸", ans: "JOKER", hint: "Hollywood Movie" },
    { emoji: "👨‍🚀🌌⏱️⏳", ans: "INTERSTELLAR", hint: "Sci-Fi Movie" },
    { emoji: "👽🚲🌕👦", ans: "ET", hint: "Sci-Fi Classic" },
    { emoji: "🏴‍☠️🚢☠️⚔️", ans: "PIRATES OF THE CARIBBEAN", hint: "Hollywood Movie" },
    { emoji: "🐒👦🌴🐅", ans: "THE JUNGLE BOOK", hint: "Hollywood Movie" },
    { emoji: "🐼🥋🥢🐉", ans: "KUNG FU PANDA", hint: "Animation Movie" },
    { emoji: "🚘😡🔥🎸", ans: "MAD MAX", hint: "Action Movie" },
    { emoji: "🔫🐕✏️🩸", ans: "JOHN WICK", hint: "Action Movie" },
    { emoji: "👨‍🔬🚙🕰️⚡", ans: "BACK TO THE FUTURE", hint: "Sci-Fi Classic" },
    { emoji: "🧊🏔️👑❄️", ans: "FROZEN", hint: "Animation Movie" },
    { emoji: "💰🏦👺🔴", ans: "MONEY HEIST", hint: "Web Series" },
    { emoji: "🦑🎮👧🚦", ans: "SQUID GAME", hint: "Web Series" },
    { emoji: "🧪👨‍🏫🚐💎", ans: "BREAKING BAD", hint: "Web Series" },
    { emoji: "🐉👸🐺❄️", ans: "GAME OF THRONES", hint: "Web Series" },
    { emoji: "🚲🔦👾🧇", ans: "STRANGER THINGS", hint: "Web Series" },
    // 🎵 Songs & Pop Culture
    { emoji: "🍎🍍🖊️🕺", ans: "PEN PINEAPPLE APPLE PEN", hint: "Viral Song" },
    { emoji: "👁️🐅🥊🎶", ans: "EYE OF THE TIGER", hint: "English Song" },
    { emoji: "👶🦈🌊🎶", ans: "BABY SHARK", hint: "Kids Song" },
    { emoji: "🌧️☔🕺💃", ans: "CHAM CHAM", hint: "Bollywood Song" },
    { emoji: "काला 👓😎", ans: "KALA CHASHMA", hint: "Bollywood Song" }
];

module.exports = (io, socket, activeRooms) => {

    // Helper to ignore spaces and special chars during guess
    const cleanStr = (str) => str.toUpperCase().replace(/[^A-Z0-9]/g, '');

    socket.on('startEmojiStory', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room) return;
        if(room.players.length < 2) return socket.emit('errorMsg', 'Kam se kam 2 players chahiye!');

        startNextEmojiRound(io, roomCode, room);
    });

    function startNextEmojiRound(io, roomCode, room) {
        if(room.emojiTimer) clearInterval(room.emojiTimer);

        const currentData = emojiDatabase[Math.floor(Math.random() * emojiDatabase.length)];
        
        room.emojiGame = {
            emojiStr: currentData.emoji,
            answer: currentData.ans,
            cleanAnswer: cleanStr(currentData.ans),
            hint: currentData.hint,
            timeLeft: 40, // 40 seconds per round
            solvedBy: []
        };

        io.to(roomCode).emit('loadEmojiStory', {
            emoji: room.emojiGame.emojiStr,
            hint: room.emojiGame.hint,
            scores: room.players.map(p => ({name: p.name, score: p.score}))
        });

        room.emojiTimer = setInterval(() => {
            room.emojiGame.timeLeft--;
            io.to(roomCode).emit('emojiTimeUpdate', room.emojiGame.timeLeft);

            if(room.emojiGame.timeLeft <= 0) {
                clearInterval(room.emojiTimer);
                endEmojiRound(io, roomCode, room, 'timeout');
            }
        }, 1000);
    }

    socket.on('submitEmojiGuess', (data) => {
        const room = activeRooms[data.roomCode];
        if(!room || !room.emojiGame || room.emojiGame.timeLeft <= 0) return;
        
        // Agar player ne pehle hi sahi guess kar liya hai, toh ignore karo
        if(room.emojiGame.solvedBy.includes(socket.id)) return;

        const guessClean = cleanStr(data.guess);
        const player = room.players.find(p => p.id === socket.id);

        if (guessClean === room.emojiGame.cleanAnswer || room.emojiGame.cleanAnswer.includes(guessClean) && guessClean.length > 3) {
            // Correct Guess!
            room.emojiGame.solvedBy.push(socket.id);
            
            // Speed points: 1st gets 30, 2nd gets 20, rest get 10
            let pointsWon = 10;
            if(room.emojiGame.solvedBy.length === 1) pointsWon = 30;
            else if(room.emojiGame.solvedBy.length === 2) pointsWon = 20;
            
            player.score += pointsWon;

            io.to(data.roomCode).emit('emojiPlayerSolved', {
                playerName: player.name,
                points: pointsWon
            });

            // Agar sabne guess kar liya, toh round jaldi end karo
            if(room.emojiGame.solvedBy.length === room.players.length) {
                clearInterval(room.emojiTimer);
                setTimeout(() => endEmojiRound(io, data.roomCode, room, 'all_solved'), 1000);
            }

        } else {
            // Wrong Guess -> Send to live Troll Feed
            io.to(data.roomCode).emit('liveWrongEmojiGuess', {
                playerName: player.name,
                guess: data.guess.toUpperCase()
            });
            socket.emit('wrongEmojiFeedback'); // Hilane (Shake) ke liye
        }
    });

    function endEmojiRound(io, roomCode, room, reason) {
        io.to(roomCode).emit('emojiRoundOver', {
            reason: reason,
            answer: room.emojiGame.answer,
            solvedCount: room.emojiGame.solvedBy.length,
            scores: room.players.map(p => ({name: p.name, score: p.score}))
        });
    }

    socket.on('nextEmojiRound', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room) return;
        startNextEmojiRound(io, roomCode, room);
    });
};