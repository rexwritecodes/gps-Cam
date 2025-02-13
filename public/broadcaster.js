const socket = io('https://your-server-url.onrender.com');
let peerConnection;
let localStream;
let roomId;

document.getElementById('startStream').addEventListener('click', startStreaming);
document.getElementById('stopStream').addEventListener('click', stopStreaming);

async function startStreaming() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
        });
        document.getElementById('localVideo').srcObject = localStream;
        
        roomId = Math.random().toString(36).substr(2, 9);
        document.getElementById('roomId').textContent = roomId;
        document.getElementById('streamStatus').textContent = 'Active';
        
        socket.emit('join-room', roomId);
        initializePeerConnection();
        
    } catch (error) {
        console.error('Error starting stream:', error);
        document.getElementById('streamStatus').textContent = 'Error starting stream';
    }
}

function initializePeerConnection() {
    peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('ice-candidate', {
                roomId: roomId,
                candidate: event.candidate
            });
        }
    };
}

socket.on('viewer-connected', async () => {
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', { roomId: roomId, offer: offer });
    } catch (error) {
        console.error('Error creating offer:', error);
    }
});

socket.on('answer', async (answer) => {
    try {
        await peerConnection.setRemoteDescription(answer);
    } catch (error) {
        console.error('Error setting remote description:', error);
    }
});

socket.on('ice-candidate', async (candidate) => {
    try {
        await peerConnection.addIceCandidate(candidate);
    } catch (error) {
        console.error('Error adding ICE candidate:', error);
    }
});

function stopStreaming() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
        peerConnection.close();
    }
    document.getElementById('localVideo').srcObject = null;
    document.getElementById('streamStatus').textContent = 'Stopped';
    document.getElementById('roomId').textContent = 'Not created yet';
    socket.emit('leave-room', roomId);
} 