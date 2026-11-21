/* Mural de oração ao vivo (Neon Realtime). Gerado em js/mural-live.js por `npm run build`.
 * site.js importa este módulo e passa uma função que redesenha o mural. */
import { createRealtimeClient, type SealedLiveQuery } from "@neon/realtime/client";

type Linha = { id: string; autor_publico: string; pedido: string; criado_em: Date; oracoes: number };
export type Pedido = { id: string; autor: string; texto: string; data: string; oracoes: number };

const RENOVA_ANTES = 10_000;
const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });

export function iniciar(apiUrl: string, realtimeUrl: string, aoMudar: (lista: Pedido[]) => void, aoFalhar: () => void): () => void {
  const client = createRealtimeClient({ url: realtimeUrl });
  const selar = (): Promise<SealedLiveQuery<Linha>> =>
    fetch(apiUrl.replace(/\/$/, "") + "/mural/live", { method: "POST" }).then((r) => {
      if (!r.ok) throw new Error("selar " + r.status);
      return r.json();
    });

  let parado = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let parar = () => {};

  selar().then((sealed) => {
    if (parado) return;
    const sub = client.subscribe(sealed);
    sub.onChange((s) => {
      if (s.status === "error") { aoFalhar(); return; }
      if (!s.data) return;
      aoMudar(s.data.map((r) => ({ id: String(r.id), autor: r.autor_publico, texto: r.pedido, data: fmt.format(r.criado_em), oracoes: r.oracoes })));
    });
    const agenda = (expira: number, atraso?: number) => {
      clearTimeout(timer);
      if (!parado) timer = setTimeout(renovar, atraso ?? Math.max(0, expira - Date.now() - RENOVA_ANTES));
    };
    // Falha ao buscar: tenta de novo em 1s. Renovação recusada: a assinatura acabou (o onChange já avisou).
    const renovar = () => selar().then(
      (n) => { agenda(n.expiresAt); sub.renew(n).catch(() => { parado = true; clearTimeout(timer); }); },
      () => agenda(0, 1000),
    );
    agenda(sealed.expiresAt);
    parar = () => sub.unsubscribe();
  }, aoFalhar);

  const fim = () => { parado = true; clearTimeout(timer); parar(); client.close(); };
  window.addEventListener("pagehide", fim);
  return fim;
}
