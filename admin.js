(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  let secret = "", summary;
  const date = (v) => new Date(v).toLocaleString("pt-BR");
  const duration = (v) => `${Math.floor(v / 60000)} min ${Math.floor(v / 1000) % 60}s`;
  const words = { care_attempt: "Tentativa de cuidado", care_success: "Cuidado realizado", care_blocked: "Cuidado recusado", hatched: "Nascimento", grew: "Crescimento", new_egg: "Novo ovo", closet_open: "Abriu o armário", collection_open: "Abriu a coleção", equip: "Roupa/brinquedo", egg_attempt: "Tentou aquecer", need_low: "Necessidade baixa", feed: "Alimentar", drink: "Beber", bath: "Banho", pet: "Carinho", sleep: "Dormir", wake: "Acordar", heal: "Curar", play: "Brincar", sleeping: "Dormindo", busy: "Ação em andamento", already_full: "Já satisfeito", already_awake: "Já acordado", healthy: "Já saudável", tired: "Cansado", sick: "Doente", hunger: "Fome", thirst: "Sede", hygiene: "Higiene", love: "Carinho", energy: "Energia", health: "Saúde" };
  const translate = (v) => words[v] || v || "—";
  function table(id, headings, rows) {
    const t = document.createElement("table"), head = t.createTHead().insertRow();
    headings.forEach(h => { const th = document.createElement("th"); th.textContent = h; head.append(th); });
    const body = t.createTBody();
    rows.forEach(row => { const tr = body.insertRow(); row.forEach(value => { const cell = tr.insertCell(); if (value instanceof Node) cell.append(value); else cell.textContent = value ?? "—"; }); });
    if (!rows.length) { const cell = body.insertRow().insertCell(); cell.colSpan = headings.length; cell.textContent = "Ainda sem dados."; }
    $(id).replaceChildren(t);
  }
  function logout() { secret = ""; $("password").value = ""; $("dashboard").hidden = true; $("logout").hidden = true; $("login").hidden = false; $("detail").hidden = true; summary = null; }
  async function api(route) {
    const response = await fetch(`/api/admin/${route}`, { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" });
    if (!response.ok) {
      if (response.status === 401) { logout(); throw Error("Senha incorreta."); }
      if (response.status === 503) throw Error("Configure ADMIN_PASSWORD no EasyPanel com pelo menos 16 caracteres.");
      throw Error(`Não foi possível consultar os dados (${response.status}).`);
    }
    return response.json();
  }
  async function detail(id) {
    try {
      const data = await api(`player?id=${encodeURIComponent(id)}`);
      $("detail").hidden = false;
      $("detailTitle").textContent = `${data.player.nickname} · ${data.player.id}`;
      table("sessions", ["Entrada", "Último sinal", "Tempo ativo"], data.sessions.map(s => [date(s.started_at), date(s.last_seen), duration(s.active_ms)]));
      table("pets", ["Nome", "Espécie", "Fase", "Saúde", "Pausado"], data.pets.map(p => [p.name, p.speciesId, ["Ovo", "Bebê", "Criança", "Jovem", "Adulto"][p.stage], `${Math.round(p.needs.health)}%`, p.frozen ? "Sim" : "Não"]));
      table("events", ["Recebido em", "Evento", "Ação", "Espécie", "Motivo"], data.events.map(e => [date(e.created_at), translate(e.type), translate(e.action), e.species, translate(e.reason)]));
      $("detail").scrollIntoView({ behavior: "smooth" });
    } catch (e) { $("status").textContent = e.message; }
  }
  async function load() {
    try {
      summary = await api("summary");
      $("status").textContent = `Atualizado em ${new Date().toLocaleTimeString("pt-BR")}`;
      $("login").hidden = true; $("dashboard").hidden = false; $("logout").hidden = false; $("password").value = "";
      $("totals").replaceChildren();
      for (const [title, value] of [["Jogadores", summary.totals.players], ["Sessões", summary.totals.sessions], ["Tempo ativo", duration(summary.totals.activeMs)], ["PIXELS salvos", summary.totals.pets]]) {
        const card = document.createElement("div"), number = document.createElement("strong");
        card.className = "card"; number.textContent = value; card.append(number, document.createTextNode(title)); $("totals").append(card);
      }
      table("players", ["Apelido", "ID", "Cadastro", "Último acesso", "Sessões", "Tempo ativo", "PIXELS"], summary.players.map(p => {
        const button = document.createElement("button"); button.textContent = p.nickname; button.onclick = () => detail(p.id);
        return [button, p.id.slice(0, 8), date(p.created_at), date(p.last_seen), p.sessions, duration(p.activeMs), p.pets];
      }));
      table("ranking", ["Posição", "Criador", "Adultos", "PIXELS"], [...summary.players].sort((a,b) => b.adults - a.adults || b.pets - a.pets || a.created_at - b.created_at).filter(p => p.pets).slice(0,20).map((p,i) => [i+1,p.nickname,p.adults,p.pets]));
      table("actions", ["Evento", "Ação", "Motivo", "Quantidade"], summary.actions.map(a => [translate(a.type),translate(a.action),translate(a.reason),a.count]));
      table("daily", ["Dia UTC", "Jogadores", "Sessões", "Tempo ativo"], summary.daily.map(d => [d.day,d.players,d.sessions,duration(d.activeMs)]));
    } catch (e) { $("status").textContent = e.message; }
  }
  $("login").addEventListener("submit", e => { e.preventDefault(); secret = $("password").value; load(); });
  $("logout").onclick = logout; $("refresh").onclick = load;
  $("export").onclick = () => {
    if (!summary) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(summary,null,2)], {type:"application/json"}));
    const a = document.createElement("a"); a.href = url; a.download = `pixels-resumo-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
  };
})();
