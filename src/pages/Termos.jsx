import { useNavigate } from "react-router-dom";
import "./Termos.css";

export default function Termos() {
  const navigate = useNavigate();

  return (
    <div className="termos-bg">
      <div className="termos-container">
        <button className="termos-link-voltar" onClick={() => navigate(-1)}>
          ← Voltar
        </button>

        <h1 className="termos-titulo">Termos de Uso</h1>
        <p className="termos-atualizado">Última atualização: junho de 2026</p>

        <section className="termos-secao">
          <h2 className="termos-secao-titulo">1. Sobre o PraUnidade</h2>
          <p className="termos-texto">
            O PraUnidade é uma ferramenta de apoio para acompanhamento de
            licenças médicas e da regra dos 60 dias do INSS. Ele não substitui
            orientação médica, jurídica ou de recursos humanos, servindo apenas
            como um auxílio organizacional para quem o utiliza.
          </p>
        </section>

        <section className="termos-secao">
          <h2 className="termos-secao-titulo">2. Cadastro e conta</h2>
          <p className="termos-texto">
            Para usar o PraUnidade, você precisa criar uma conta com seu e-mail
            ou com sua conta Google. Você é responsável por manter os dados da
            sua conta atualizados e por proteger o acesso à sua senha.
          </p>
        </section>

        <section className="termos-secao">
          <h2 className="termos-secao-titulo">3. Conexões entre usuários</h2>
          <p className="termos-texto">
            O PraUnidade permite que você se conecte com outras pessoas para
            compartilhar informações de acompanhamento. Essa conexão só
            acontece quando as duas partes aceitam: enviar uma solicitação não
            garante acesso automático aos dados de ninguém, e qualquer pessoa
            pode recusar uma solicitação recebida.
          </p>
          <p className="termos-texto">
            Você pode encerrar uma conexão existente quando quiser, e os dados
            compartilhados deixam de ficar visíveis para a outra pessoa a
            partir desse momento.
          </p>
        </section>

        <section className="termos-secao">
          <h2 className="termos-secao-titulo">4. Privacidade dos dados</h2>
          <p className="termos-texto">
            As informações que você cadastra (nome, e-mail, foto e dados de
            licenças, quando aplicável) são usadas exclusivamente para o
            funcionamento do aplicativo e para exibição às pessoas com quem
            você está conectado. Não compartilhamos seus dados com terceiros
            para fins de publicidade.
          </p>
        </section>

        <section className="termos-secao">
          <h2 className="termos-secao-titulo">5. Uso adequado</h2>
          <p className="termos-texto">
            Você se compromete a usar o PraUnidade de forma honesta, sem
            inserir informações falsas sobre licenças médicas ou sobre
            terceiros, e a respeitar a privacidade das pessoas com quem se
            conecta.
          </p>
        </section>

        <section className="termos-secao">
          <h2 className="termos-secao-titulo">6. Alterações nestes termos</h2>
          <p className="termos-texto">
            Este texto pode ser atualizado conforme o aplicativo evolui. Caso
            haja mudanças relevantes, faremos um esforço razoável para
            avisar você antes de pedir um novo aceite.
          </p>
        </section>

        <p className="termos-rodape">
          Este é um texto-base inicial para fins de desenvolvimento do
          aplicativo e ainda não foi revisado juridicamente.
        </p>
      </div>
    </div>
  );
}