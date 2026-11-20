(() => {
  const CFG = window.SITE_CONFIG;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const val = (row, key) => String(row[key] ?? "").trim();
  const yes = (v) => v !== "" && !/^(無|なし|無し|-|ー|false|no|×|不可|0)$/i.test(v);
  const safeUrl = (u) => (/^https?:\/\//i.test(u) ? u : "");

  // "A1" "Ａ－０１" "a-01" → "A-01"、"A-07,08" → ["A-07","A-08"]
  function expandSpaces(raw) {
    const s = String(raw || "").normalize("NFKC").toUpperCase().replace(/[‐－ー−]/g, "-");
    let prefix = "";
    return s.split(/[,、・\/&＆]/).map((p) => p.trim()).filter(Boolean).map((p) => {
      const m = p.match(/^([A-Z぀-ヿ一-鿿]*)\s*-?\s*(\d+)([AB]?)$/);
      if (!m) return p;
      if (m[1]) prefix = m[1];
      return `${prefix}-${m[2].padStart(2, "0")}${m[3]}`;
    });
  }

  function twitterUrl(v) {
    if (!v) return "";
    if (/^https?:\/\//.test(v)) return v;
    return "https://x.com/" + v.replace(/^@/, "");
  }
  function cutUrl(v) {
    if (!v) return "";
    if (/^https?:\/\//.test(v)) return v;
    return CFG.cutBasePath + v;
  }

  async function loadCsv(url, fallback) {
    const tryUrl = async (u) => {
      // スプレッドシートのキャッシュ回避
      const bust = u.includes("?") ? `&_=${Date.now()}` : `?_=${Date.now()}`;
      const res = await fetch(u + bust);
      if (!res.ok) throw new Error(res.status);
      return Papa.parse(await res.text(), { header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim() }).data;
    };
    if (url) {
      try { return await tryUrl(url); } catch (e) { console.warn("CSV読込失敗、サンプルを使用", e); }
    }
    return tryUrl(fallback);
  }

  // 1サークル=複数行（2行目以降はサークル情報空欄、頒布物だけ）という形式を解釈
  function buildCircles(rows) {
    const circles = [];
    let cur = null;
    for (const r of rows) {
      if (val(r, "スペース") || val(r, "サークル名")) {
        cur = {
          cut: cutUrl(val(r, "サークルカット")),
          spaceRaw: val(r, "スペース"),
          spaces: expandSpaces(val(r, "スペース")),
          name: val(r, "サークル名"),
          url: val(r, "サークルURL"),
          owner: val(r, "代表者名"),
          twitter: twitterUrl(val(r, "Twitter")),
          twitterId: val(r, "Twitter").replace(/^https?:\/\/(x|twitter)\.com\//, "").replace(/^@/, ""),
          pixiv: val(r, "Pixiv"),
          other1: val(r, "その他1"),
          other2: val(r, "その他2"),
          pay: val(r, "電子決済"),
          menu: val(r, "お品書き"),
          notice: val(r, "告知"),
          r18: yes(val(r, "R-18")),
          updated: val(r, "更新日時"),
          items: [],
        };
        circles.push(cur);
      }
      if (cur && val(r, "頒布物")) {
        cur.items.push({
          name: val(r, "頒布物"), kind: val(r, "種別"), status: val(r, "新/既"),
          price: val(r, "価格"), sample: val(r, "見本等"), note: val(r, "備考"),
        });
        if (val(r, "更新日時") > cur.updated) cur.updated = val(r, "更新日時");
      }
    }
    for (const c of circles) {
      c.hasNew = c.items.some((i) => i.status.includes("新"));
      c.text = [c.spaceRaw, ...c.spaces, c.name, c.owner, c.twitterId, ...c.items.flatMap((i) => [i.name, i.kind, i.note])].join(" ").normalize("NFKC").toLowerCase();
    }
    return circles;
  }

  let circles = [], layout = [], bySpace = new Map();

  function filtered() {
    const q = $("#q").value.normalize("NFKC").toLowerCase().trim();
    const fNew = $("#f-new").checked, fPay = $("#f-pay").checked, fR18 = $("#f-r18").checked, kind = $("#f-kind").value;
    return circles.filter((c) =>
      (!q || q.split(/\s+/).every((w) => c.text.includes(w))) &&
      (!fNew || c.hasNew) &&
      (!fPay || yes(c.pay)) &&
      (fR18 || !c.r18) &&
      (!kind || c.items.some((i) => i.kind === kind)));
  }

  const cutHtml = (c) => c.cut
    ? `<img class="cut" src="${esc(c.cut)}" alt="${esc(c.name)} サークルカット" loading="lazy">`
    : `<div class="cut">${esc(c.spaceRaw)}</div>`;
  const statusBadge = (s) => s.includes("新") ? `<span class="badge b-new">${esc(s)}</span>` : s ? `<span class="badge b-old">${esc(s)}</span>` : "";

  function renderList() {
    const list = filtered();
    $("#view-list").innerHTML = list.map((c, i) => `
      <article class="card" data-idx="${circles.indexOf(c)}">
        ${cutHtml(c)}
        <div>
          <span class="space">${esc(c.spaceRaw)}</span>
          ${c.r18 ? '<span class="badge b-r18">R-18</span>' : ""}
          ${yes(c.pay) ? '<span class="badge b-pay">電子決済</span>' : ""}
          <h2>${esc(c.name)}</h2>
          <div style="font-size:.85rem">${esc(c.owner)}</div>
          <ul class="items-mini">${c.items.slice(0, 4).map((i) => `<li>${statusBadge(i.status)}${esc(i.name)}</li>`).join("")}${c.items.length > 4 ? `<li>…他${c.items.length - 4}件</li>` : ""}</ul>
        </div>
      </article>`).join("") || "<p>該当するサークルがありません。</p>";
    $("#status").textContent = `${list.length} / ${circles.length} サークル`;
  }

  function renderMap() {
    const hits = new Set(filtered());
    const anyFilter = hits.size !== circles.length;
    if (!layout.length) { $("#map-wrap").textContent = "配置データがありません"; return; }
    const maxX = Math.max(...layout.map((l) => l.x + l.w)), maxY = Math.max(...layout.map((l) => l.y + l.h));
    const minX = Math.min(...layout.map((l) => l.x)), minY = Math.min(...layout.map((l) => l.y));
    const g = layout.map((l) => {
      if (!l.space) {
        return `<g class="m-label"><rect x="${l.x + .04}" y="${l.y + .04}" width="${l.w - .08}" height="${l.h - .08}" rx=".08"/><text x="${l.x + l.w / 2}" y="${l.y + l.h / 2}">${esc(l.label)}</text></g>`;
      }
      const c = bySpace.get(l.space);
      const cls = ["m-space", c && "has", c && anyFilter && hits.has(c) && "hit", c && anyFilter && !hits.has(c) && "dim"].filter(Boolean).join(" ");
      const name = c ? c.name.length > 7 ? c.name.slice(0, 7) + "…" : c.name : "";
      return `<g class="${cls}" data-space="${esc(l.space)}"${c ? ` tabindex="0" role="button" aria-label="${esc(l.space)} ${esc(c.name)}"` : ""}>
        <rect x="${l.x + .03}" y="${l.y + .03}" width="${l.w - .06}" height="${l.h - .06}" rx=".06"/>
        <text x="${l.x + l.w / 2}" y="${l.y + l.h / 2 - (name ? .12 : 0)}">${esc(l.label || l.space)}</text>
        ${name ? `<text class="m-name" x="${l.x + l.w / 2}" y="${l.y + l.h / 2 + .18}">${esc(name)}</text>` : ""}
        <title>${esc(l.space)} ${esc(c?.name || "")}</title></g>`;
    }).join("");
    $("#map-wrap").innerHTML = `<svg viewBox="${minX - .2} ${minY - .2} ${maxX - minX + .4} ${maxY - minY + .4}" xmlns="http://www.w3.org/2000/svg">${g}</svg>`;
  }

  function linkList(c) {
    const links = [
      ["サークルサイト", c.url], ["X (Twitter)", c.twitter], ["Pixiv", c.pixiv],
      ["リンク1", c.other1], ["リンク2", c.other2], ["お品書き", c.menu], ["告知", c.notice],
    ].filter(([, u]) => safeUrl(u));
    return `<ul class="links">${links.map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${t}</a></li>`).join("")}</ul>`;
  }

  function openDetail(c) {
    const link = (u, t) => safeUrl(u) ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>` : esc(u);
    $("#detail-body").innerHTML = `
      <div class="d-head">
        ${cutHtml(c)}
        <div style="flex:1;min-width:200px">
          <span class="space">${esc(c.spaceRaw)}</span>
          ${c.r18 ? '<span class="badge b-r18">R-18あり</span>' : ""}
          <h2>${esc(c.name)}</h2>
          <dl class="meta">
            <dt>代表者</dt><dd>${esc(c.owner) || "-"}</dd>
            <dt>X</dt><dd>${c.twitterId ? link(c.twitter, "@" + c.twitterId) : "-"}</dd>
            <dt>電子決済</dt><dd>${esc(c.pay) || "-"}</dd>
          </dl>
          ${linkList(c)}
        </div>
      </div>
      <table class="items">
        <thead><tr><th>頒布物</th><th>種別</th><th>新/既</th><th>価格</th><th>見本等</th><th class="c-note">備考</th></tr></thead>
        <tbody>${c.items.map((i) => `<tr>
          <td>${esc(i.name)}</td><td>${esc(i.kind)}</td><td>${statusBadge(i.status)}</td>
          <td class="price">${i.price ? (/^\d+$/.test(i.price) ? "¥" + Number(i.price).toLocaleString() : esc(i.price)) : "-"}</td>
          <td>${i.sample ? link(i.sample, safeUrl(i.sample) ? "見本" : i.sample) : ""}</td>
          <td class="c-note">${esc(i.note)}</td></tr>`).join("") || '<tr><td colspan="6">頒布物情報はまだありません</td></tr>'}</tbody>
      </table>
      ${c.updated ? `<p class="updated">更新日時(目安)：${esc(c.updated)}</p>` : ""}`;
    history.replaceState(null, "", "#" + encodeURIComponent(c.spaces[0] || c.name));
    $("#detail").showModal();
  }

  function setView(v) {
    document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.view === v));
    $("#view-list").hidden = v !== "list";
    $("#view-map").hidden = v !== "map";
    try { localStorage.setItem("view", v); } catch {}
  }

  function rerender() { renderList(); renderMap(); }

  async function init() {
    document.title = CFG.title;
    $("#site-title").textContent = CFG.title;
    $("#status").textContent = "読み込み中…";
    const [cRows, lRows] = await Promise.all([
      loadCsv(CFG.circlesCsvUrl, CFG.fallbackCirclesCsv),
      loadCsv(CFG.layoutCsvUrl, CFG.fallbackLayoutCsv).catch(() => []),
    ]);
    circles = buildCircles(cRows);
    for (const c of circles) for (const s of c.spaces) bySpace.set(s, c);
    layout = lRows.map((r) => ({
      space: expandSpaces(val(r, "スペース"))[0] || "",
      x: +val(r, "x") || 0, y: +val(r, "y") || 0,
      w: +val(r, "幅") || 1, h: +val(r, "高さ") || 1, label: val(r, "ラベル"),
    }));
    const kinds = [...new Set(circles.flatMap((c) => c.items.map((i) => i.kind)).filter(Boolean))];
    $("#f-kind").insertAdjacentHTML("beforeend", kinds.map((k) => `<option>${esc(k)}</option>`).join(""));

    document.querySelectorAll(".filters input, .filters select").forEach((el) => el.addEventListener("input", rerender));
    document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
    $("#view-list").addEventListener("click", (e) => { const card = e.target.closest(".card"); if (card) openDetail(circles[card.dataset.idx]); });
    const mapOpen = (e) => { const g = e.target.closest(".m-space.has"); if (g) openDetail(bySpace.get(g.dataset.space)); };
    $("#map-wrap").addEventListener("click", mapOpen);
    $("#map-wrap").addEventListener("keydown", (e) => { if (e.key === "Enter") mapOpen(e); });
    $("#detail .close").addEventListener("click", () => $("#detail").close());
    $("#detail").addEventListener("click", (e) => { if (e.target.id === "detail") $("#detail").close(); });
    $("#detail").addEventListener("close", () => history.replaceState(null, "", location.pathname));

    let saved = "list"; try { saved = localStorage.getItem("view") || "list"; } catch {}
    setView(saved);
    rerender();
    // URL末尾 #A-01 で直接そのサークルを開ける（共有用）
    const h = decodeURIComponent(location.hash.slice(1));
    if (h) { const c = bySpace.get(expandSpaces(h)[0]) || circles.find((x) => x.name === h); if (c) openDetail(c); }
  }

  init().catch((e) => { $("#status").textContent = "データの読み込みに失敗しました：" + e.message; });
})();
