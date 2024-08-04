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
  apiKey: "AIzaSyC9O9Gc-CnKvGwTgS2jDlD4prpPOfERuoU",
  authDomain: "pantryapp-f517a.firebaseapp.com",
  projectId: "pantryapp-f517a",
  storageBucket: "pantryapp-f517a.appspot.com",
  messagingSenderId: "265265321358",
  appId: "1:265265321358:web:9719f4cf84b2562973c0df",
  measurementId: "G-JN88G1C596"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const firestore = getFirestore(app);
const storage = getStorage(app);

export { analytics, firestore, storage };

