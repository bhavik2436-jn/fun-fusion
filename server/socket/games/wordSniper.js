// 🎯 WORD SNIPER DATABASE (30+ Words)
const wordDatabase = [
    // Tech & Code
    { word: "DEVELOPER", hint: "Jo baith kar code likhta hai" },
    { word: "JAVASCRIPT", hint: "Humari app ka real-time engine" },
    { word: "MULTIPLAYER", hint: "Doston ke sath online khelna" },
    { word: "DATABASE", hint: "Jahan saara data save hota hai" },
    { word: "INTERNET", hint: "Iske bina na insta chalega na yeh game" },
    { word: "KEYBOARD", hint: "Jispe tum din raat ungliya chalate ho" },
    { word: "PROGRAM", hint: "Instructions jo computer ko chalate hain" },
    { word: "SERVER", hint: "Jo background mein sab control karta hai" },
    { word: "HACKER", hint: "Jo dusro ka system tod de" },
    
    // Movies, Fun & Sports
    { word: "BOLLYWOOD", hint: "Humaari Indian cinema ki duniya" },
    { word: "BLOCKBUSTER", hint: "Jo movie super hit ho jati hai" },
    { word: "POPCORN", hint: "Movie dekhte waqt sabse zaroori snacks" },
    { word: "CRICKET", hint: "Pitch par khela jane wala sabse bada emotion" },
    { word: "STADIUM", hint: "Jahan hazaron log chillate hain" },
    { word: "CENTURY", hint: "Jab batsman 100 run banata hai" },
    
    // Food & Lifestyle
    { word: "CHOCOLATE", hint: "Sabse favourite meetha treat 🍫" },
    { word: "PIZZA", hint: "Gol hota hai, square box mein aata hai" },
    { word: "BURGER", hint: "Do buns ke beech mein tikki" },
    { word: "COFFEE", hint: "Raat ko jaag kar kaam karne ka fuel ☕" },
    { word: "VACATION", hint: "Kaam aur college se lambi chhutti" },
    { word: "DUMBBELL", hint: "Gym mein heavy weights uthana" },
    { word: "PROTEIN", hint: "Muscles banane ke liye zaroori supplement" },
    
    // Emotions, Proposal & Special
    { word: "PROPOSAL", hint: "Ek bohot hi special sawaal ❤️" },
    { word: "ROMANCE", hint: "Pyaar ishq aur mohabbat" },
    { word: "FOREVER", hint: "Jo kabhi khatam na ho (Humesha ke liye)" },
    { word: "DESTINY", hint: "Kismat jo do logon ko milati hai" },
    { word: "SURPRISE", hint: "Bina bataye milne wala tohfa" },
    { word: "PARTNER", hint: "Life ke har game mein sath dene wala" },
    { word: "FUTURE", hint: "Aane wala kal jo humein banana hai" },
    { word: "BEAUTIFUL", hint: "Jo dekhne mein bohot pyari ho" },
    { word: "SOULMATE", hint: "Jo dil se juda ho" },
    { word: "MARRIAGE", hint: "Saat janmo ka bandhan" },
    { word: "MEMORIES", hint: "Jo hum hamesha yaad rakhte hain" }
];

function scrambleWord(word) {
    let arr = word.split('');
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
}

module.exports = (io, socket, activeRooms) => {
    socket.on('startWordSniper', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room) return;

        const selectedData = wordDatabase[Math.floor(Math.random() * wordDatabase.length)];
        room.currentWord = selectedData.word;
        
        const gameData = {
            scrambledWord: scrambleWord(selectedData.word),
            hint: selectedData.hint,
            scores: room.players.map(p => ({name: p.name, score: p.score}))
        };
        io.to(roomCode).emit('loadWordSniper', gameData);
    });

    socket.on('checkAnswer', (data) => {
        const room = activeRooms[data.roomCode];
        if(!room || !room.currentWord) return;

        if(data.guess.toUpperCase() === room.currentWord) {
            const player = room.players.find(p => p.id === socket.id);
            if(player) player.score += 10; 

            io.to(data.roomCode).emit('playerWon', { 
                winnerName: data.playerName, 
                word: room.currentWord,
                scores: room.players.map(p => ({name: p.name, score: p.score}))
            });
            room.currentWord = ""; 
        } else {
            socket.emit('wrongAnswer');
        }
    });
};