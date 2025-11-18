// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA46Mns2JS1tAm1ur04VjNlxjkYgZDDKnY",
  authDomain: "result-analysis-84b82.firebaseapp.com",
  projectId: "result-analysis-84b82",
  storageBucket: "result-analysis-84b82.firebasestorage.app",
  messagingSenderId: "425537810324",
  appId: "1:425537810324:web:dd20ed8ee04b9f152c6981",
  measurementId: "G-K83CTVCC6Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, analytics, db, storage };
