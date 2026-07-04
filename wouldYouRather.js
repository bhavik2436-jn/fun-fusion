const wyrQuestions = [
    { a: "Zindagi bhar bina internet ke rehna 📵", b: "Zindagi bhar AC/Fan ke bina rehna 🥵" },
    { a: "Ek horse-sized Duck se ladna 🦆", b: "100 duck-sized Horses se ladna 🐎" },
    { a: "Har waqt chilla kar baat karna 📢", b: "Har waqt fus-fusa kar (whisper) baat karna 🤫" },
    { a: "Kisine tumhara search history dekh liya 😱", b: "Kisine tumhare WhatsApp chats padh liye 📱" },
    { a: "Kabhi dobara Pizza na kha pana 🍕", b: "Kabhi dobara Burger na kha pana 🍔" },
    { a: "Aise time machine mein jana jo sirf Past mein jaye 🕰️", b: "Jo sirf Future mein jaye 🚀" },
    { a: "Ek hafte tak brush na karna 🪥", b: "Ek hafte tak nahana nahi 🚿" },
    { a: "Har roz ek kachha pyaz (Raw Onion) khana 🧅", b: "Har roz ek poora nimbu (Lemon) khana 🍋" },
    { a: "Duniya ka sabse smart insaan banna 🧠", b: "Duniya ka sabse ameer insaan banna 💰" },
    { a: "Apne dushman ki life save karna 🦸‍♂️", b: "Apne best friend ko 1 lakh ka nuksaan karwana 💸" },
    { a: "Sardiyon mein thande paani se nahana 🧊", b: "Garmiyon mein garam chai/coffee peena ☕" },
    { a: "Hamesha sach bolne ki shraap (curse) lagna 🤥", b: "Tumhari har baat par koi vishwas na kare 🥺" },
    { a: "Zindagi bhar ke liye sirf ek gaana sunna 🎧", b: "Zindagi bhar ke liye sirf ek movie dekhna 🎬" },
    { a: "Logo ke dimaag padh pana (Mind Reading) 👁️", b: "Gayab ho jana (Invisibility) 🫥" },
    { a: "Galti se apne teacher/boss ko 'I love you' bhej dena 💌", b: "Apni crush ko apne pet (dog/cat) ki awaz bhej dena 🐕" },
    { a: "1 saal tak phone use na karna 📵", b: "1 saal tak doston se na milna 👥" },
    { a: "Duniya ke saare languages bol pana 🗣️", b: "Saare animals se baat kar pana 🐕" },
    { a: "Free Wi-Fi jiska speed bohot slow ho 🐢", b: "Superfast internet par din ka sirf 1GB mile ⚡" },
    { a: "Saamne wale ka jhooth pakad lena 🚨", b: "Apna jhooth kabhi pakde na jana 😎" },
    { a: "Public mein pant phat jana 👖", b: "Bhari mehfil mein zor se burp (dakaar) marna 🙊" }
    // Aur bhi questions backend randomly generate karta rahega
];

module.exports = (io, socket, activeRooms) => {

    socket.on('startWyr', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room) return;
        if(room.players.length < 2) return socket.emit('errorMsg', 'Kam se kam 2 players chahiye!');

        startNextWyrRound(io, roomCode, room);
    });

    function startNextWyrRound(io, roomCode, room) {
        if(room.wyrTimer) clearInterval(room.wyrTimer);

        room.wyrGame = {
            question: wyrQuestions[Math.floor(Math.random() * wyrQuestions.length)],
            votes: {}, // Kisne A chuna, kisne B
            timeLeft: 15
        };

        io.to(roomCode).emit('loadWyrUI', {
            optionA: room.wyrGame.question.a,
            optionB: room.wyrGame.question.b,
            scores: room.players.map(p => ({name: p.name, score: p.score}))
        });

        // Start 15s Timer
        room.wyrTimer = setInterval(() => {
            room.wyrGame.timeLeft--;
            io.to(roomCode).emit('wyrTimeUpdate', room.wyrGame.timeLeft);

            if(room.wyrGame.timeLeft <= 0) {
                clearInterval(room.wyrTimer);
                revealWyrResults(io, roomCode, room);
            }
        }, 1000);
    }

    socket.on('submitWyrVote', (data) => {
        const room = activeRooms[data.roomCode];
        if(!room || !room.wyrGame || room.wyrGame.timeLeft <= 0) return;
        
        room.wyrGame.votes[socket.id] = data.choice; // 'A' or 'B'
        
        // Agar sabne vote kar diya toh direct reveal karo
        if(Object.keys(room.wyrGame.votes).length === room.players.length) {
            clearInterval(room.wyrTimer);
            revealWyrResults(io, data.roomCode, room);
        }
    });

    function revealWyrResults(io, roomCode, room) {
        let countA = 0; let countB = 0;
        const votersA = []; const votersB = [];

        room.players.forEach(p => {
            if(room.wyrGame.votes[p.id] === 'A') { countA++; votersA.push(p.name); }
            else if(room.wyrGame.votes[p.id] === 'B') { countB++; votersB.push(p.name); }
        });

        // Calculate majority
        let winningChoice = null;
        if(countA > countB) winningChoice = 'A';
        else if(countB > countA) winningChoice = 'B';
        else winningChoice = 'TIE'; // Draw

        // Points distribution: 15 points if you matched the majority
        room.players.forEach(p => {
            if(room.wyrGame.votes[p.id] === winningChoice) {
                p.score += 15;
            } else if (winningChoice === 'TIE' && room.wyrGame.votes[p.id]) {
                p.score += 5; // Tie hone par sabko 5 points jisne vote kiya
            }
        });

        io.to(roomCode).emit('wyrResults', {
            optionA: room.wyrGame.question.a,
            optionB: room.wyrGame.question.b,
            countA: countA,
            countB: countB,
            votersA: votersA,
            votersB: votersB,
            winningChoice: winningChoice,
            scores: room.players.map(p => ({name: p.name, score: p.score}))
        });
    }

    socket.on('nextWyrRound', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room) return;
        startNextWyrRound(io, roomCode, room);
    });
};