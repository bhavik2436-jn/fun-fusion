module.exports = (io, socket, activeRooms) => {
    
    socket.on('launchBlindDeal', (roomCode) => {
        io.to(roomCode).emit('blindDealSetup');
    });

    socket.on('startBlindDealBidding', (data) => {
        const room = activeRooms[data.roomCode];
        if(!room) return;

        // Purana timer agar chal raha ho toh usko band karo
        if(room.blindDeal && room.blindDeal.timer) {
            clearInterval(room.blindDeal.timer);
        }

        room.blindDeal = {
            item: data.item,
            targetPrice: data.price,
            timeLeft: 30, // ⏳ 30 Seconds Timer
            timer: null
        };

        io.to(data.roomCode).emit('blindDealBiddingStarted', { item: data.item });

        // Timer start karo jo har 1 second (1000ms) mein chalega
        room.blindDeal.timer = setInterval(() => {
            room.blindDeal.timeLeft--;
            
            // Sabko naya time bhejo
            io.to(data.roomCode).emit('marketTimerUpdate', room.blindDeal.timeLeft);

            // Agar time khatam ho gaya (0 par aa gaya)
            if(room.blindDeal.timeLeft <= 0) {
                clearInterval(room.blindDeal.timer); // Timer roko
                io.to(data.roomCode).emit('marketTimeout', { item: room.blindDeal.item });
            }
        }, 1000);
    });

    socket.on('submitBid', (data) => {
        const room = activeRooms[data.roomCode];
        // Agar time 0 hai toh bid accept mat karo
        if(!room || !room.blindDeal || room.blindDeal.timeLeft <= 0) return;

        io.to(room.hostId).emit('newBidReceived', {
            playerName: data.playerName,
            playerId: socket.id,
            bidAmount: data.bidAmount
        });
        socket.emit('bidSentAck');
    });

    socket.on('sendBidFeedback', (data) => {
        const room = activeRooms[data.roomCode];
        if(!room || !room.blindDeal) return;

        if(data.feedbackType === 'deal') {
            // Deal ho gayi! Timer ko abhi ke abhi rok do
            if(room.blindDeal.timer) clearInterval(room.blindDeal.timer);
            
            const winnerName = room.players.find(p => p.id === data.playerId)?.name || "Trader";
            const player = room.players.find(p => p.id === data.playerId);
            if(player) player.score += 20; 

            io.to(data.roomCode).emit('blindDealWon', {
                winnerName: winnerName,
                winningBid: data.bidAmount,
                item: room.blindDeal.item,
                scores: room.players.map(p => ({name: p.name, score: p.score}))
            });
        } else {
            io.to(data.playerId).emit('bidFeedback', data.feedbackType);
        }
    });
};