import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  fetchSignInMethodsForEmail,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./config";

const googleProvider = new GoogleAuthProvider();

// Verifica se email já tem cadastro
export async function checkEmailExists(email) {
  const methods = await fetchSignInMethodsForEmail(auth, email);
  return methods.length > 0;
}

// Login com email e senha
export async function loginWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

// Cadastro com email e senha
export async function registerWithEmail(email, password, displayName) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName });
  await saveUserToFirestore(result.user, displayName);
  return result.user;
}

// Login/cadastro com Google
export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  const userRef = doc(db, "usuarios", user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await saveUserToFirestore(user, user.displayName);
  }
  return user;
}

// Enviar email de redefinição de senha
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// Salvar/atualizar usuário no Firestore
async function saveUserToFirestore(user, displayName) {
  const userRef = doc(db, "usuarios", user.uid);
  await setDoc(
    userRef,
    {
      uid: user.uid,
      email: user.email,
      nome: displayName || user.displayName || "",
      foto: user.photoURL || "",
      conexoes: [],
      criadoEm: serverTimestamp(),
    },
    { merge: true }
  );
}