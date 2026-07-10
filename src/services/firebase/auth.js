import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  getAdditionalUserInfo,
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

// Login/cadastro com Google — passo 1: só autentica no Firebase Auth.
// NÃO grava nada no Firestore ainda. Quem chamar isso precisa checar
// `isNewUser`: se for true, o cadastro só deve ser considerado
// concluído depois que a pessoa aceitar os Termos de Uso (chamando
// concluirCadastroGoogle). Se for false, é alguém que já tinha conta
// e já aceitou os termos antes — pode liberar o acesso direto.
export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const info = getAdditionalUserInfo(result);
  return { user: result.user, isNewUser: Boolean(info?.isNewUser) };
}

// Login/cadastro com Google — passo 2: só é chamado depois que a
// pessoa aceitou os Termos de Uso na tela de boas-vindas do Google.
// Aí sim gravamos o documento em usuarios/{uid}.
export async function concluirCadastroGoogle(user) {
  await saveUserToFirestore(user, user.displayName);
}

// Chamado quando a pessoa clica em "Cancelar e voltar" na tela de
// aceite de termos do Google. Como o Firebase Auth já criou a conta
// no momento do popup (mesmo sem termos aceitos e sem documento no
// Firestore), removemos essa conta órfã para não deixar lixo para
// trás. Se a exclusão falhar por qualquer motivo, ao menos
// deslogamos, para a pessoa não ficar presa numa sessão sem perfil.
export async function cancelarCadastroGoogle() {
  if (!auth.currentUser) return;
  try {
    await auth.currentUser.delete();
  } catch {
    await auth.signOut();
  }
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