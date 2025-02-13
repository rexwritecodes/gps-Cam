let peerConnection;
const socket = io('https://gps-cam.onrender.com');
document.getElementById('joinRoom').addEventListener('click', async () => {
    const roomId = document.getElementById('roomInput').value;
    if (!roomId) return;

    initializePeerConnection();
    socket.emit('join-room', roomId);
    document.getElementById('connectionStatus').textContent = 'Status: Connecting...';
});

function initializePeerConnection() {
    peerConnection = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
        ]
    });

    peerConnection.ontrack = event => {
        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo.srcObject !== event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
        }
    };

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('ice-candidate', {
                roomId: roomId,
                candidate: event.candidate
            });
        }
    };
}

socket.on('offer', async (data) => {
    try {
        await peerConnection.setRemoteDescription(data.offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        socket.emit('answer', {
            roomId: data.roomId,
            answer: answer
        });
        
        document.getElementById('connectionStatus').textContent = 'Status: Connected';
    } catch (error) {
        console.error('Error handling offer:', error);
    }
});

socket.on('ice-candidate', async (candidate) => {
    try {
        await peerConnection.addIceCandidate(candidate);
    } catch (error) {
        console.error('Error adding ICE candidate:', error);
    }
}); 