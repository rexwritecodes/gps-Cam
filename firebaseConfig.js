// Your web app's Firebase configuration
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyANTZhaOhUUcgMw8nhAbOX4nlYxk5MKRVY",
    authDomain: "gps-cam-000.firebaseapp.com",
    projectId: "gps-cam-000",
    storageBucket: "gps-cam-000.firebasestorage.app",
    messagingSenderId: "444599848098",
    appId: "1:444599848098:web:24eed0a379569e23ae1bfb",
    measurementId: "G-YE06DCJBKY"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

export const storage = firebase.storage(); 
const analytics = getAnalytics(app);



