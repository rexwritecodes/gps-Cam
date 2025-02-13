const socket = io('https://your-server-url.onrender.com');
let peerConnection;
let roomId;

document.getElementById('joinRoom').addEventListener('click', joinRoom);

async function joinRoom() {
    roomId = document.getElementById('roomInput').value.trim();
    if (!roomId) {
        alert('Please enter a Room ID');
        return;
    }

    initializePeerConnection();
    socket.emit('join-room', roomId);
    document.getElementById('connectionStatus').textContent = 'Connecting...';
}

function initializePeerConnection() {
    peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peerConnection.ontrack = event => {
        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo.srcObject !== event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
            document.getElementById('connectionStatus').textContent = 'Connected';
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
        socket.emit('answer', { roomId: roomId, answer: answer });
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

socket.on('broadcaster-disconnected', () => {
    document.getElementById('connectionStatus').textContent = 'Broadcaster disconnected';
    document.getElementById('remoteVideo').srcObject = null;
}); 