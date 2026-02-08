import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyAwKWgZxQJIrOpbOiJQNynas8-KvrdWwjk",
  authDomain: "contractmap-485fd.firebaseapp.com",
  projectId: "contractmap-485fd",
  storageBucket: "contractmap-485fd.firebasestorage.app",
  messagingSenderId: "957341380540",
  appId: "1:957341380540:web:21a12a8e06b2009aa605b9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
