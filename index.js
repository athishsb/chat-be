const express = require('express');
const dotenv = require('dotenv')
dotenv.config()
const db = require('./config/db')
const app = express();
const authRouter = require('./controllers/authController');
const userRouter = require('./controllers/userController');
const chatRouter = require('./controllers/chatController');
const messageRouter = require('./controllers/messageController');

// Middleware
app.use(express.json({ limit: "50mb" }));

const server = require('http').createServer(app);

const io = require('socket.io')(server, {
    cors: {
        // origin: "http://localhost:5173",
        origin: "https://ppa-tahc.netlify.app",
        methods: ["GET", "POST"]
    }
});

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/chat', chatRouter);
app.use('/api/message', messageRouter);

// Global variables
const onlineUsers = [];
const socketUserMap = {}; // Map of socket IDs to user IDs
let members;

// Socket.IO logic
io.on('connection', socket => {
    console.log(`Socket connected: ${socket.id}`);

    // Join specific rooms
    socket.on('join-room', userId => {
        socket.join(userId);
    });

    // Handle sending messages
    socket.on('send-message', message => {
        const recipientId = message.members.find(member => member !== message.sender);

        if (recipientId) {
            io.to(message.sender).to(recipientId).emit('receive-message', message);
            io.to(message.sender).to(recipientId).emit('set-message-count', message);
            io.to(recipientId).emit('set-notification-count', message);
        }
    });

    // Clear unread messages
    socket.on('clear-unread-messages', data => {
        io.to(data.members[0])
            .to(data.members[1])
            .emit('message-count-cleared', data);
    });

    // Handle typing status
    socket.on('user-typing', data => {
        io.to(data.members[0])
            .to(data.members[1])
            .emit('started-typing', data);
    });

    // User login
    socket.on('user-login', userId => {
        if (!onlineUsers.includes(userId)) {
            onlineUsers.push(userId);
        }
        socketUserMap[socket.id] = userId; // Map socket ID to user ID
        io.emit('online-users', onlineUsers);

        const bothMembersOnline = members?.every(memberId => onlineUsers.includes(memberId)) || false;
        io.emit('block-read-message', { onlineUsers, members, bothMembersOnline });

        console.log("\n user Logged in \n");

        console.log(`Total online users: ${onlineUsers.length}`);
        console.log(`Total online users in userSocketMap: ${Object.keys(socketUserMap)}`);
    });

    // User logout
    socket.on('user-offline', userId => {
        const index = onlineUsers.indexOf(userId);
        if (index !== -1) {
            onlineUsers.splice(index, 1);
        }
        delete socketUserMap[socket.id];
        io.emit('online-users-updated', onlineUsers);

        const bothMembersOnline = members?.every(memberId => onlineUsers.includes(memberId)) || false;
        io.emit('block-read-message', { onlineUsers, members, bothMembersOnline });

        console.log("\n user Logged out \n");

        console.log(`Total online users: ${onlineUsers.length}`);
        console.log(`Total online users in userSocketMap: ${Object.keys(socketUserMap)}`);

        console.log(`Socket disconnected: ${socket.id}`);
    });

    // Handle chat selection
    socket.on('selectedChat', data => {
        const membersList = data?.members?.map(m => m._id);
        if (membersList) {
            members = membersList;
        }
    });

    // Notify about new chat creation
    socket.on('new-chat-created', ({ newChat, member }) => {
        io.to(member).emit('new-chat-created-received', newChat);
    });

    // Handle socket disconnection
    socket.on('disconnect', () => {
        const userId = socketUserMap[socket.id];
        if (userId) {
            const index = onlineUsers.indexOf(userId);
            if (index !== -1) {
                onlineUsers.splice(index, 1);
            }
            delete socketUserMap[socket.id];
            io.emit('online-users-updated', onlineUsers);

            const bothMembersOnline = members?.every(memberId => onlineUsers.includes(memberId)) || false;
            io.emit('block-read-message', { onlineUsers, members, bothMembersOnline });

            console.log("\n user closed window \n ")

            console.log(`Total online users: ${onlineUsers.length}`);
            console.log(`Total online users in userSocketMap: ${Object.keys(socketUserMap)}`);
        }
        console.log(`Socket disconnected: ${socket.id}`);
    });
});

const port = process.env.PORT || 3000;

server.listen(port, () => {
    db();
    console.log(`Server is running on port ${port}`);
})