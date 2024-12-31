const router = require('express').Router();
const authMiddleware = require('../middlewares/authMiddleware');
const User = require('../models/user');
const cloudinary = require('../config/cloudinary')

// GET Details of current logged-in user
router.get('/get-logged-user', authMiddleware, async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.body.userId }).select('-password');

        res.send({
            message: 'User fetched successfully',
            success: true,
            data: user
        })

    } catch (error) {
        res.status(400).send({
            message: error.message,
            success: false
        })
    }
})

router.get('/get-all-users', authMiddleware, async (req, res) => {
    try {
        const userid = req.body.userId;
        const user = await User.find({ _id: { $ne: userid } }).select('-password');

        res.send({
            message: 'All users fetched successfully',
            success: true,
            data: user
        })
    } catch (error) {
        res.status(400).send({
            message: error.message,
            success: false
        })
    }
})

router.post('/upload-profile-pic', authMiddleware, async (req, res) => {
    try {
        const image = req.body.image;

        // upload the image to cloudinary
        const uploadedImage = await cloudinary.uploader.upload(image, {
            folder: 'chat',
        });

        // update the user model & set the profile pic property 
        const user = await User.findByIdAndUpdate(
            { _id: req.body.userId },
            { profilePic: uploadedImage.secure_url },
            { new: true });

        res.status(200).send({
            message: 'Profile picture uploaded successfully',
            success: true,
            data: user
        })
    } catch (error) {
        res.status(400).send({
            message: error.message,
            success: false
        })
    }
})

module.exports = router;