if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
        .then(function (registration) {
            console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch(function (error) {
            console.log('Service Worker registration failed:', error);
        });
}

let stream;
let gpsWatchId;

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
        }, (error) => {
            console.error('GPS Error:', error);
            document.getElementById('gpsData').innerText = 'GPS Error: Unable to retrieve location.';
        });
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
    }, (error) => {
        console.error('GPS Tracking Error:', error);
        document.getElementById('gpsData').innerText = 'GPS Tracking Error: Unable to track location.';
    });
});

document.getElementById('stopGpsButton').addEventListener('click', () => {
    if (gpsWatchId) {
        navigator.geolocation.clearWatch(gpsWatchId);
        console.log('GPS Tracking stopped.');
        document.getElementById('gpsData').innerText = 'GPS Data: Not Available';
    }
});
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch((error) => {
                console.log('Service Worker registration failed:', error);
            });
    });
}
