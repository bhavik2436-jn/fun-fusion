const paradoxOptions = [
    { a: "Zindagi bhar har 5 minute mein bina wajah zor se chillana padega! 🗣️", b: "Har baar jab tum chaloge toh tumhare piche zor-zor se dhol bajega! 🥁", pctA: 42, pctB: 58 },
    { a: "Puri zindagi sirf Pizza aur Samosa khana padega! 🍕", b: "Puri zindagi sirf Gym ka feeka boiled chicken aur broccoli khana padega! 🥦", pctA: 81, pctB: 19 },
    { a: "Tumhe hamesha sab sach bolna padega (No filter)! 😇", b: "Tum hamesha jo bhi bologe woh sirf ek jhooth hoga! 😈", pctA: 35, pctB: 65 },
    { a: "Subah uthte hi 1 glass toxic-looking cyber waste pina padega! ☣️", b: "Agale 5 saal tak bina internet aur phone ke guzaarna padega! 📵", pctA: 23, pctB: 77 },
    { a: "Hamesha ke liye doston ke sath gaming room mein band rehna padega! 🎮", b: "Mumbai local mein hamesha ke liye travel karte rehna padega! 🚇", pctA: 89, pctB: 11 },
    { a: "Tumhare paas hamesha unlimited paisa hoga par doston ke bina! 💰", b: "Dost hamesha sath honge par hamesha jeb khali rahegi! 💸", pctA: 48, pctB: 52 },
    { a: "Agala 1 saal bina nahaaye guzaarna padega! 🧼", b: "Agala 1 saal bina doston se baat kiye guzaarna padega! 🤫", pctA: 55, pctB: 45 },
    { a: "Tum jab bhi bologe, tumhari aawaz doremon jaisi aayegi! 🐱", b: "Tum jab bhi bologe, tumhari aawaz hamesha ek heavy robotic villain jaisi aayegi! 🤖", pctA: 30, pctB: 70 },
    { a: "College ke saare assignments hamesha tumhe akele hi likhne padenge! 📚", b: "Puri college life mein hamesha exam wale din hi bimar padna padega! 🤒", pctA: 74, pctB: 26 },
    { a: "Har ek minute mein 1 line gaana padega chahay kahin bhi ho! 🎤", b: "Har ek ghante mein 5 minute tak nagin dance karna padega! 🐍", pctA: 51, pctB: 49 },
    { a: "Tumhara phone hamesha 1% battery par hi chalega! 🪫", b: "Tumhara phone hamesha super slow internet par chalega! 🐌", pctA: 62, pctB: 38 },
    { a: "Puri zindagi sirf thande paani se nahana padega (Khatarnak thand mein bhi)! 🥶", b: "Puri zindagi hamesha uble hue garam paani se hi nahana padega! 🥵", pctA: 67, pctB: 33 },
    { a: "Tum jab bhi sooge, tumhe hamesha sirf horror sapne aayenge! 👻", b: "Tum jab bhi uthoge, tumhe roz subah 1 baje hi uthna padega! ⏰", pctA: 39, pctB: 61 },
    { a: "Zindagi bhar hamesha ulti chappal pehen kar ghoomna padega! 🩴", b: "Zindagi bhar hamesha kapde ulte pehen kar ghoomna padega! 👕", pctA: 58, pctB: 42 },
    { a: "Puri duniya ko tumhari saari search history dikh jayegi! 🔍", b: "Duniya ko tumhare saare secret gallery photos dikh jayenge! 📸", pctA: 45, pctB: 55 },
    { a: "Tumhe roz 10 km paidal chalke college/kaam par jana padega! 🏃‍♂️", b: "Tumhe roz 3 ghante gande bartan dhone padenge! 🧽", pctA: 72, pctB: 28 },
    { a: "Har baar jhooth bolne par tumhare baal pink ho jayenge! 👩‍🎤", b: "Har baar jhooth bolne par tumhari naak lambi ho jayegi! 🤥", pctA: 64, pctB: 36 },
    { a: "Puri zindagi bina kisi AC ke normal fan mein rehna padega! 🥵", b: "Puri zindagi bina kisi swaad ke feeka khana khana padega! 🍲", pctA: 78, pctB: 22 },
    { a: "Tumhe hamesha sabke samne apni net worth batani padegi! 📇", b: "Tumhe hamesha sabke samne apna sabse bada dar (fear) bolna padega! 😨", pctA: 53, pctB: 47 },
    { a: "Puri zindagi ek aisi car chalani padegi jisme break nahi hai! 🚗", b: "Puri zindagi ek aisi bike chalani padegi jisme handle nahi mudta! 🏍️", pctA: 20, pctB: 80 }
];

module.exports = (io, socket, activeRooms) => {
    
    socket.on('startParadox', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room) return;

        room.paradoxGame = {
            currentPair: paradoxOptions[Math.floor(Math.random() * paradoxOptions.length)],
            votes: {}, // socketId -> 'A' or 'B'
            timeLeft: 20
        };

        io.to(roomCode).emit('loadParadoxUI', {
            optionA: room.paradoxGame.currentPair.a,
            optionB: room.paradoxGame.currentPair.b,
            isSolo: room.players.length === 1
        });

        // 20s Countdown Timer
        room.paradoxTimer = setInterval(() => {
            room.paradoxGame.timeLeft--;
            io.to(roomCode).emit('paradoxTimeUpdate', room.paradoxGame.timeLeft);

            if(room.paradoxGame.timeLeft <= 0) {
                clearInterval(room.paradoxTimer);
                revealParadoxResults(io, roomCode, room);
            }
        }, 1000);
    });

    socket.on('submitParadoxVote', (data) => {
        const room = activeRooms[data.roomCode];
        if(!room || !room.paradoxGame) return;

        room.paradoxGame.votes[socket.id] = data.choice; // 'A' or 'B'

        // Agar sabne lock kar diya, toh direct reveal
        if(Object.keys(room.paradoxGame.votes).length === room.players.length) {
            clearInterval(room.paradoxTimer);
            revealParadoxResults(io, data.roomCode, room);
        }
    });

    function revealParadoxResults(io, roomCode, room) {
        const pair = room.paradoxGame.currentPair;
        let finalReport = "";

        if (room.players.length === 1) {
            // Solo Mode: Show global AI statistics
            finalReport = `🤖 Global AI Analytics Data:<br>Duniya ke <b>${pair.pctA}%</b> logon ne Option A chuna, aur <b>${pair.pctB}%</b> logon ne Option B ko gale lagaya!`;
        } else {
            // Multiplayer Mode: Show group consensus split
            let countA = 0, countB = 0;
            for(let id in room.paradoxGame.votes) {
                if(room.paradoxGame.votes[id] === 'A') countA++;
                else countB++;
            }
            let total = room.players.length;
            let pctGroupA = Math.round((countA / total) * 100) || 0;
            let pctGroupB = Math.round((countB / total) * 100) || 0;
            
            finalReport = `👥 Group Split Report:<br>Option A: <b>${pctGroupA}%</b> (Total: ${countA} Votes)<br>Option B: <b>${pctGroupB}%</b> (Total: ${countB} Votes)<br><br>🔮 Global Trend Prediction: Option A (${pair.pctA}%) vs Option B (${pair.pctB}%)`;
        }

        // Add fun flat points for voting loyalty
        room.players.forEach(p => p.score += 15);

        io.to(roomCode).emit('paradoxResults', {
            report: finalReport,
            scores: room.players.map(pl => ({ name: pl.name, score: pl.score }))
        });
    }
};