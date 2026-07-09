import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  fetchSignInMethodsForEmail,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db } from "./config";

const googleProvider = new GoogleAuthProvider();
const storage = getStorage();

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

// Carrega os dados do perfil do Firestore
export async function carregarPerfil(uid) {
  const userRef = doc(db, "usuarios", uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() : null;
}

// Atualiza nome e bio no Firestore e o displayName no Firebase Auth
export async function atualizarPerfil(uid, nome, bio) {
  const userRef = doc(db, "usuarios", uid);
  await updateDoc(userRef, { nome, bio });
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName: nome });
  }
}

// Envia a nova foto de perfil para o Firebase Storage e já salva a
// URL pública no documento usuarios/{uid}. Só aceita imagens até 5MB.
export async function atualizarFotoPerfil(uid, arquivo) {
  if (!arquivo) throw new Error("Nenhum arquivo selecionado.");
  if (!arquivo.type.startsWith("image/")) {
    throw new Error("O arquivo precisa ser uma imagem (JPG, PNG etc.).");
  }
  const LIMITE_MB = 5;
  if (arquivo.size > LIMITE_MB * 1024 * 1024) {
    throw new Error(`A imagem deve ter no máximo ${LIMITE_MB}MB.`);
  }

  const caminho = `perfis/${uid}/${Date.now()}_${arquivo.name}`;
  const referencia = ref(storage, caminho);
  await uploadBytes(referencia, arquivo);
  const url = await getDownloadURL(referencia);

  await updateDoc(doc(db, "usuarios", uid), { foto: url });
  if (auth.currentUser && auth.currentUser.uid === uid) {
    await updateProfile(auth.currentUser, { photoURL: url });
  }

  return url;
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