/* =========================================================
   学習ノート — 挙動
   ========================================================= */
(function () {
  'use strict';

  /* ---------- テーマ切替 ----------
     保存キーは <html data-theme-key> から読む（出所は tools/site.mjs の1か所）。
     ccaf-learn ではキーが3か所に複製されていて、一部だけ直すと保存されなくなった。 */
  const root = document.documentElement;
  const THEME_KEY = root.dataset.themeKey || 'theme';
  const themeBtn = document.createElement('button');
  themeBtn.id = 'themeBtn';
  themeBtn.title = 'ライト / ダーク切替';
  const paint = () => {
    themeBtn.innerHTML = root.dataset.theme === 'light'
      ? '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>'
      : '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4.4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>';
  };
  themeBtn.onclick = () => {
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(THEME_KEY, root.dataset.theme); } catch (e) { /* 保存できなくても切替は効く */ }
    paint();
  };
  paint();
  const sw = document.querySelector('.search-wrap');
  if (sw) sw.insertBefore(themeBtn, sw.firstChild);

  /* ---------- 番号の説明 見出し ---------- */
  document.querySelectorAll('.figbox > .ann').forEach(ol => {
    const h = document.createElement('p');
    h.className = 'annhead'; h.textContent = '番号の説明';
    ol.parentNode.insertBefore(h, ol);
  });

  /* ---------- 上部ナビ：狭い画面では「いま居るドメイン」に畳む ----------
     役割は「ドメイン間の移動」。ドメイン内の移動は目次が受け持つ。
     畳む幅は目次の開閉と**別の値**にする ── ナビはドメインの数で必要な幅が決まり、
     目次は本文の読み幅で決まる。同じ値を共用すると、片方を直したときにもう片方が壊れる。
     JS が動かなければ畳まれないだけで、ナビは今までどおり使える。 */
  const NAV_FOLD = '(max-width:1279px)';
  const TOC_FOLD = '(max-width:1080px)';
  const navEl = document.querySelector('.domnav');
  const navList = navEl && navEl.querySelector('.nav-list');
  if (navEl && navList) {
    const on = navList.querySelector('.nav-item.on');
    const mqn = window.matchMedia(NAV_FOLD);
    const cur = document.createElement('button');
    cur.className = 'nav-cur';
    cur.setAttribute('aria-expanded', 'false');
    cur.innerHTML = '<span class="nav-cur-num"></span><span class="nav-cur-t"></span>';
    cur.querySelector('.nav-cur-num').textContent =
      on ? on.querySelector('.nav-num').textContent : '目次';
    cur.querySelector('.nav-cur-t').textContent =
      on ? on.querySelector('.nav-title').textContent : 'トップ';
    cur.onclick = () => {
      const open = navEl.classList.toggle('nav-open');
      cur.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    const applyNav = () => {
      if (mqn.matches) {
        if (!cur.isConnected) navList.parentNode.insertBefore(cur, navList);
        navEl.classList.add('navfold');
      } else {
        navEl.classList.remove('navfold', 'nav-open');
        if (cur.isConnected) cur.remove();
      }
    };
    applyNav();
    mqn.addEventListener('change', applyNav);
    document.addEventListener('click', e => {
      if (navEl.classList.contains('nav-open') && !navEl.contains(e.target)) {
        navEl.classList.remove('nav-open');
        cur.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- 目次：いま読んでいる小見出しを光らせる ----------
     節そのものの選択状態は reindex.mjs が静的に書き出している（.toc-link.on）。
     ここでやるのは、その節の中の小見出しの追従だけ。 */
  const subs = [...document.querySelectorAll('.toc-link.toc-sub')]
    .map(a => ({ a, el: document.getElementById(a.getAttribute('href').slice(1)) }))
    .filter(x => x.el);
  if (subs.length) {
    const spy = () => {
      const y = window.scrollY + 130;
      let cur = -1;
      subs.forEach((x, i) => { if (x.el.getBoundingClientRect().top + window.scrollY <= y) cur = i; });
      subs.forEach((x, i) => x.a.classList.toggle('on', i === cur));
    };
    document.addEventListener('scroll', spy, { passive: true });
    window.addEventListener('resize', spy);
    spy();
  }

  /* ---------- 目次の開閉（狭い画面だけ） ----------
     広い画面では横に出しっぱなし。狭い画面では畳んで、必要なときだけ開く。
     JS が動かなくても目次は表示されたままなので、機能が消えることはない。 */
  const tocEl = document.querySelector('.toc');
  if (tocEl) {
    const headEl = tocEl.querySelector('.toc-head');
    const listEl = tocEl.querySelector('.toc-list');
    const mq = window.matchMedia(TOC_FOLD);
    const btn = document.createElement('button');
    btn.className = 'toc-toggle';
    btn.setAttribute('aria-expanded', 'false');
    const cur = document.querySelector('.toc-link.on');
    const label = () => {
      const n = tocEl.querySelectorAll('.toc-link:not(.toc-sub)').length;
      /* 項番号とタイトルは**必ず区切る。** textContent をそのまま使うと
         2つの span が地続きになり、「5-1」＋「1枚で…」が「5-11枚で…」に見える。 */
      const num = cur && cur.querySelector('.itm-n');
      const ttl = cur && cur.querySelector('.itm-t');
      const here = cur
        ? (num && ttl ? num.textContent.trim() + '　' + ttl.textContent.trim()
                      : cur.textContent.trim())
        : '';
      btn.innerHTML = '<span>目次</span><b></b><i>' + n + ' 項</i>';
      btn.querySelector('b').textContent = here;
    };
    label();
    btn.onclick = () => {
      const open = tocEl.classList.toggle('toc-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    const apply = () => {
      if (mq.matches) {
        if (!btn.isConnected) tocEl.insertBefore(btn, listEl);
        tocEl.classList.add('toc-fold');
        if (headEl) headEl.hidden = true;
      } else {
        tocEl.classList.remove('toc-fold', 'toc-open');
        if (btn.isConnected) btn.remove();
        if (headEl) headEl.hidden = false;
      }
    };
    apply();
    mq.addEventListener('change', apply);
  }

  /* ---------- 図：横スクロールが要るときだけ、そう書く ---------- */
  const noteSwipe = () => {
    document.querySelectorAll('.figbox').forEach(box => {
      const need = box.scrollWidth > box.clientWidth + 2;
      let tip = box.nextElementSibling;
      const isTip = tip && tip.classList && tip.classList.contains('swipe');
      if (need && !isTip) {
        const s = document.createElement('span');
        s.className = 'swipe';
        s.textContent = '← 図は横にスワイプできます →';
        box.parentNode.insertBefore(s, box.nextSibling);
      } else if (!need && isTip) tip.remove();
    });
  };
  noteSwipe();
  window.addEventListener('resize', noteSwipe);

  /* ---------- 図：画面に入ったら再生 ---------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => {
      es.forEach(e => {
        if (!e.isIntersecting) return;
        const d = e.target;
        d.classList.remove('run'); void d.offsetWidth; d.classList.add('run');
        io.unobserve(d);
      });
    }, { threshold: 0.16 });
    document.querySelectorAll('.fig').forEach(d => io.observe(d));
  }

  /* ---------- 理解度チェック ----------
     1問の形は { q, o:[選択肢…], a, e }。
       a が整数         … 1つ選ぶ設問。最初のクリックで判定する
       a が配列（2つ以上）… 複数選ぶ設問。「Nつ選ぶ」は a の個数から出す（問題文に手で書かない）。
                          クリックで選ぶ／外すを切り替え、N 個そろった時点で判定する
     本番も「1つ選ぶ設問と複数選ぶ設問が混じり、選ぶ数は問題文に書かれる」（Exam Guide §5）。 */
  const QUIZ = window.QUIZ || {};
  const L = i => String.fromCharCode(65 + i);
  document.querySelectorAll('[data-quiz]').forEach(sec => {
    const data = QUIZ[sec.dataset.quiz];
    const wrap = sec.querySelector('.qwrap');
    if (!data || !wrap) return;
    wrap.innerHTML = '';
    /* 設問数は data から出す。HTML に手で書くと足したときに必ず片方だけ古くなる。
       .lead の中の空の .qcount にだけ数を入れる（節ごとの一文は残す）。 */
    const cnt = sec.querySelector('.qcount');
    if (cnt) {
      const multi = data.filter(x => Array.isArray(x.a)).length;
      cnt.textContent = data.length + '問' + (multi ? '（うち複数選ぶ設問 ' + multi + '問）' : '') + '。';
    }
    data.forEach((item, qi) => {
      const box = document.createElement('div');
      box.className = 'q';
      box.innerHTML = '<div class="qn"><span>Q' + (qi + 1) + '</span></div><p class="qt"></p>';
      box.querySelector('.qt').textContent = item.q;
      /* 選択肢は描画のたびに混ぜる。設問データ側の並びに正解が偏っていても
         読み手には届かないし、解き直しで位置を覚えることもない（§7 #29）。
         混ぜるのは組み立て時の1回だけなので、答えたあとに並びは動かない。
         選択肢と解説に「上記」「前者」「選択肢 B」のような順序に依存する文言は書かない（check 5i）。 */
      const ord = item.o.map((_, i) => i);
      for (let i = ord.length - 1; i > 0; i--) {             // Fisher–Yates
        const j = Math.floor(Math.random() * (i + 1));
        [ord[i], ord[j]] = [ord[j], ord[i]];
      }
      const ans = new Set([].concat(item.a).map(a => ord.indexOf(a)));   // 混ぜたあとの正解の位置
      const need = ans.size;
      if (need > 1) {
        const t = document.createElement('span');
        t.className = 'qneed';
        t.textContent = need + 'つ選ぶ';
        box.querySelector('.qn').appendChild(t);
      }
      const picked = new Set();
      const judge = () => {
        box.dataset.done = '1';
        const opts = [...box.querySelectorAll('.opt')];
        opts.forEach((x, i) => {
          x.classList.add('done');
          x.removeAttribute('aria-pressed');
          if (ans.has(i)) x.classList.add('ok');
          else if (picked.has(i)) x.classList.add('ng');
        });
        const right = picked.size === ans.size && [...picked].every(i => ans.has(i));
        const e = box.querySelector('.exp');
        e.classList.add('show');
        if (!right) e.classList.add('wrong');
        e.querySelector('span').textContent = item.e;
        e.querySelector('b').textContent =
          (right ? '正解' : '不正解 — 正解は ' + [...ans].sort((x, y) => x - y).map(L).join('・')) + '　';
      };
      ord.forEach((src, oi) => {
        const b = document.createElement('button');
        b.className = 'opt';
        if (need > 1) b.setAttribute('aria-pressed', 'false');
        b.innerHTML = '<span class="ol"></span><span></span>';
        b.querySelector('.ol').textContent = L(oi);
        b.querySelectorAll('span')[1].textContent = item.o[src];
        b.onclick = () => {
          if (box.dataset.done) return;
          if (need === 1) { picked.add(oi); judge(); return; }
          // 複数選ぶ設問：N 個そろうまでは選び直せる
          if (picked.has(oi)) picked.delete(oi); else picked.add(oi);
          b.classList.toggle('sel', picked.has(oi));
          b.setAttribute('aria-pressed', picked.has(oi) ? 'true' : 'false');
          if (picked.size === need) judge();
        };
        box.appendChild(b);
      });
      const e = document.createElement('div');
      e.className = 'exp'; e.innerHTML = '<b></b><span></span>';
      box.appendChild(e);
      wrap.appendChild(box);
    });
  });

  /* ---------- 操作できる図 ----------
     本文の <section data-widget="名前"> に、操作できることを示すチップを付ける。
     実装を足すときは、ここに名前と説明を足し、同じ名前の処理をこの下に書く
     （check が、HTML の data-widget とこの表の対応を見る）。 */
  const WIDGETS = {};
  Object.keys(WIDGETS).forEach(id => {
    const sec = document.querySelector('[data-widget="' + id + '"]');
    if (!sec) return;
    const c = document.createElement('span');
    c.className = 'chip i';
    c.textContent = '▶ 操作できる図 ─ ' + WIDGETS[id];
    const head = sec.querySelector('.sec-head');
    if (head) head.after(c);
  });

  /* ---------- 全文検索 ---------- */
  const IDX = window.SEARCH_INDEX || [];
  // 節ファイルは1階層下にあるので、索引のパスに ../ を足す
  const BASE = document.body.dataset.page ? '../' : '';
  const modal = document.getElementById('searchModal');
  const input = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');
  const openBtn = document.getElementById('openSearch');
  let openSearch = null, closeSearch = null;
  if (modal && input && results) {
    const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    openSearch = () => { modal.hidden = false; input.value = ''; results.innerHTML = ''; input.focus(); render(''); };
    closeSearch = () => { modal.hidden = true; };
    if (openBtn) openBtn.onclick = openSearch;
    modal.onclick = e => { if (e.target === modal) closeSearch(); };
    function render(q) {
      q = q.trim();
      if (!q) {
        // 例の語は検索窓の placeholder と同じもの（出所は tools/site.mjs の1か所）
        results.innerHTML = '<div class="empty">' + esc(input.placeholder) + '</div>';
        return;
      }
      const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
      const hits = [];
      IDX.forEach(item => {
        const T = item.t.toLowerCase(), X = item.x.toLowerCase();
        let score = 0, pos = -1;
        terms.forEach(t => {
          if (T.includes(t)) score += 12;
          const i = X.indexOf(t);
          if (i >= 0) { score += 4; if (pos < 0) pos = i; }
        });
        if (score > 0) hits.push({ item, score, pos });
      });
      hits.sort((a, b) => b.score - a.score);
      if (!hits.length) { results.innerHTML = '<div class="empty">見つかりませんでした</div>'; return; }
      results.innerHTML = hits.slice(0, 30).map(({ item, pos }) => {
        const p = Math.max(0, (pos < 0 ? 0 : pos) - 46);
        let snip = esc(item.x.slice(p, p + 190));
        terms.forEach(t => {
          snip = snip.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
        });
        return `<a href="${BASE}${item.f}">
          <div class="r-top"><span class="r-dom">${esc(item.d)}</span><span class="r-title">${esc(item.t)}</span></div>
          <div class="r-snip">…${snip}…</div></a>`;
      }).join('');
    }
    let tm;
    input.oninput = () => { clearTimeout(tm); tm = setTimeout(() => render(input.value), 90); };
  }

  /* ---------- キー操作 ─ ここに集約する ----------
     待ち受けを分けると「入力中か」の判定が複数箇所に散り、片方だけ直す事故になる。
     足すときは、この1つの中に足す（check 5t が数える）。

       /  ・Cmd/Ctrl+K … 検索を開く
       Esc              … 検索を閉じる
       ← →              … 前後の項へ（PC）

     ← / → は本来ページの横スクロールだが、この教材はどの幅でも横溢れ0
     （measure が常時検査）なので、取り上げても失われる操作がない。 */
  const typing = () => {
    const el = document.activeElement;
    return !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);
  };
  const searchOpen = () => !!modal && !modal.hidden;
  /** 前後の項へのリンク。最初と最後は片方が <span> なので href で絞る */
  const pager = (dir) =>
    document.querySelector('.secpager .pgv.' + (dir < 0 ? 'prev' : 'next') + '[href]');

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (closeSearch) closeSearch(); return; }
    if (typing()) return;
    if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && !searchOpen()) {
      if (!openSearch) return;
      e.preventDefault(); openSearch(); return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (searchOpen()) return;
      if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;   // Alt+← はブラウザの「戻る」
      const link = pager(e.key === 'ArrowLeft' ? -1 : 1);
      if (!link) return;                                              // 最初と最後は送り先がない
      e.preventDefault(); location.href = link.href;
    }
  });
})();
