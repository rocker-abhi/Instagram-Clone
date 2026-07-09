import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD0JktWc_W0jZ3NXNwHohdkKeKrDMQXpkI",
  authDomain: "instagram-clone-bef1e.firebaseapp.com",
  projectId: "instagram-clone-bef1e",
  storageBucket: "instagram-clone-bef1e.firebasestorage.app",
  messagingSenderId: "401487897617",
  appId: "1:401487897617:web:92393a5b1f2866c0733db0",
  measurementId: "G-L8XPNB933P",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
