const authMiddleware = require('../middlewares/authMiddleware');
const Chat = require('../models/chat');
const Message = require('../models/message');
const router = require('express').Router();


router.post('/new-message', authMiddleware, async (req, res) => {
    try {
        // Store the message in message collection
        const newMessage = new Message(req.body);
        const savedMessage = await newMessage.save();

        //update the lastMessage in chat collection
        await Chat.findOneAndUpdate({
            _id: req.body.chatId
        }, {
            latestMessage: savedMessage._id,
            $inc: { unreadMessageCount: 1 }
        });

        res.status(201).json({
            message: 'message sent successfully',
            success: true,
            data: savedMessage
        })

    } catch (error) {
        res.status(400).send({
            message: error.message,
            success: false
        })
    }
})

router.get('/get-all-messages/:chatId', authMiddleware, async (req, res) => {
    try {
        const allMessages = await Message.find({ chatId: req.params.chatId })
            .sort({ createdAt: 1 })

        res.status(200).send({
            message: 'Messages fetched successfully',
            success: true,
            data: allMessages
        })
    } catch (error) {
        res.status(400).send({
            message: error.message,
            success: false
        })
    }
})


router.get('/notifications', authMiddleware, async (req, res) => {
    try {
        const userId = req.body.userId; // userId is set by the middleware from the decoded token

        // Find all chat IDs where the user is a member
        const userChats = await Chat.find({ members: userId }).select('_id');
        const chatIds = userChats.map((chat) => chat._id);

        // Count unread messages in those chats where the user is not the sender
        const unreadMessagesCount = await Message.countDocuments({
            chatId: { $in: chatIds }, // Only messages from user's chats
            sender: { $ne: userId }, // Messages not sent by the user
            read: false,             // Messages that are unread
        });

        res.status(200).send({
            message: 'Notifications fetched successfully',
            success: true,
            data: unreadMessagesCount
        })
    } catch (error) {
        res.status(400).send({
            message: error.message,
            success: false
        })
    }
})




module.exports = router;