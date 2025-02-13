const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Successfully connected to MongoDB.'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Create Schema for video metadata
const VideoSchema = new mongoose.Schema({
    filename: String,
    latitude: Number,
    longitude: Number,
    uploadDate: { type: Date, default: Date.now },
    videoPath: String
});

const Video = mongoose.model('Video', VideoSchema);

// Set up multer for storing videos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ storage: storage });

// Upload endpoint
app.post('/upload', upload.single('video'), async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        
        const video = new Video({
            filename: req.file.filename,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            videoPath: req.file.path
        });

        await video.save();
        res.json({ success: true, videoId: video._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Upload failed' });
    }
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const rooms = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        
        if (!rooms.has(roomId)) {
            rooms.set(roomId, { broadcaster: socket.id });
            console.log('Broadcaster joined room:', roomId);
        } else {
            socket.to(rooms.get(roomId).broadcaster).emit('viewer-connected');
            console.log('Viewer joined room:', roomId);
        }
    });

    socket.on('offer', (data) => {
        socket.to(data.roomId).emit('offer', data);
    });

    socket.on('answer', (data) => {
        socket.to(data.roomId).emit('answer', data.answer);
    });

    socket.on('ice-candidate', (data) => {
        socket.to(data.roomId).emit('ice-candidate', data.candidate);
    });

    socket.on('leave-room', (roomId) => {
        socket.leave(roomId);
        if (rooms.has(roomId) && rooms.get(roomId).broadcaster === socket.id) {
            socket.to(roomId).emit('broadcaster-disconnected');
            rooms.delete(roomId);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        rooms.forEach((value, roomId) => {
            if (value.broadcaster === socket.id) {
                socket.to(roomId).emit('broadcaster-disconnected');
                rooms.delete(roomId);
            }
        });
    });
});

app.get('/', (req, res) => {
    res.send('Streaming server is running');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 