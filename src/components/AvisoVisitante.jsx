// Faixa informativa exibida no topo das telas quando estão sendo
// visualizadas em modo visitante (somente leitura), deixando claro de
// quem são os dados exibidos.
export default function AvisoVisitante({ nomeDono }) {
  return (
    <div className="aviso-visitante">
      Você está vendo os dados de <strong>{nomeDono || "..."}</strong> — modo somente leitura.
    </div>
  );
}