let peerConnection;
let localStream;
let roomId;

// Replace with your actual Render.com URL
const socket = io('https://gps-cam.onrender.com', {
    reconnectionDelayMax: 10000,
    reconnection: true,
    reconnectionAttempts: 10
});

// Add connection status handlers
socket.on('connect', () => {
    console.log('Connected to signaling server');
    document.getElementById('streamingStatus').textContent = 
        'Streaming Status: Connected to server';
});

socket.on('connect_error', (error) => {
    console.error('Connection Error:', error);
    document.getElementById('streamingStatus').textContent = 
        'Streaming Status: Server connection failed';
});

socket.on('join-room', (room) => {
    console.log('Joined room:', room);
});

document.getElementById('startStreaming').addEventListener('click', async () => {
    try {
        // First check if the browser supports getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Your browser does not support camera/microphone access');
        }

        // Request permissions with better error handling
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }, 
            audio: true 
        }).catch(err => {
            if (err.name === 'NotAllowedError') {
                throw new Error('Camera/Microphone permission denied');
            } else if (err.name === 'NotFoundError') {
                throw new Error('No camera/microphone found');
            } else {
                throw err;
            }
        });

        // If we got the stream, show it
        const videoElement = document.getElementById('video');
        videoElement.srcObject = localStream;
        videoElement.play().catch(e => console.error('Error playing video:', e));

        // Create room ID and show it
        roomId = Math.random().toString(36).substring(7);
        document.getElementById('roomId').textContent = `Room ID: ${roomId}`;
        document.getElementById('roomId').style.display = 'block';

        // Initialize WebRTC
        initializePeerConnection();

        // Join room
        socket.emit('join-room', roomId);
        
        document.getElementById('streamingStatus').textContent = 
            'Streaming Status: Ready to connect';

    } catch (error) {
        console.error('Streaming Error:', error);
        document.getElementById('streamingStatus').textContent = 
            `Streaming Status: ${error.message}`;
    }
});

function initializePeerConnection() {
    peerConnection = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
        ]
    });

    // Add local stream
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // ICE candidate handling
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('ice-candidate', {
                roomId: roomId,
                candidate: event.candidate
            });
        }
    };
}

// Handle incoming connections
socket.on('viewer-joined', async () => {
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        socket.emit('offer', {
            roomId: roomId,
            offer: offer
        });
        
        document.getElementById('streamingStatus').textContent = 
            'Streaming Status: Viewer Connected';
    } catch (error) {
        console.error('Error creating offer:', error);
    }
});

// Handle answer from viewer
socket.on('answer', async (answer) => {
    try {
        await peerConnection.setRemoteDescription(answer);
    } catch (error) {
        console.error('Error setting remote description:', error);
    }
});

// Handle ICE candidates
socket.on('ice-candidate', async (candidate) => {
    try {
        await peerConnection.addIceCandidate(candidate);
    } catch (error) {
        console.error('Error adding ICE candidate:', error);
    }
});

document.getElementById('stopStreaming').addEventListener('click', () => {
    if (peerConnection) {
        peerConnection.close();
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    socket.emit('leave-room', roomId);
    document.getElementById('streamingStatus').textContent = 
        'Streaming Status: Disconnected';
    document.getElementById('roomId').style.display = 'none';
}); 