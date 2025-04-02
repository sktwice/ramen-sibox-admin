import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBi03pGrUkrulFjIUe6Pd9KC3CZz-AvpBI",
  authDomain: "ramen-sibox-2b0d7.firebaseapp.com",
  projectId: "ramen-sibox-2b0d7",
  storageBucket: "ramen-sibox-2b0d7.firebasestorage.app",
  messagingSenderId: "182662563425",
  appId: "1:182662563425:web:ea3ab8faf2a2c30d29cc20"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export const loginWithEmailAndPassword = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

export { db, auth };