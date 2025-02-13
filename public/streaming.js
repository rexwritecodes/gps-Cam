let peerConnection;
let localStream;
let roomId;

const socket = io('https://your-actual-server-url.com');
document.getElementById('startStreaming').addEventListener('click', async () => {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
        });
        document.getElementById('video').srcObject = localStream;

        // Create a unique room ID
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
            'Streaming Status: Error starting stream';
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