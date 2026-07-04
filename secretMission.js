const locations = [
    "College Canteen ☕", "Cricket Stadium 🏏", "Mumbai Local Train 🚂", 
    "Gym 💪", "Movie Theater 🎬", "Goa Beach 🏖️", 
    "Hospital 🏥", "Police Station 🚓", "IT Company Office 💻", 
    "Shopping Mall 🛍️", "Restaurant 🍽️", "Wedding Party 🎉"
];

module.exports = (io, socket, activeRooms) => {
    
    socket.on('startSecretMission', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room) return;

        // Kam se kam 3 log hone chahiye best maza aane ke liye, par 2 pe bhi chalega
        if(room.players.length < 2) {
            return socket.emit('errorMsg', 'Spy mode ke liye kam se kam 2 players chahiye!');
        }

        // 1. Random Location select karo
        const location = locations[Math.floor(Math.random() * locations.length)];
        
        // 2. Random Spy select karo (kisi ek ko bakra banao)
        const spyIndex = Math.floor(Math.random() * room.players.length);
        const spyId = room.players[spyIndex].id;

        room.secretMission = { 
            location: location, 
            spyId: spyId 
        };

        // 3. Har player ko uska SECRET role individually bhejo (koi dusre ka nahi dekh payega)
        room.players.forEach(player => {
            const isSpy = (player.id === spyId);
            const roleData = {
                isSpy: isSpy,
                location: isSpy ? "???" : location,
                playersList: room.players.map(p => p.name)
            };
            io.to(player.id).emit('loadSecretMission', roleData);
        });
        
        console.log(`🕵️‍♂️ Secret Mission in Room ${roomCode} | Location: ${location}`);
    });

    socket.on('endSecretMission', (roomCode) => {
        const room = activeRooms[roomCode];
        if(!room || !room.secretMission) return;

        const spyPlayer = room.players.find(p => p.id === room.secretMission.spyId);
        const spyName = spyPlayer ? spyPlayer.name : "Unknown";

        // Game over par sabko bata do ki Spy kaun tha aur location kya thi
        io.to(roomCode).emit('secretMissionOver', {
            spyName: spyName,
            location: room.secretMission.location
        });
    });
};