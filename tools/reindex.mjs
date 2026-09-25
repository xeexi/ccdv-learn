/* =========================================================
   節ファイルの周りを書き出す ＋ 検索インデックスの再生成 ＋ キャッシュ対策

     ./tools/x reindex        （mise run reindex でも同じ）

   本文を編集したあとに必ず実行する。することは5つ。

   1. 各節ファイルと index.html の「本文」（▼ 本文 〜 ▲ 本文 のあいだ）を読み取る
   2. 本文の目印（<!--#名前--> ・ data-s ・ data-en ・ data-cast）に中身を差し込む
   3. その前後 ─ head・上部ナビ・目次・パンくず・前後の送り・検索窓・スクリプト ─ を
      このファイルのテンプレートから書き出す（**唯一の出所はここ**。HTML を手で直しても
      次の reindex で上書きされる。index.html も同じ）
   4. assets/search-index.js を本文から作り直す
   5. assets/*.css|js の参照に ?v=<中身の SHA1 先頭8桁> を打ち直す
      （これがないと、ブラウザが古い search-index.js や style.css を使い続けて
        本文と検索結果がズレる）

   読む順は site.mjs、公式由来の事実は blueprint.mjs が出所。依存パッケージなし（Node 18+）。
   ========================================================= */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { GUIDE, EXAM, DOMAINS as BP_DOM, SKILLS, COVER, TRAPS, SAMPLES, QUALIFIERS, GLOSSARY, TERMS, CAST, domainItems, pct } from './blueprint.mjs';
import { DIRS, SITE } from './site.mjs';

/* 成果物（HTML と assets）は docs/ の下 ─ GitHub Pages がそのまま公開できる名前。tools/ と CLAUDE.md はリポジトリ直下 */
const ROOT = path.join(path.resolve(new URL('..', import.meta.url).pathname), 'docs');

/* ---------- ドメインの表 ─ 並びは site.mjs の読む順 ----------
   番号と英語名は blueprint.mjs から足す。**配点と問数はここに書かない**
   （blueprint.mjs の DOMAINS[key].w が出所。問数は domainItems() が導出する）。 */
const DOMAINS = DIRS.map(d => {
  const bp = BP_DOM[d.key];
  if (!bp && !d.num) throw new Error(`site.mjs: ${d.key} は blueprint の DOMAINS に無く、num も無い`);
  return { ...d, n: bp ? bp.n : null, num: bp ? `Domain ${bp.n}` : d.num, short: bp ? `D${bp.n}` : d.num };
});
/** 配点のあるドメイン（公式の8つ）を、**公式の番号順**で返す。
 *  配点の帯・凡例・対訳表のような「公式を写す図」は、読む順ではなくこの順に並べる。 */
const scored = () => DOMAINS.filter(d => d.n).sort((a, b) => a.n - b.n);

const OPEN = '<!-- ▼ 本文 ─ ここだけを編集する。この前後は tools/reindex.mjs が書き出す -->';
const CLOSE = '<!-- ▲ 本文 -->';

/* ---------- 複数ページで共通の塊 ----------
   同じ図や表が2か所以上に要るとき、本文に <!--#名前--><!--/#名前--> と書いておけば
   reindex が中身を差し込む。手で2か所コピーすると必ず片方だけ古くなる。
   実体（BLOCKS）は部品を定義したあとに置くので、差し込みは読み込みの後に1回まとめて行う。 */
const fillBlocks = (html) => Object.entries(BLOCKS).reduce(
  (s, [name, make]) => s.replace(
    new RegExp(`<!--#${name}-->[\\s\\S]*?<!--/#${name}-->`, 'g'),
    () => `<!--#${name}-->${make()}<!--/#${name}-->`),
  html);

/* ---------- 1. 節ファイルを読む ---------- */
const pages = [];
for (const d of DOMAINS) {
  const dirFull = path.join(ROOT, d.dir);
  if (!fs.existsSync(dirFull)) continue;   // まだ1項も無いドメイン（ナビはトップを指す）
  const files = fs.readdirSync(dirFull).filter(f => f.endsWith('.html')).sort();
  files.forEach(file => {
    const full = path.join(dirFull, file);
    const raw = fs.readFileSync(full, 'utf8');
    const a = raw.indexOf(OPEN), b = raw.indexOf(CLOSE);
    if (a < 0 || b < 0) { console.warn('⚠ 本文の目印がない:', d.dir + '/' + file); return; }
    const body = raw.slice(a + OPEN.length, b).trim();
    const id = (body.match(/<section class="sec[^"]*"\s+id="([^"]*)"/) || [])[1];
    const h2 = (body.match(/<h2>([\s\S]*?)<\/h2>/) || ['', ''])[1].replace(/<[^>]*>/g, '').trim();
    const m = h2.match(/^(\d+-\d+)　?(.*)$/);
    const subs = [...body.matchAll(/<h3 class="sub" id="([^"]*)">([\s\S]*?)<\/h3>/g)]
      .map(x => ({ id: x[1], t: x[2].replace(/<[^>]*>/g, '').trim() }));
    if (!id) { console.warn('⚠ id がない:', d.dir + '/' + file); return; }
    pages.push({
      dom: d, file, rel: d.dir + '/' + file, full, body, id,
      num: m ? m[1] : '', title: m ? m[2] : h2, h2,
      quiz: /<section class="sec sec-quiz/.test(body), subs,
    });
  });
}
// 表に無い NN- ディレクトリは、ナビにも送りにも検索にも載らない ── 黙って漏れないよう知らせる
fs.readdirSync(ROOT).filter(x => /^\d\d-/.test(x) && !DOMAINS.some(d => d.dir === x))
  .forEach(x => console.warn(`⚠ site.mjs の DIRS に無いディレクトリ: ${x}（読まれない）`));

/* ---------- 2. 部品 ---------- */
const HEADFONT = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">`;

/* テーマの保存キーは site.mjs の1か所だけ。app.js は <html data-theme-key> から読む */
const THEMEBOOT = `<script>(function(){var t=localStorage.getItem('${SITE.themeKey}');if(t)document.documentElement.dataset.theme=t;})();</script>`;

const MODAL = `<div class="modal" id="searchModal" hidden>
  <div class="modal-box">
    <input id="searchInput" type="search" placeholder="用語・見出し・本文を検索（例: ${SITE.searchEg}）" autocomplete="off">
    <div id="searchResults" class="results"></div>
    <div class="modal-foot"><kbd>Esc</kbd> で閉じる</div>
  </div>
</div>`;

const BRAND = `${GUIDE.code} ${SITE.name}`;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 項へのリンク1本。目次（節ページの左）と全項目一覧（トップ）で同じ形を使う。
 *  番号と題名を別の列に出す ── ひとつなぎにすると ◇ が番号の左に出てしまい、
 *  題名の頭も揃わない。◇ は「理解度チェックである」印なので題名側に付く。 */
const itemLink = (p, { href, cls = '', on = false }) =>
  `<a class="itm ${cls}${on ? ' on' : ''}${p.quiz ? ' itm-quiz' : ''}" href="${href}">`
  + `<span class="itm-n">${esc(p.num || '─')}</span><span class="itm-t">${esc(p.title)}</span></a>`;

/** 節 id → その節へのリンク（見つからなければ null）。base は '' か '../' */
const secLink = (id, base) => {
  const p = pages.find(x => x.id === id);
  return p ? `<a href="${base}${p.rel}">${esc(p.num)}</a>` : null;
};

/** 配点の図。中身は blueprint.mjs から計算する。**並びは公式の番号順**（読む順ではない）。
 *  帯の全長＝本試験の問数。区画の幅は重みそのもの。
 *  狭い区画（D3・D4 は 3% 前後）に「N問」を入れると切れるので、帯の中の数字は
 *  幅が足りる区画にだけ出し、問数は凡例に必ず出す。 */
const weightFig = () => {
  const ds = scored();
  const items = domainItems();
  const WIDE = 80;   // 8.0% 以上の区画にだけ、帯の中に問数を書く
  const segs = ds.map(d => {
    const w = BP_DOM[d.key].w;
    return `<span class="seg" data-domain="${d.key}" style="width:${pct(w)}">${w >= WIDE ? `${items[d.key]}問` : ''}</span>`;
  }).join('');
  const legend = ds.map((d, i) =>
    `    <span class="lg s${i + 1}" data-domain="${d.key}"><span class="sw"></span><b>${esc(d.num)}</b><span class="n">${pct(BP_DOM[d.key].w)}・約${items[d.key]}問　${esc(d.h1)}</span></span>`).join('\n');
  const byN = ds.slice().sort((a, b) => items[b.key] - items[a.key] || a.n - b.n);
  const max = byN[0], min = byN[byN.length - 1];
  return `<div class="figbox"><figure class="fig run">
  <p class="fig-t">本試験 ${EXAM.items} 問の内訳 ─ 帯の全長が ${EXAM.items} 問、区画の幅が重み</p>
  <div class="fig-seg s1">${segs}</div>
  <div class="fig-legend">
${legend}
  </div>
  <p class="fig-f">いちばん多い ${esc(max.num)} は約 ${items[max.key]} 問、いちばん少ない ${esc(min.num)} は約 ${items[min.key]} 問。<b>ドメインごとの正答率は成績表に出るが、合否は総合点だけで決まる</b>。</p>
</figure></div>`;
};

/** 出題形式 ─ 53問・120分・720。手で書くと複数か所で古くなる */
const examFmt = () => `本試験は <b>${EXAM.items}問・${EXAM.minutes}分</b>、合格は ${EXAM.scaleMin}〜${EXAM.scaleMax.toLocaleString('en-US')} の尺度で <b>${EXAM.pass}</b>`;

/** 札の呼び名。原文は "Domain 2: Applications and Integration" と呼び、
 *  スキルには番号を付けていない ── だから札は「DOMAIN 2 ＋ スキルの原文の名前」にする。 */
const TN = 'DOMAIN';

/** 参考資料の Exam Guide と認定ページの行 ─ index.html。
 *  **URL も版も出題形式も、すべて GUIDE / EXAM から出す。** */
const guideSrc = () => `<tr><th><a href="${GUIDE.url}">Exam Guide</a><br><span class="n">PDF・英語・${GUIDE.pages}ページ</span></th>
        <td><b>${scored().length}ドメイン${Object.keys(SKILLS).length}スキルの原文と重み</b>。出題形式（${EXAM.items}問・${EXAM.minutes}分・合格 ${EXAM.pass}）。解説つきの例題${EXAM.sampleQuestions}問。各項の <code>${TN} 2</code> の札の英文は、ここから写したものです。<br><span class="n">Version ${GUIDE.version} ／ Effective ${GUIDE.effective} ／ ${GUIDE.code}</span></td></tr>
      <tr><th><a href="${GUIDE.cert}">認定ページ</a></th>
        <td>申し込みと、Exam Guide の最新版の入手先（<a href="${GUIDE.certs}">認定の一覧</a>）</td></tr>`;

/** 公式のブループリントを、そのまま表にする ─ 8ドメイン・25スキル・重み・扱う項。
 *  「扱う項」は COVER の sections から出す（手で書かない）。**並びは原文どおり**。 */
const blueprintFig = (base = '') => {
  const rows = scored().map(d => {
    const ss = Object.entries(SKILLS).filter(([, s]) => s.d === d.key);
    return ss.map(([k, s], i) => {
      const secs = ((COVER[k] || {}).sections || []).map(id => secLink(id, base)).filter(Boolean).join(' ');
      const head = i === 0
        ? `<td data-l="ドメイン" rowspan="${ss.length}"><b>${esc(d.num)}</b>　${pct(BP_DOM[d.key].w)}<br><span class="n">${esc(BP_DOM[d.key].en)}</span></td>` : '';
      return `    <tr data-domain="${d.key}">${head}<td data-l="スキル"><b>${esc(s.name)}</b></td><td data-l="重み">${pct(s.w)}</td><td data-l="扱う項"><span class="n">${secs || '─'}</span></td></tr>`;
    }).join('\n');
  }).join('\n');
  return `<table class="tbl bp">
  <thead><tr><th>ドメイン</th><th>スキル（原文）</th><th>重み</th><th>扱う項</th></tr></thead>
  <tbody>
${rows}
  </tbody>
</table>`;
};

/** 受験の実務 ─ §10〜§15。**行動が変わる数字だけ**を出す（支払い方法や窓口の詳細は公式へ）。
 *  並びは時間順（予約前 → 受け方 → 当日 → 落ちたとき → 受かったあと）。
 *  **取り返しがつかない期限**を先に置く ── 氏名の不一致と配慮の申請は、予約したあとでは直せない。 */
const examAdmin = () => `<div class="ex"><span class="exl">受験の実務 ─ 計画に効くものだけ</span>
  <b>予約する前に</b>　身分証の氏名と<b>登録名が完全に一致</b>している必要があります。訂正は <code>${EXAM.nameFixContact}</code> へ ── <b>予約する前に</b>済ませます。配慮（accommodations）が要るときも、Pearson VUE の承認を得てから予約します。<br>
  <b>受け方</b>　オンライン監督つき、またはテストセンター（Pearson VUE）。受験料 <b>${EXAM.fee} USD</b>。予約の変更・取消は<b>${EXAM.cancelHours}時間前まで</b>。それを過ぎたとき、および無断欠席・遅刻は、受験料が戻らず登録し直しになります。<br>
  <b>当日</b>　写真つきの本人確認書類が要ります。机の上に資料・端末は置けません（${EXAM.banned.join('・')}も持ち込めません）。試験内容は<b>口外しない</b>という同意（NDA）に応じてから始まります。<br>
  <b>落ちたとき</b>　待機は<b>${EXAM.retakeWaitDays.join('日 → ')}日</b>と伸びます。直近${EXAM.attemptsWindowMonths}か月で受けられるのは<b>${EXAM.attemptsPerYear}回</b>まで。<b>1回目で通す前提で組むほうが安上がり</b>です。<br>
  <b>受かったあと</b>　有効期間は<b>${EXAM.validityMonths}か月</b>。期限内なら<b>無料の更新試験</b>で更新でき、切らすと本試験を受け直しになります。</div>`;

/** 8. Sample Questions ─ 公式の例題3問。**設問文・選択肢・解説は載せない**（訳して再配布しない）。
 *  出すのは「誤答をどう分類できるか」と「間違えたらどの節に戻るか」だけ。
 *  件数はすべて SAMPLES から数える。誤答の数は「選択肢の数 − 正解の数」（4択・1つ選ぶ → 3）。 */
const sampleFig = () => {
  const cnt = {};
  for (const s of SAMPLES) for (const t of s.traps) cnt[t] = (cnt[t] || 0) + 1;
  const total = Object.values(cnt).reduce((a, b) => a + b, 0);
  const keys = Object.keys(TRAPS);
  const mark = Object.fromEntries(keys.map((k, i) => [k, '①②③④⑤⑥⑦⑧⑨'[i]]));
  const trapRows = keys.map(k => {
    const t = TRAPS[k];
    return `    <tr><td data-l="誤答の型"><b>${mark[k]} ${esc(t.ja)}</b><br><span class="n">${total}個中 ${cnt[k] || 0}個</span></td>
        <td data-l="こう見える">${t.sign}</td>
        <td data-l="なぜ誤りか">${t.why}<br><span class="n">公式の解説より ─ &ldquo;${esc(t.en)}&rdquo;</span></td></tr>`;
  }).join('\n');
  const perQ = total / SAMPLES.length;
  const qRows = SAMPLES.map(s => {
    const c = {};
    for (const t of s.traps) c[t] = (c[t] || 0) + 1;
    const traps = Object.entries(c).map(([k, v]) =>
      `${mark[k]} ${esc(TRAPS[k].ja)}${v > 1 ? `<b> ×${v}</b>` : ''}`).join('<br>');
    const secs = s.sections.map(id => secLink(id, '../')).filter(Boolean).join(' ');
    return `    <tr><td data-l="問"><b>Sample ${s.n}</b></td>
        <td data-l="問われていること">${esc(s.ja)}<br><span class="n">Domain ${BP_DOM[s.d].n}</span></td>
        <td data-l="誤答${perQ}つの型">${traps}</td>
        <td data-l="間違えたら戻る先"><span class="n">${secs || '─'}</span></td></tr>`;
  }).join('\n');
  const top = keys.slice().sort((a, b) => (cnt[b] || 0) - (cnt[a] || 0))[0];
  return `<table class="tbl">
  <thead><tr><th>誤答の型（${total}個ぶんを分類）</th><th>こう見える</th><th>なぜ誤りか</th></tr></thead>
  <tbody>
${trapRows}
  </tbody>
</table>

<p class="point"><b>ポイント</b>${SAMPLES.length}問の誤答${total}個は、この<b>${keys.length}つで全部説明がつく</b>。最も多いのは<b>${mark[top]} ${esc(TRAPS[top].ja)}（${cnt[top]}個）</b>。</p>

<h3 class="sub" id="samples-back">間違えたら、どこへ戻るか</h3>
<p class="goal"><b>ゴール</b>例題で間違えた選択肢から、読み直す項を選べる。</p>
<table class="tbl">
  <thead><tr><th>問</th><th>問われていること</th><th>誤答${perQ}つの型</th><th>間違えたら戻る先</th></tr></thead>
  <tbody>
${qRows}
  </tbody>
</table>
<p class="note">※ 「問われていること」は要旨です。<b>設問文・選択肢・解説は載せていません</b> ── 公式の例題そのもので、訳すと限定語が落ちて正解が変わるためです。原文を英語のまま解いてください。</p>`;
};

/** 8. Sample Questions の設問文から抜いた限定語 */
const qualFig = () => `<table class="tbl pair">
  <tbody>
${QUALIFIERS.map(q => `    <tr><th>${q.en}</th>
        <td><b>${esc(q.ja)}</b> ── ${q.note}</td></tr>`).join('\n')}
  </tbody>
</table>`;

/** 教材の日本語 ⇄ 公式の英語。**英語は原文からしか取らない**（check.mjs が照合する）。
 *  並びは公式の番号順。 */
const glossFig = () => {
  const glo = scored().map(d => {
    const rows = GLOSSARY.filter(g => g.d === d.key);
    if (!rows.length) return '';
    return `<h3>${esc(d.num)}　${esc(d.h1)}</h3>
<table class="tbl pair">
  <tbody>
${rows.map(g => `    <tr><th><code>${esc(g.en)}</code></th><td>${esc(g.ja)}</td></tr>`).join('\n')}
  </tbody>
</table>`;
  }).filter(Boolean).join('\n\n');
  return `${glo}

<p class="note">※ 英語は Exam Guide から写した ${GLOSSARY.length} 組です。<b>こちらで作った英語はありません。</b></p>`;
};

/** 読む順番 ─ site.mjs の並びそのもの。公式の番号順ではないことを、番号を並べて見せる */
const readOrder = () => `<div class="figbox"><figure class="fig run">
  <p class="fig-t">読む順番 ─ 前へ／次へ（← →）はこの順に進む</p>
  <ol class="fig-steps">
${DOMAINS.map((d, i) => `    <li class="s${Math.min(i + 1, 8)}"><span class="fig-who">${esc(d.num)}</span><span class="fig-do"><b>${esc(d.h1)}</b>　${esc(d.sub)}</span></li>`).join('\n')}
  </ol>
  <p class="fig-f">公式の番号（Domain 1〜${scored().length}）はアルファベット順で、学ぶ順ではない。<b>ディレクトリと項番号は公式の番号のまま</b>にして、並べる順だけを変えている。</p>
</figure></div>`;

const BLOCKS = { brand: () => esc(BRAND), credential: () => esc(GUIDE.title.toUpperCase().replace(/\s*–\s*/, ' ─ ')), readorder: readOrder,
  weightfig: weightFig, examfmt: examFmt, guidesrc: guideSrc, blueprintfig: () => blueprintFig(''),
  examadmin: examAdmin, samplefig: sampleFig, qualfig: qualFig, glossfig: glossFig, nsec: () => String(pages.length) };

/** `<p class="task" data-s="api-mechanics"></p>` に、公式の原文を差し込む。
 *  2つ持つ節は `data-s="api-mechanics cost-tokens"`。中身は毎回まるごと作り直す。 */
const fillSkills = (html) => html.replace(
  /<p class="task" data-s="([^"]+)">[\s\S]*?<\/p>/g,
  (_, ids) => {
    const label = ids.trim().split(/\s+/).map(id => {
      const s = SKILLS[id];
      if (!s) throw new Error('未知のスキル: ' + id + '（blueprint.mjs の SKILLS にない）');
      return `<span class="tn">${TN} ${BP_DOM[s.d].n}</span><b>${esc(s.name)}</b>`;
    }).join('　／　');
    return `<p class="task" data-s="${ids}">${label}</p>`;
  });

/** `<span data-en="窓"></span>` を「窓（context window）」に展開する。
 *  教材が日本語で作った名前に、公式の英語の札を1回だけ付けるための目印。**HTML に手で書かない。** */
const fillTerms = (html) => html.replace(
  /<span data-en="([^"]+)">[\s\S]*?<\/span>/g,
  (_, ja) => {
    if (!TERMS[ja]) throw new Error('未知の用語: ' + ja + '（blueprint.mjs の TERMS にない）');
    return `<span data-en="${ja}">${ja}（${TERMS[ja]}）</span>`;
  });

/** `<p class="cast" data-cast="app,claude"></p>` を「アプリ → Claude」に展開する。
 *  節ごとに組が入れ替わる（アプリ⇄Claude ／ ツール⇄Claude ／ 親⇄子 ／ 開発者⇄Claude Code）。
 *  その枠を1行で立てるための目印 ── **名前を HTML に手で書かない。** */
const fillCast = (html) => html.replace(
  /<p class="cast" data-cast="([^"]+)">[\s\S]*?<\/p>/g,
  (_, spec) => {
    // mixed ＝ 節の中で組が変わるので絞れない、という判断そのもの（何も出さない）
    if (spec.trim() === 'mixed') return '<p class="cast" data-cast="mixed"></p>';
    const who = spec.trim().split(',').map(k => {
      if (!CAST[k]) throw new Error('未知の登場人物: ' + k + '（blueprint.mjs の CAST にない）');
      return `<span class="c-${CAST[k].side}">${esc(CAST[k].ja)}</span>`;
    }).join('<span class="c-ar">→</span>');
    return `<p class="cast" data-cast="${spec}">${who}</p>`;
  });

/* 共通の塊・札・原語・登場人物を本文へ差し込む（部品の定義がそろったここで1回まとめて） */
const fillAll = (html) => fillCast(fillTerms(fillSkills(fillBlocks(html))));
pages.forEach(p => { p.body = fillAll(p.body); });

/** 各ドメインの入口（最初の節）。まだ1項も無いドメインはトップを指す */
const entry = {};
DOMAINS.forEach(d => {
  const first = pages.find(p => p.dom.dir === d.dir);
  entry[d.dir] = first ? first.rel : 'index.html';
});

/** 上部ナビ。base は ''（ルート）か '../'（節ファイル）。並びは読む順 */
const domnav = (base, curKey) => `<nav class="domnav">
  <a class="brand" href="${base}index.html"><span class="brand-mark">${esc(GUIDE.code)}</span><span class="brand-sub">${esc(SITE.name)}</span></a>
  <div class="nav-list">${DOMAINS.map(d => `<a class="nav-item${d.key === curKey ? ' on' : ''}" data-domain="${d.key}" href="${base}${entry[d.dir]}" title="${esc(d.num)} ${esc(d.h1)}">
       <span class="nav-num">${esc(d.short)}</span><span class="nav-title">${esc(d.nav)}</span></a>`).join('\n')}</div>
  <div class="search-wrap">
  <button class="search-btn" id="openSearch" aria-label="検索"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span>検索</span><kbd>/</kbd></button>
</div>
</nav>`;

/** 目次。表示中のドメインの節だけを並べ、小見出しは表示中の節の下にだけ出す。
 *  全項目一覧への導線は置かない ── ブランド（左上）がすでに index.html を指している（§7 #32）。 */
const toc = (cur) => {
  const list = pages.filter(p => p.dom.dir === cur.dom.dir);
  const items = list.map(p => {
    const on = p.rel === cur.rel;
    let s = itemLink(p, { href: `../${p.rel}`, cls: 'toc-link', on });
    if (on && p.subs.length) {
      s += '\n' + p.subs.map(x => `<a class="toc-link toc-sub" href="#${x.id}">${esc(x.t)}</a>`).join('\n');
    }
    return s;
  });
  return `<aside class="toc">
  <div class="toc-head">${esc(cur.dom.num)}</div>
  <nav class="toc-list">${items.join('\n')}</nav>
</aside>`;
};

/** パンくず（ドメインの見出しを1行に畳んだもの）。
 *  重みは節ページには出さない ── 読む順番を決めるときに1回使う数字で、
 *  節を読んでいる最中には要らない（§7 #30）。配点はトップの図が唯一の出所。 */
const crumb = (cur) => `<p class="crumb" data-domain="${cur.dom.key}"><b>${esc(cur.dom.num)}</b><span>${esc(cur.dom.h1)}</span></p>`;

/** 前後の送り。ドメインの境目も越えて、読む順で1本につながる。本文の上と下の2か所に出す。
 *  節名と「4 / 18」の位置表示は出さない ── 左の目次が同じことを示している（§7 #33）。 */
const pager = (i, where) => {
  const prev = pages[i - 1], next = pages[i + 1];
  // 見えるのは矢印だけ。文字は clip-path で視覚的に隠すが、読み上げには残す
  const pv = prev
    ? `<a class="pgv prev" href="../${prev.rel}" title="前へ（← キー）"><span class="vh">前へ</span></a>`
    : `<a class="pgv prev" href="../index.html" title="トップへ（← キー）"><span class="vh">トップへ</span></a>`;
  const nx = next
    ? `<a class="pgv next" href="../${next.rel}" title="次へ（→ キー）"><span class="vh">次へ</span></a>`
    : `<span class="pgv next end"><span class="vh">ここで終わり</span></span>`;
  return `<nav class="secpager ${where}">${pv}${nx}</nav>`;
};

const head = (title, base) => `<!doctype html>
<html lang="ja" data-theme="dark" data-theme-key="${SITE.themeKey}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
${HEADFONT}
<link rel="stylesheet" href="${base}assets/style.css">
</head>`;

const scripts = (base) => `${MODAL}
<script src="${base}assets/quiz-data.js"></script>
<script src="${base}assets/search-index.js"></script>
<script src="${base}assets/app.js"></script>
</body></html>
`;

/** 書き出し。?v= は最後にまとめて打つので、比較のためにこの時点では外した形で比べる */
const writeIfChanged = (full, html) => {
  const before = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
  if (before.replace(/\?v=[0-9a-f]+/g, '') !== html) { fs.writeFileSync(full, html); return 1; }
  return 0;
};

/* ---------- 3. 節ファイルを書き出す ---------- */
let wrote = 0;
pages.forEach((p, i) => {
  const html = `${head(`${p.h2} ─ ${p.dom.num} ─ ${BRAND}`, '../')}
<body data-page="${p.id}">
${THEMEBOOT}
${domnav('../', p.dom.key)}
<div class="shell">
${toc(p)}
<main class="doc">
${crumb(p)}
${pager(i, 'top')}
${OPEN}
${p.body}
${CLOSE}
${pager(i, 'btm')}
</main>
</div>
${scripts('../')}`;
  wrote += writeIfChanged(p.full, html);
});
console.log(`節ファイルを書き出し: ${pages.length} 件（変更 ${wrote} 件）`);

/* ---------- 4. index.html ─ 本文だけ手書き、周りは節ファイルと同じテンプレート ----------
   ccaf-learn では title・フォント・テーマ・検索窓を index.html に手で複製していて、
   テンプレートを直しても index だけ古いまま残った。ここでは本文の目印の外を全部書き出す。 */
const idxPath = path.join(ROOT, 'index.html');
if (!fs.existsSync(idxPath)) throw new Error('docs/index.html がない');
{
  const raw = fs.readFileSync(idxPath, 'utf8');
  const a = raw.indexOf(OPEN), b = raw.indexOf(CLOSE);
  if (a < 0 || b < 0) throw new Error('docs/index.html に本文の目印（▼ 本文 〜 ▲ 本文）がない');
  let body = raw.slice(a + OPEN.length, b).trim();

  // 全項目一覧 ─ 全項をひとつに並べる（読む順）。項数は出さない（§7 #39）
  const allList = DOMAINS.map(d => {
    const list = pages.filter(p => p.dom.dir === d.dir);
    const items = list.length
      ? list.map(p => `<li>${itemLink(p, { href: p.rel, cls: 'al-link' })}</li>`).join('')
      : '<li class="al-none">（まだ項がありません）</li>';
    return `<section class="al-dom" data-domain="${d.key}">
  <h3><span class="al-num">${esc(d.num)}</span><a href="${entry[d.dir]}">${esc(d.h1)}</a></h3>
  <ul class="al-list">${items}</ul>
</section>`;
  }).join('\n');
  body = body.replace(/<!--#alllist-->[\s\S]*?<!--\/#alllist-->/,
                      () => `<!--#alllist--><div class="alllist">${allList}</div><!--/#alllist-->`);
  body = fillAll(body);

  const html = `${head(`トップ ─ ${BRAND}`, '')}
<body>
${THEMEBOOT}
${domnav('', null)}
${OPEN}
${body}
${CLOSE}
${scripts('')}`;
  const w = writeIfChanged(idxPath, html);
  console.log(`index.html を書き出し（変更 ${w} 件）`);
}

/* ---------- 5. 検索インデックス ---------- */
const index = pages.map(p => ({
  f: p.rel,
  d: p.dom.num,
  id: p.id,
  t: p.h2,
  // **本文を切らない。** 切ると末尾が検索に出ず、「見つからない」と「載っていない」が
  // 区別できないまま**黙って落ちる**（§7 #97）
  x: p.body
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ')     // 図の中の文字は検索対象外
    .replace(/<[^>]*>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim(),
}));
const out = path.join(ROOT, 'assets/search-index.js');
fs.writeFileSync(out, 'window.SEARCH_INDEX = ' + JSON.stringify(index) + ';\n');
console.log(`検索インデックスを更新: ${index.length} セクション / ${Math.round(fs.statSync(out).size / 1024)}KB`);

/* ---------- 6. ?v=<ハッシュ> を打つ ---------- */
const ASSETS = ['style.css', 'app.js', 'quiz-data.js', 'search-index.js'];
const ver = {};
ASSETS.forEach(a => {
  const pth = path.join(ROOT, 'assets', a);
  if (!fs.existsSync(pth)) { console.warn('⚠ 見つかりません: assets/' + a); return; }
  ver[a] = crypto.createHash('sha1').update(fs.readFileSync(pth)).digest('hex').slice(0, 8);
});
let touched = 0;
[...pages.map(p => p.full), idxPath].forEach(full => {
  const before = fs.readFileSync(full, 'utf8');
  let after = before;
  Object.entries(ver).forEach(([a, v]) => {
    after = after.replace(
      new RegExp('assets/' + a.replace('.', '\\.') + '(\\?v=[0-9a-f]+)?', 'g'),
      'assets/' + a + '?v=' + v);
  });
  if (after !== before) { fs.writeFileSync(full, after); touched++; }
});
console.log(`資産のバージョンを更新: ${Object.entries(ver).map(([a, v]) => a + '@' + v).join(' ')}`);
console.log(`  → 打ち直した HTML: ${touched} 件`);
