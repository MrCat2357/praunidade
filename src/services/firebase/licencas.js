import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { db, storage } from "./config";

// ─── FUNCIONÁRIOS ────────────────────────────────────────────────────────────

// Busca funcionário pelo nome exato + donoUid.
// Se não existir, cria e retorna o novo id.
export async function buscarOuCriarFuncionario(nome, donoUid) {
  const nomeLimpo = nome.trim();
  const q = query(
    collection(db, "funcionarios"),
    where("donoUid", "==", donoUid),
    where("nome", "==", nomeLimpo)
  );
  const snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].id;

  const novo = await addDoc(collection(db, "funcionarios"), {
    nome: nomeLimpo,
    donoUid,
    criadoEm: serverTimestamp(),
  });
  return novo.id;
}

// Lista funcionários do usuário em ordem alfabética
export async function listarFuncionarios(donoUid) {
  const q = query(
    collection(db, "funcionarios"),
    where("donoUid", "==", donoUid),
    orderBy("nome", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── LICENÇAS ─────────────────────────────────────────────────────────────────

// Cadastra uma nova licença.
// dados: { funcionarioId, nomeFunc, donoUid, dataInicio, dataFim, cid, arquivoURL? }
// dataInicio e dataFim chegam como string "YYYY-MM-DD" e são convertidas para Timestamp.
export async function cadastrarLicenca(dados) {
  const ref_ = await addDoc(collection(db, "licencas"), {
    funcionarioId: dados.funcionarioId,
    nomeFunc: dados.nomeFunc,
    donoUid: dados.donoUid,
    dataInicio: Timestamp.fromDate(new Date(dados.dataInicio + "T00:00:00")),
    dataFim: Timestamp.fromDate(new Date(dados.dataFim + "T00:00:00")),
    cid: dados.cid.trim(),
    arquivoURL: dados.arquivoURL || "",
    oculto: false,
    criadoEm: serverTimestamp(),
  });
  return ref_.id;
}

// Lista licenças não ocultas do usuário, ordenadas por dataInicio decrescente
export async function listarLicencas(donoUid) {
  const q = query(
    collection(db, "licencas"),
    where("donoUid", "==", donoUid),
    where("oculto", "==", false),
    orderBy("dataInicio", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Busca uma licença específica pelo id
export async function buscarLicenca(licencaId) {
  const snap = await getDoc(doc(db, "licencas", licencaId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// Edita os campos de uma licença existente
export async function editarLicenca(licencaId, dados) {
  const licencaRef = doc(db, "licencas", licencaId);
  await updateDoc(licencaRef, {
    nomeFunc: dados.nomeFunc,
    dataInicio: Timestamp.fromDate(new Date(dados.dataInicio + "T00:00:00")),
    dataFim: Timestamp.fromDate(new Date(dados.dataFim + "T00:00:00")),
    cid: dados.cid.trim(),
    arquivoURL: dados.arquivoURL || "",
  });
}

// Marca a licença como oculta (não exclui)
export async function ocultarLicenca(licencaId) {
  await updateDoc(doc(db, "licencas", licencaId), { oculto: true });
}

// ─── STORAGE ──────────────────────────────────────────────────────────────────

// Faz upload do arquivo e retorna a URL pública
export async function uploadArquivoLicenca(file, donoUid) {
  const timestamp = Date.now();
  const nomeSeguro = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const caminho = `licencas/${donoUid}/${timestamp}_${nomeSeguro}`;
  const storageRef = ref(storage, caminho);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

// ─── UTILITÁRIOS ─────────────────────────────────────────────────────────────

// Converte Timestamp do Firestore para string dd/mm/aaaa
export function formatarData(timestamp) {
  if (!timestamp) return "";
  const data = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return data.toLocaleDateString("pt-BR");
}

// Converte Timestamp do Firestore para string "YYYY-MM-DD" (para input type="date")
export function timestampParaInputDate(timestamp) {
  if (!timestamp) return "";
  const data = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return data.toISOString().split("T")[0];
}