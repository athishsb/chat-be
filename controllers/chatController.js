const authMiddleware = require('../middlewares/authMiddleware');
const Chat = require('../models/chat');
const Message = require('../models/message');
const router = require('express').Router();


router.post('/create-new-chat', authMiddleware, async (req, res) => {
    try {
        const chat = new Chat(req.body);
        const savedChat = await chat.save();

        await savedChat.populate('members');

        res.status(201).send({
            message: 'Chat created successfully',
            success: true,
            data: savedChat
        })
    } catch (error) {
        res.status(400).send({
            message: error.message,
            success: false
        })
    }
})

router.get('/get-all-chats', authMiddleware, async (req, res) => {
    try {
        const allChats = await Chat.find({ members: { $in: req.body.userId } })
            .populate('members')
            .populate('latestMessage')
            .sort({ updatedAt: -1 });

        res.status(200).send({
            message: 'Chats fetched successfully',
            success: true,
            data: allChats
        })

    } catch (error) {
        res.status(400).send({
            message: error.message,
            success: false
        })
    }
})

router.post('/clear-unread-message', authMiddleware, async (req, res) => {
    try {
        const chatId = req.body.chatId;

        // we want to update the unread message count in chat collection
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(400).send({
                message: 'No chat found with given chat ID',
                success: false
            })
        }

        const updatedChat = await Chat.findByIdAndUpdate(
            chatId,
            { unreadMessageCount: 0 },
            { new: true })
            .populate('members')
            .populate('latestMessage');

        // we want to update the read property to true in message collection
        await Message.updateMany(
            { chatId, read: false },
            { read: true })

        res.status(200).send({
            message: 'Unread message cleared successfully',
            success: true,
            data: updatedChat
        })

    } catch (error) {
        res.status(400).send({
            message: error.message,
            success: false
        })
    }
})

module.exports = router;