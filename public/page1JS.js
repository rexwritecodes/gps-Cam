import { storage } from '../firebaseConfig.js';

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
        .then(function(registration) {
            console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch(function(error) {
            console.log('Service Worker registration failed:', error);
        });
}

let stream;
let gpsWatchId;
let mediaRecorder;
let recordedChunks = [];

document.getElementById('captureButton').addEventListener('click', async () => {
    try {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
            document.getElementById('gpsData').innerText = `GPS Data: Latitude ${latitude}, Longitude ${longitude}`;

            const video = document.getElementById('video');
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;

            setTimeout(() => {
                const canvas = document.getElementById('canvas');
                const context = canvas.getContext('2d');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = canvas.toDataURL('image/png');

                fetch('https://your-backend-url.com/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ latitude, longitude, image: imageData })
                })
                .then(response => response.json())
                .then(data => console.log('Success:', data))
                .catch(error => console.error('Error:', error));
            }, 2000);
        }, (error) => console.error('GPS Error:', error));
    } catch (error) {
        console.error('Camera Error:', error);
    }
});

document.getElementById('stopButton').addEventListener('click', () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        document.getElementById('video').srcObject = null;
        console.log('Capture stopped.');
    }
});

document.getElementById('startGpsButton').addEventListener('click', () => {
    gpsWatchId = navigator.geolocation.watchPosition((position) => {
        const { latitude, longitude } = position.coords;
        console.log(`GPS Update: Latitude ${latitude}, Longitude ${longitude}`);
        document.getElementById('gpsData').innerText = `GPS Data: Latitude ${latitude}, Longitude ${longitude}`;
    }, (error) => console.error('GPS Tracking Error:', error));
});

document.getElementById('stopGpsButton').addEventListener('click', () => {
    if (gpsWatchId) {
        navigator.geolocation.clearWatch(gpsWatchId);
        console.log('GPS Tracking stopped.');
        document.getElementById('gpsData').innerText = 'GPS Data: Not Available';
    }
});

document.getElementById('startRecording').addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('video').srcObject = stream;
        
        mediaRecorder = new MediaRecorder(stream);
        recordedChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = async () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                
                // Create FormData
                const formData = new FormData();
                formData.append('video', blob, 'recorded-video.webm');
                formData.append('latitude', latitude.toString());
                formData.append('longitude', longitude.toString());
                
                try {
                    const response = await fetch('http://localhost:3000/upload', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        document.getElementById('recordingStatus').innerText = 
                            'Recording Status: Upload Successful!';
                    } else {
                        throw new Error('Upload failed');
                    }
                } catch (error) {
                    console.error('Upload Error:', error);
                    document.getElementById('recordingStatus').innerText = 
                        'Recording Status: Upload Failed!';
                }
            });
        };
        
        mediaRecorder.start();
        document.getElementById('recordingStatus').innerText = 'Recording Status: Active';
        
    } catch (error) {
        console.error('Recording Error:', error);
        document.getElementById('recordingStatus').innerText = 
            'Recording Status: Error starting recording';
    }
});

document.getElementById('stopRecording').addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        const stream = document.getElementById('video').srcObject;
        stream.getTracks().forEach(track => track.stop());
        document.getElementById('video').srcObject = null;
    }
});


let peerConnection;
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

// On the streaming device
async function startStreaming() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('video').srcObject = stream;
        
        // Create peer connection
        peerConnection = new RTCPeerConnection(configuration);
        
        // Add stream to peer connection
        stream.getTracks().forEach(track => {
            peerConnection.addTrack(track, stream);
        });
        
        // Create and send offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        // Here you would send the offer to the receiving device
        // through your signaling server (Firebase Realtime Database)
        firebase.database().ref('offers').set({
            type: offer.type,
            sdp: offer.sdp
        });
    } catch (error) {
        console.error('Error starting stream:', error);
    }
}

// On the receiving device
async function receiveStream() {
    peerConnection = new RTCPeerConnection(configuration);
    
    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
        document.getElementById('video').srcObject = event.streams[0];
    };
    
    // Listen for offer
    firebase.database().ref('offers').on('value', async (snapshot) => {
        const offer = snapshot.val();
        if (offer) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            
            // Create and send answer
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            // Send answer back
            firebase.database().ref('answers').set({
                type: answer.type,
                sdp: answer.sdp
            });
        }
    });
}