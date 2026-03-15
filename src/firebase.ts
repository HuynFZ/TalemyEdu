// src/firebase.js
import { initializeApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyCRCPB8npB2WHEN2b-3hDZ68x0E4AH2eP0",
    authDomain: "talemyedu-ef95b.firebaseapp.com",
    projectId: "talemyedu-ef95b",
    storageBucket: "talemyedu-ef95b.firebasestorage.app",
    messagingSenderId: "395878644714",
    appId: "1:395878644714:web:41a9135491a5f18ce9d993"
};

const app: FirebaseApp = initializeApp(firebaseConfig);
export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);
export const googleProvider: GoogleAuthProvider = new GoogleAuthProvider();