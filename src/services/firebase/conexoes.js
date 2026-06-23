import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  arrayUnion,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

// Busca usuários pelo nome (busca parcial, case-insensitive).
// Como o Firestore não suporta "contains" nativamente, buscamos todos os
// usuários e filtramos no cliente. Funciona bem para o estágio atual do
// projeto; se a base de usuários crescer muito, vale revisar essa abordagem
// (ex.: usar um serviço de busca como Algolia ou manter um campo normalizado
// com tokens de busca).
export async function buscarUsuariosPorNome(nomeBusca, meuUid) {
  const termo = nomeBusca.trim().toLowerCase();
  if (!termo) return [];

  const snap = await getDocs(collection(db, "usuarios"));
  const resultados = [];

  snap.forEach((docSnap) => {
    const dados = docSnap.data();
    if (docSnap.id === meuUid) return; // não retorna o próprio usuário
    const nome = (dados.nome || "").toLowerCase();
    if (nome.includes(termo)) {
      resultados.push({ uid: docSnap.id, ...dados });
    }
  });

  // Ordena por nome para que resultados com nomes iguais (homônimos)
  // fiquem agrupados visualmente na lista, facilitando a comparação.
  resultados.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

  return resultados;
}

// Cria uma solicitação de conexão, evitando duplicar uma já existente
// (em qualquer direção, com status pendente).
export async function enviarSolicitacao(deUid, paraUid) {
  const solicitacoesRef = collection(db, "solicitacoes");

  const jaEnviei = await getDocs(
    query(
      solicitacoesRef,
      where("deUid", "==", deUid),
      where("paraUid", "==", paraUid),
      where("status", "==", "pendente")
    )
  );
  if (!jaEnviei.empty) {
    throw new Error("Você já enviou uma solicitação para essa pessoa.");
  }

  const jaRecebi = await getDocs(
    query(
      solicitacoesRef,
      where("deUid", "==", paraUid),
      where("paraUid", "==", deUid),
      where("status", "==", "pendente")
    )
  );
  if (!jaRecebi.empty) {
    throw new Error("Essa pessoa já te enviou uma solicitação. Veja em pendentes.");
  }

  const novaSolicitacaoRef = doc(solicitacoesRef);
  await setDoc(novaSolicitacaoRef, {
    deUid,
    paraUid,
    status: "pendente",
    criadoEm: serverTimestamp(),
  });

  return novaSolicitacaoRef.id;
}

// Lista solicitações pendentes recebidas pelo usuário logado, já com os
// dados básicos (nome, foto) de quem enviou.
export async function listarSolicitacoesPendentes(meuUid) {
  const solicitacoesRef = collection(db, "solicitacoes");
  const snap = await getDocs(
    query(
      solicitacoesRef,
      where("paraUid", "==", meuUid),
      where("status", "==", "pendente")
    )
  );

  const solicitacoes = [];
  for (const docSnap of snap.docs) {
    const dados = docSnap.data();
    const remetenteSnap = await getDoc(doc(db, "usuarios", dados.deUid));
    solicitacoes.push({
      id: docSnap.id,
      ...dados,
      remetente: remetenteSnap.exists() ? remetenteSnap.data() : null,
    });
  }

  return solicitacoes;
}

// Aceita uma solicitação: marca como aceita e adiciona o uid de cada um
// no array "conexoes" do outro, em uma única operação atômica.
export async function aceitarSolicitacao(solicitacaoId, deUid, paraUid) {
  const batch = writeBatch(db);

  const solicitacaoRef = doc(db, "solicitacoes", solicitacaoId);
  batch.update(solicitacaoRef, { status: "aceita" });

  const usuarioDeRef = doc(db, "usuarios", deUid);
  batch.update(usuarioDeRef, { conexoes: arrayUnion(paraUid) });

  const usuarioParaRef = doc(db, "usuarios", paraUid);
  batch.update(usuarioParaRef, { conexoes: arrayUnion(deUid) });

  await batch.commit();
}

// Recusa uma solicitação (não exclui, apenas marca o status).
export async function recusarSolicitacao(solicitacaoId) {
  const solicitacaoRef = doc(db, "solicitacoes", solicitacaoId);
  await updateDoc(solicitacaoRef, { status: "recusada" });
}

// Verifica se dois usuários estão conectados, consultando o array
// "conexoes" do primeiro usuário.
export async function estaoConectados(uidA, uidB) {
  const usuarioRef = doc(db, "usuarios", uidA);
  const snap = await getDoc(usuarioRef);
  if (!snap.exists()) return false;
  const conexoes = snap.data().conexoes || [];
  return conexoes.includes(uidB);
}

// Retorna a lista de conexões já aprovadas do usuário logado, com os
// dados básicos (nome, foto) de cada uma.
export async function listarConexoes(meuUid) {
  const usuarioRef = doc(db, "usuarios", meuUid);
  const snap = await getDoc(usuarioRef);
  if (!snap.exists()) return [];

  const conexoesUids = snap.data().conexoes || [];
  const conexoes = [];

  for (const uid of conexoesUids) {
    const conexaoSnap = await getDoc(doc(db, "usuarios", uid));
    if (conexaoSnap.exists()) {
      conexoes.push({ uid, ...conexaoSnap.data() });
    }
  }

  return conexoes;
}