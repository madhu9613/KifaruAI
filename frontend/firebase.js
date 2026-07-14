// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GithubAuthProvider, GoogleAuthProvider } from "firebase/auth";


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey:import.meta.env.VITE_FIREBASE_API_KEY ,
  authDomain: "agent-c6eae.firebaseapp.com",
  projectId: "agent-c6eae",
  storageBucket: "agent-c6eae.firebasestorage.app",
  messagingSenderId: "734578430997",
  appId: "1:734578430997:web:ad7871e046572154c4ea1c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth=getAuth(app)
export const googleProvider =
  new GoogleAuthProvider();

export const githubProvider =
  new GithubAuthProvider();