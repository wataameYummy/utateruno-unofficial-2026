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
          voice: val(r, "音源") || val(r, "使用音源"),
        });
        if (val(r, "更新日時") > cur.updated) cur.updated = val(r, "更新日時");
      }
    }
    for (const c of circles) {
      c.hasNew = c.items.some((i) => i.status.includes("新"));
      c.text = [c.spaceRaw, ...c.spaces, c.name, c.owner, c.twitterId, ...c.items.flatMap((i) => [i.name, i.kind, i.note, i.voice])].join(" ").normalize("NFKC").toLowerCase();
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

  // ===== 配置図 =====
  const view = { base: null, vb: null, moved: 0, focus: "" };
  const svgEl = () => $("#map-svg-host svg");

  function renderMap() {
    const hits = new Set(filtered());
    const anyFilter = hits.size !== circles.length;
    if (!layout.length) { $("#map-svg-host").textContent = "配置データがありません"; return; }
    const minX = Math.min(...layout.map((l) => l.x)), minY = Math.min(...layout.map((l) => l.y));
    const maxX = Math.max(...layout.map((l) => l.x + l.w)), maxY = Math.max(...layout.map((l) => l.y + l.h));
    const deco = layout.filter((l) => !l.space).map((l) => {
      if (l.color === "枠") return `<rect class="m-frame" x="${l.x}" y="${l.y}" width="${l.w}" height="${l.h}"/>`;
      const cx = l.x + l.w / 2, cy = l.y + l.h / 2, size = l.size || .6;
      const fs = ` style="font-size:${size}px"`;
      const vertical = l.h > l.w * 1.5 && l.label.length > 1;
      const text = !l.label ? "" : vertical
        ? [...l.label].map((ch, i, a) => `<text x="${cx}" y="${cy + (i - (a.length - 1) / 2) * size * 1.15}"${fs}>${esc(ch === "ー" ? "｜" : ch)}</text>`).join("")
        : `<text x="${cx}" y="${cy}"${fs}>${esc(l.label)}</text>`;
      let cls = "m-label", fill = l.color && l.color !== "none" ? l.color : "transparent";
      if (l.color === "点線") { cls += " m-dashed"; fill = "#fff"; }
      else if (/^(#?f{3}(f{3})?|white)$/i.test(l.color)) cls += " m-bldg";
      return `<g class="${cls}"><rect x="${l.x}" y="${l.y}" width="${l.w}" height="${l.h}" rx=".12" style="fill:${esc(fill)}"/>${text}</g>`;
    }).join("");
    const spaces = layout.filter((l) => l.space).map((l) => {
      const c = bySpace.get(l.space);
      const cls = ["m-space", c && "has", c && anyFilter && hits.has(c) && "hit", c && anyFilter && !hits.has(c) && "dim",
        view.focus && c && c.spaces.includes(view.focus) && "focus"].filter(Boolean).join(" ");
      const label = l.label || (l.w < 2 ? (l.space.split("-")[1] || l.space) : l.space);
      return `<g class="${cls}" data-space="${esc(l.space)}"${c ? ` tabindex="0" role="button" aria-label="${esc(l.space)} ${esc(c.name)}"` : ""}>
        <rect x="${l.x}" y="${l.y}" width="${l.w}" height="${l.h}"${l.color ? ` style="fill:${esc(l.color)}"` : ""}/>
        <text x="${l.x + l.w / 2}" y="${l.y + l.h / 2}">${esc(label)}</text>
      </g>`;
    }).join("");
    const base = { x: minX - .3, y: minY - .3, w: maxX - minX + .6, h: maxY - minY + .6 };
    const first = !view.base;
    view.base = base;
    $("#map-svg-host").innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">${deco}${spaces}</svg>`;
    if (first || !view.vb) view.vb = fitView();
    applyView();
  }

  // 表示枠（画面）の縦横比に合わせた初期表示
  function fitView(whole) {
    const b = view.base, svg = svgEl();
    const r = svg ? svg.getBoundingClientRect() : { width: 0, height: 0 };
    if (!r.width || !r.height) return { ...b };
    const ar = r.width / r.height;
    if (whole || ar >= (b.w / b.h) * .75) {
      // 全体が入るように（左右に余白）
      const h = Math.max(b.h, b.w / ar);
      return { x: b.x + b.w / 2 - (h * ar) / 2, y: b.y + b.h / 2 - h / 2, w: h * ar, h };
    }
    // 画面が縦長（スマホ）：高さに合わせ、中央のブロック付近を表示
    return { x: b.x + b.w / 2 - (b.h * ar) / 2, y: b.y, w: b.h * ar, h: b.h };
  }
  function applyView() {
    const svg = svgEl(); if (!svg || !view.vb) return;
    const b = view.base, v = view.vb;
    // 地図が画面外に行き過ぎないように
    const mx = Math.max(0, (v.w - b.w) / 2), my = Math.max(0, (v.h - b.h) / 2);
    v.x = Math.min(Math.max(v.x, b.x - mx - v.w * .3), b.x + b.w + mx - v.w * .7);
    v.y = Math.min(Math.max(v.y, b.y - my - v.h * .3), b.y + b.h + my - v.h * .7);
    svg.setAttribute("viewBox", `${v.x} ${v.y} ${v.w} ${v.h}`);
    $("#zoom-level").textContent = Math.round((fitView(true).w / v.w) * 100) + "%";
  }
  // 画面上の座標 → 地図の座標
  function toMap(clientX, clientY) {
    const r = svgEl().getBoundingClientRect(), v = view.vb;
    return { x: v.x + ((clientX - r.left) / r.width) * v.w, y: v.y + ((clientY - r.top) / r.height) * v.h };
  }
  function zoomAt(factor, clientX, clientY) {
    const svg = svgEl(); if (!svg || !view.vb) return;
    const r = svg.getBoundingClientRect(), v = view.vb;
    if (clientX == null) { clientX = r.left + r.width / 2; clientY = r.top + r.height / 2; }
    const p = toMap(clientX, clientY);
    const whole = fitView(true).w;
    const nw = Math.min(Math.max(v.w / factor, whole / 8), whole);
    const k = nw / v.w;
    view.vb = { x: p.x - (p.x - v.x) * k, y: p.y - (p.y - v.y) * k, w: nw, h: v.h * k };
    applyView();
  }
  function focusSpace(space) {
    const l = layout.find((x) => x.space === space); if (!l) return;
    view.focus = space;
    renderMap();
    const whole = fitView(true), w = whole.w / 2.5, h = whole.h / 2.5;
    view.vb = { x: l.x + l.w / 2 - w / 2, y: l.y + l.h / 2 - h / 2, w, h };
    applyView();
  }
  function setupZoom() {
    const host = $("#map-svg-host");
    const pointers = new Map();
    let pinch = null, hintTimer = 0;
    host.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) view.moved = 0;
      pinch = null;
      host.classList.add("dragging");
    });
    window.addEventListener("pointermove", (e) => {
      const prev = pointers.get(e.pointerId);
      if (!prev || !view.vb) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        const r = svgEl().getBoundingClientRect();
        const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
        view.moved += Math.abs(dx) + Math.abs(dy);
        if (view.moved < 4) return; // クリックの小さなブレは無視
        view.vb.x -= (dx / r.width) * view.vb.w;
        view.vb.y -= (dy / r.height) * view.vb.h;
        applyView();
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) zoomAt(dist / pinch, (a.x + b.x) / 2, (a.y + b.y) / 2);
        pinch = dist; view.moved = 999;
      }
    });
    const up = (e) => {
      pointers.delete(e.pointerId); pinch = null;
      if (!pointers.size) host.classList.remove("dragging");
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    // PC：Ctrl(⌘)+ホイール、またはトラックパッドのピンチで拡大縮小。普通のホイールはページのスクロール
    host.addEventListener("wheel", (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
        zoomAt(Math.exp(-Math.max(-100, Math.min(100, dy)) * .004), e.clientX, e.clientY);
      } else {
        $("#map-hint").classList.add("show");
        clearTimeout(hintTimer);
        hintTimer = setTimeout(() => $("#map-hint").classList.remove("show"), 1500);
      }
    }, { passive: false });
    // マウスでクリックしたときにフォーカス枠（青い丸枠）が出ないように
    host.addEventListener("mousedown", (e) => e.preventDefault());
    // ホバーでサークル情報をポップアップ
    const tip = $("#map-tip");
    host.addEventListener("pointermove", (e) => {
      const g = e.pointerType === "mouse" && !host.classList.contains("dragging") ? e.target.closest(".m-space") : null;
      if (!g) { tip.hidden = true; return; }
      const c = bySpace.get(g.dataset.space);
      tip.innerHTML = c
        ? `<b>${esc(c.name)}</b><span>${esc(c.spaceRaw)}${c.owner ? "　代表：" + esc(c.owner) : ""}</span>`
        : `<span>${esc(g.dataset.space)}（情報なし）</span>`;
      tip.hidden = false;
      const wr = $("#map-wrap").getBoundingClientRect();
      let x = e.clientX - wr.left + 14, y = e.clientY - wr.top + 16;
      if (x + tip.offsetWidth > wr.width - 4) x = e.clientX - wr.left - tip.offsetWidth - 10;
      if (y + tip.offsetHeight > wr.height - 4) y = e.clientY - wr.top - tip.offsetHeight - 10;
      tip.style.left = x + "px"; tip.style.top = y + "px";
    });
    host.addEventListener("pointerleave", () => { tip.hidden = true; });
    host.addEventListener("dblclick", (e) => { if (!e.target.closest(".m-space.has")) zoomAt(2, e.clientX, e.clientY); });
    $("#zoom-in").addEventListener("click", () => zoomAt(1.5));
    $("#zoom-out").addEventListener("click", () => zoomAt(1 / 1.5));
    $("#zoom-reset").addEventListener("click", () => { view.focus = ""; renderMap(); view.vb = fitView(true); applyView(); });
    // 画面サイズが変わったら、中心と拡大率を保ったまま縦横比だけ合わせる
    window.addEventListener("resize", () => {
      const svg = svgEl(), v = view.vb; if (!svg || !v) return;
      const r = svg.getBoundingClientRect(); if (!r.width || !r.height) return;
      const cx = v.x + v.w / 2, cy = v.y + v.h / 2, h = v.w * r.height / r.width;
      view.vb = { x: v.x, y: cy - h / 2, w: v.w, h };
      applyView();
    });
  }

  // ===== 概要 =====
  function linkify(s) {
    return esc(s).replace(/https?:\/\/[^\s<>"']+/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`).replace(/\n/g, "<br>");
  }
  function renderAbout(rows) {
    const html = rows.filter((r) => val(r, "見出し") || val(r, "本文")).map((r) =>
      `<section class="about-sec">${val(r, "見出し") ? `<h2>${esc(val(r, "見出し"))}</h2>` : ""}<p>${linkify(val(r, "本文"))}</p></section>`).join("");
    $("#view-about").innerHTML = html || "<p>概要情報はまだありません。</p>";
  }

  // ===== 詳細 =====
  function linkList(c) {
    const links = [
      ["サークルサイト", c.url], ["X (Twitter)", c.twitter], ["Pixiv", c.pixiv],
      ["リンク1", c.other1], ["リンク2", c.other2], ["お品書き", c.menu], ["告知", c.notice],
    ].filter(([, u]) => safeUrl(u));
    return `<ul class="links">${links.map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${t}</a></li>`).join("")}</ul>`;
  }

  function openDetail(c) {
    const link = (u, t) => safeUrl(u) ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>` : esc(u);
    const onMap = c.spaces.find((s) => layout.some((l) => l.space === s));
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
          ${onMap ? `<button class="to-map" data-space="${esc(onMap)}">📍 配置図で場所を見る</button>` : ""}
        </div>
      </div>
      <div class="items-wrap"><table class="items">
        <thead><tr><th>頒布物</th><th>種別</th><th>新/既</th><th>価格</th><th>音源</th><th>見本等</th><th class="c-note">備考</th></tr></thead>
        <tbody>${c.items.map((i) => `<tr>
          <td>${esc(i.name)}</td><td>${esc(i.kind)}</td><td>${statusBadge(i.status)}</td>
          <td class="price">${i.price ? (/^\d+$/.test(i.price) ? "¥" + Number(i.price).toLocaleString() : esc(i.price)) : "-"}</td>
          <td class="c-voice">${linkify(i.voice)}</td>
          <td>${i.sample ? link(i.sample, safeUrl(i.sample) ? "見本" : i.sample) : ""}</td>
          <td class="c-note">${i.note ? `<div class="note">${linkify(i.note)}</div>` : ""}</td></tr>`).join("") || '<tr><td colspan="7">頒布物情報はまだありません</td></tr>'}</tbody>
      </table></div>
      ${c.updated ? `<p class="updated">更新日時(目安)：${esc(c.updated)}</p>` : ""}`;
    history.replaceState(null, "", "#" + encodeURIComponent(c.spaces[0] || c.name));
    if (!$("#detail").open) $("#detail").showModal();
  }

  function setView(v) {
    document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.view === v));
    for (const k of ["about", "list", "map"]) $("#view-" + k).hidden = v !== k;
    $(".filters").hidden = v === "about";
    $("#status").hidden = v === "about";
    if (v === "map") renderMap();
    try { localStorage.setItem("view", v); } catch {}
  }

  function rerender() { renderList(); if (!$("#view-map").hidden) renderMap(); }

  async function init() {
    document.title = CFG.title;
    $("#site-title").textContent = CFG.title;
    $("#status").textContent = "読み込み中…";
    const [cRows, lRows, aRows] = await Promise.all([
      loadCsv(CFG.circlesCsvUrl, CFG.fallbackCirclesCsv),
      loadCsv(CFG.layoutCsvUrl, CFG.fallbackLayoutCsv).catch(() => []),
      loadCsv(CFG.aboutCsvUrl, CFG.fallbackAboutCsv).catch(() => []),
    ]);
    circles = buildCircles(cRows);
    for (const c of circles) for (const s of c.spaces) bySpace.set(s, c);
    layout = lRows.map((r) => ({
      space: expandSpaces(val(r, "スペース"))[0] || "",
      x: +val(r, "x") || 0, y: +val(r, "y") || 0,
      w: +val(r, "幅") || 1, h: +val(r, "高さ") || 1, label: val(r, "ラベル"), color: val(r, "色"), size: +val(r, "文字サイズ") || 0,
    }));
    renderAbout(aRows);
    const kinds = [...new Set(circles.flatMap((c) => c.items.map((i) => i.kind)).filter(Boolean))];
    $("#f-kind").insertAdjacentHTML("beforeend", kinds.map((k) => `<option>${esc(k)}</option>`).join(""));

    document.querySelectorAll(".filters input, .filters select").forEach((el) => el.addEventListener("input", rerender));
    document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
    $("#view-list").addEventListener("click", (e) => { const card = e.target.closest(".card"); if (card) openDetail(circles[card.dataset.idx]); });
    setupZoom();
    const mapOpen = (e) => { if (e.type === "click" && view.moved >= 4) return; const g = e.target.closest(".m-space.has"); if (g) openDetail(bySpace.get(g.dataset.space)); };
    $("#map-svg-host").addEventListener("click", mapOpen);
    $("#map-svg-host").addEventListener("keydown", (e) => { if (e.key === "Enter") mapOpen(e); });
    $("#detail .close").addEventListener("click", () => $("#detail").close());
    $("#detail").addEventListener("click", (e) => {
      if (e.target.id === "detail") $("#detail").close();
      const btn = e.target.closest(".to-map");
      if (btn) {
        $("#detail").close();
        setView("map");
        focusSpace(btn.dataset.space);
        const hdr = getComputedStyle($("header")).position === "sticky" ? $("header").offsetHeight : 0;
        window.scrollTo({ top: $("#view-map").getBoundingClientRect().top + scrollY - hdr - 8 });
      }
    });
    $("#detail").addEventListener("close", () => {
      history.replaceState(null, "", location.pathname);
      setTimeout(() => document.activeElement?.blur?.(), 0); // 閉じた後のフォーカス枠を消す
    });

    let saved = "about"; try { saved = localStorage.getItem("view") || "about"; } catch {}
    renderList();
    setView(saved);
    // URL末尾 #A-01 で直接そのサークルを開ける（共有用）
    const h = decodeURIComponent(location.hash.slice(1));
    if (h) { const c = bySpace.get(expandSpaces(h)[0]) || circles.find((x) => x.name === h); if (c) openDetail(c); }
  }

  init().catch((e) => { $("#status").textContent = "データの読み込みに失敗しました：" + e.message; console.error(e); });
})();
