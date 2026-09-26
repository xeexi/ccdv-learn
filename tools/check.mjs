/* =========================================================
   静的チェック — 過去に実際に起きた不具合の再発を検出する

     ./tools/x check                         （mise run check でも同じ）
     ./tools/x check --dirs=05-models,02-apps  網羅系を、書き終えたディレクトリだけに絞る
     ./tools/x check --dirs=none               網羅系を見ない（まだ1ドメインも書いていないとき）

   依存パッケージなし（Node 18+）。ブラウザは使わない。

   **どの検査も「対象が何件あったか」を出す。対象0件は ✗ にする**（§7 #37）──
   0件のまま ✓ が出ると、通ったのか見ていないのかが区別できない。
   節がまだ無いうちは、汎用の検査が「対象0件」で落ちるのが正しい。
   網羅系（スキル・トピック・分量・設問の按分）だけは --dirs で明示的に外せる。
   ========================================================= */
import fs from 'fs';
import path from 'path';
import { GUIDE, EXAM, DOMAINS as BP_DOM, SKILLS, GLUE, COVER, PREPARE, TRAPS, SAMPLES, QUALIFIERS,
  GLOSSARY, QUOTES, TERMS as EN_TERMS, CAST, domainItems, skillQuiz, pct } from './blueprint.mjs';
import { DIRS, QUIZ as QCONF } from './site.mjs';

/* 成果物（HTML と assets）は docs/ の下。tools/ と CLAUDE.md はリポジトリ直下 */
const REPO = path.resolve(new URL('..', import.meta.url).pathname);
const ROOT = path.join(REPO, 'docs');

/* 節ファイルの一覧。**並びは site.mjs の読む順**（ディレクトリ名の順ではない）。
   既習の判定（検査4）はこの順で「前」を決める ── reindex と別の順で並べると黙って誤る。 */
const FILES = DIRS.flatMap(d => {
  const full = path.join(ROOT, d.dir);
  return fs.existsSync(full)
    ? fs.readdirSync(full).filter(f => f.endsWith('.html')).sort().map(f => d.dir + '/' + f)
    : [];
});
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const bodyOf = (f) => (read(f).match(/▼ 本文[^\n]*-->([\s\S]*?)<!-- ▲ 本文/) || [])[1] || '';
const dirOf = (f) => DIRS.find(d => f.startsWith(d.dir + '/'));

/* 網羅系の対象ディレクトリ。既定は全部 */
const argDirs = (process.argv.find(a => a.startsWith('--dirs=')) || '').slice(7);
const SCOPE_DIRS = new Set(argDirs === 'none' ? [] : argDirs ? argDirs.split(',') : DIRS.map(d => d.dir));
argDirs && argDirs !== 'none' && [...SCOPE_DIRS].forEach(x => {
  if (!DIRS.some(d => d.dir === x)) { console.log(`--dirs に知らないディレクトリ: ${x}`); process.exit(2); }
});
const skillDir = (k) => DIRS.find(d => d.key === SKILLS[k].d).dir;
const inScope = (k) => SCOPE_DIRS.has(skillDir(k));
const summaryDir = DIRS.find(d => !BP_DOM[d.key]).dir;

let ng = 0;
const bad = (msg) => { console.log('  ✗ ' + msg); ng++; };
/** 対象の件数を出す。0件なら ✗（見ていない）。n0 はこの検査に入る前の ng */
const done = (n0, n, okMsg) => {
  if (!n) bad('対象0件 ── 何も見ていない（節が未作成なら正常）');
  else if (ng === n0) console.log('  ✓ ' + okMsg);
};
const head = (t) => console.log('\n■ ' + t);

/* 節の単位に切ったもの（1ファイル＝1節）。quiz は data-quiz のキー、quizOnly は設問だけの項 */
const order = [];
FILES.forEach(f => {
  read(f).split(/(?=<section class="sec)/).filter(s => /^<section class="sec/.test(s))
    .forEach(sec => order.push({
      f, id: (sec.match(/id="([^"]+)"/) || [])[1],
      quiz: (sec.match(/data-quiz="([^"]*)"/) || [])[1],
      quizOnly: /^<section class="sec sec-quiz/.test(sec),
      skills: ((sec.match(/<p class="task" data-s="([^"]+)"/) || [])[1] || '').trim().split(/\s+/).filter(Boolean),
      body: sec,
    }));
});
const allIds = new Set(order.map(s => s.id));
const textOf = (html) => html.replace(/<[^>]+>/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

const quizJs = fs.readFileSync(path.join(ROOT, 'assets/quiz-data.js'), 'utf8');
const QUIZ = new Function(quizJs.replace(/^[\s\S]*?window\.QUIZ\s*=\s*/, 'return ') + ';')();
const correctOf = (x) => [].concat(x.a);

/* --- 1. 図の色が固定値のまま残っていないか -----------------------
   色は必ず var(--fig-*) で書く。直接書くとテーマ切替で色が変わらない。
   本文の inline style と SVG 属性の両方から色リテラルを探す。 */
head('[1] 図の色（CSS変数になっているか）');
{
  const n0 = ng; let n = 0;
  const COLOR_LIT = /#[0-9A-Fa-f]{3,8}\b|rgba?\(|hsla?\(|\b(?:red|blue|green|orange|yellow|purple|pink|gray|grey|black|white|cyan|magenta|brown|navy|teal|olive|lime|maroon|silver|gold)\b/i;
  const hideVars = v => v.replace(/var\(\s*--[\w-]+\s*(?:,[^()]*)?\)/g, 'VAR');
  FILES.forEach(f => {
    const body = bodyOf(f);
    [...[...body.matchAll(/\sstyle="([^"]*)"/g)].map(m => ['style', m[1]]),
     ...[...body.matchAll(/\s(fill|stroke)="([^"]*)"/g)].map(m => [m[1], m[2]])].forEach(([where, v]) => {
      n++;
      const m = hideVars(v).match(COLOR_LIT);
      if (m) bad(`${f}: ${where} に固定色「${m[0]}」（var(--fig-*) を使う） → ${v.slice(0, 60)}`);
    });
  });
  // inline style が1つも無いのは正常なので、見た本文の数で数える
  done(n0, FILES.length, `本文 ${FILES.length} ファイルの inline style / SVG 属性 ${n} 箇所すべて、色は var() 参照`);
}

/* --- 2. 位置で指していないか・道具の話をしていないか -------------------
   本文が位置（前ページ・前節・最初の図）に依存すると、節を並べ替えたときに黙って壊れる。
   指したいときは**節の名前でリンクする**（リンク切れは検査21が捕まえる）。 */
head('[2] 位置参照と、実装の話');
{
  const n0 = ng;
  const NG_WORDS = /前ページ|次ページ|前の章|次の章|1ページ＝|☰|前節|次節|前の節|次の節|直前の節|上の節|下の節|最初の図|前の図|reindex|blueprint|check\.mjs|照合します/g;
  const files = [...FILES, 'index.html'];
  files.forEach(f => {
    const body = f === 'index.html' ? (read(f).match(/▼ 本文[^\n]*-->([\s\S]*?)<!-- ▲ 本文/) || [])[1] || '' : bodyOf(f);
    // 差し込み（<!--#名前-->…<!--/#名前-->）の中身は blueprint.mjs の原文から作る生成物なので、手書きの本文だけを見る
    (body.replace(/<!--#([a-z]+)-->[\s\S]*?<!--\/#\1-->/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ').match(NG_WORDS) || []).forEach(w => bad(`${f}: 「${w}」が本文に残っている`));
  });
  done(n0, files.length, `${files.length} ファイルの本文に、位置参照も道具の話もない`);
}

/* --- 3. 注記が、図やコードの文言をそのまま繰り返していないか --------
   同じことを2度読ませるだけになる（§7 #3）。用語の重複は正常で、日本語の文まるごとが問題。 */
head('[3] 注記と図の重複');
{
  const n0 = ng; let n = 0; const gray = [];
  const strip = s => s.replace(/<[^>]*>/g, '').replace(/[\s　]+/g, '');
  const lcs = (a, b) => {
    let best = '';
    for (let i = 0; i < a.length; i++) for (let j = i + 14; j <= a.length; j++) {
      const s = a.slice(i, j);
      if (b.includes(s)) { if (s.length > best.length) best = s; } else break;
    }
    return best;
  };
  FILES.forEach(f => {
    bodyOf(f).split(/(?=<div class="figbox")/).forEach(box => {
      const notes = [...box.matchAll(/<li><span class="n">(\d+)<\/span><span>([\s\S]*?)<\/span><\/li>/g)];
      if (!notes.length) return;
      const code = box.match(/<pre class="code">[\s\S]*?<\/pre>/g) || [];
      const comments = code.flatMap(c => [...c.matchAll(/<span class="c">([\s\S]*?)<\/span>/g)].map(m => strip(m[1])));
      const others = box.replace(/<ol class="ann">[\s\S]*?<\/ol>/g, '').replace(/<pre class="code">[\s\S]*?<\/pre>/g, '');
      const otherTxt = [
        ...[...others.matchAll(/<(?:b|span|p)\s+class="(?:fig-h|fig-note|fig-t|fig-f|fig-lbl|codelabel|sq-lbl|sq-note|fig-do)"[^>]*>([\s\S]*?)<\/(?:b|span|p)>/g)].map(m => strip(m[1])),
        ...comments,
      ].join('｜');
      if (!otherTxt) return;
      notes.forEach(m => {
        n++;
        const s2 = lcs(strip(m[2]), otherTxt);
        if (!/[ぁ-んァ-ヶ一-龠]{6,}/.test(s2)) return;
        if (s2.length >= 18) bad(`${f}: 番号${m[1]}「${s2}」が図と丸かぶり`);
        else if (s2.length >= 14) gray.push(`${f}: 番号${m[1]}「${s2}」`);
      });
    });
  });
  // 注記の無い本文は正常なので、見た本文の数で数える
  done(n0, FILES.length, `本文 ${FILES.length} ファイル・注記 ${n} 件に丸写しなし`);
  if (gray.length) { console.log(`  △ 要確認 ${gray.length} 件（図の語句を引用して指しているだけなら問題なし）`); gray.forEach(g => console.log('     ' + g)); }
}

/* --- 4. 設問が、その節より後の内容を問うていないか ---------------------
   「前」は**読む順**（site.mjs）で決める。誤答の選択肢は対象外（未習の語が出てよい）。
   識別子はドメインを書くときに足す ── 本文で説明してから設問に使う語だけ。 */
head('[4] 設問の出題範囲（既習か）');
{
  const n0 = ng; let n = 0;
  const TERMS = ['tool_use', 'tool_result', 'stop_reason', 'end_turn', 'input_schema', 'tool_choice',
    'cache_control', 'is_error', 'max_tokens', 'temperature', 'custom_id', '.mcp.json', 'CLAUDE.md',
    'settings.json', 'stdio', 'PreToolUse', 'PostToolUse'];
  const firstAt = {};
  TERMS.forEach(t => { const i = order.findIndex(s => !s.quiz && s.body.includes(t)); if (i >= 0) firstAt[t] = i; });
  order.forEach((s, i) => {
    if (!s.quiz || !QUIZ[s.quiz]) return;
    QUIZ[s.quiz].forEach((item, qi) => {
      n++;
      const core = [item.q, ...correctOf(item).map(a => item.o[a]), item.e].join(' ||| ');
      TERMS.forEach(t => {
        if (!core.includes(t)) return;
        if (firstAt[t] === undefined || firstAt[t] > i) bad(`${s.f} ${s.quiz} Q${qi + 1}: 「${t}」の説明はこの設問より後（または本文になし）`);
      });
    });
  });
  done(n0, n, `設問 ${n} 問すべて既習範囲内（読む順で判定）`);
}

/* --- 5. 設問の見出しの規約 ---------------------------------------------
   設問だけの項の見出しは「N-M　理解度チェック ─ 副題」。副題は数に関係なく必ず付ける（§7 #36）。 */
head('[5] 設問の見出し');
{
  const n0 = ng;
  const qs = order.filter(s => s.quizOnly);
  qs.forEach(s => {
    const h2 = ((s.body.match(/<h2>([\s\S]*?)<\/h2>/) || ['', ''])[1]).replace(/<[^>]*>/g, '').trim();
    if (!/^\S+\s*理解度チェック/.test(h2)) bad(`${s.f}: 設問の見出しが「理解度チェック」で始まっていない → ${h2}`);
    else if (!h2.includes('─')) bad(`${s.f}: 副題がない → ${h2}`);
  });
  done(n0, qs.length, `設問だけの項 ${qs.length} 件すべて規約どおり`);
}

/* --- 6. HTML から参照されていない設問キーが残っていないか --------------- */
head('[6] 設問データの参照');
{
  const n0 = ng;
  const used = new Set(order.map(s => s.quiz).filter(Boolean));
  Object.keys(QUIZ).filter(k => !used.has(k)).forEach(k => bad(`設問キー ${k}（${QUIZ[k].length}問）が、どの HTML からも参照されていない`));
  [...used].filter(k => !QUIZ[k]).forEach(k => bad(`data-quiz="${k}" に対応する設問データがない`));
  done(n0, used.size, `${used.size} キーすべて対応（設問 ${Object.values(QUIZ).reduce((a, b) => a + b.length, 0)} 問）`);
}

/* --- 7. ゴール（.goal）が、あるか・見出しの直下にあるか ---------------
   節の頭だけでなく、新しい知識を教える小見出し（h3.sub）にも必ず置く（§7 #77）。 */
head('[7] ゴール');
{
  const n0 = ng; let goalN = 0, subN = 0;
  const bodySecs = order.filter(s => !s.quizOnly);
  bodySecs.forEach(s => {
    if (!/class="goal"/.test(s.body)) { bad(`${s.f} #${s.id}: ゴール（.goal）がない`); return; }
    const seq = [...s.body.matchAll(/<\/header>|<h3 class="sub"[^>]*>|<p class="(lead|task|goal|cast)"/g)];
    for (let i = 0; i < seq.length; i++) {
      if (seq[i][1] !== 'goal') continue;
      goalN++;
      const prev = seq[i - 1];
      if (prev && prev[1]) bad(`${s.f}: ゴールの前に .${prev[1]} がある（見出しの直下に置く）`);
    }
  });
  bodySecs.filter(s => !s.quiz).forEach(s => {
    const clean = s.body.replace(/<!--#[\s\S]*?<!--\/#[a-z]+-->/g, ' ');
    clean.split(/(?=<h3 class="sub")/).slice(1).forEach(part => {
      if (/class="goal"/.test(part)) { subN++; return; }
      const h = ((part.match(/<h3 class="sub"[^>]*>([\s\S]*?)<\/h3>/) || [])[1] || '').replace(/<[^>]+>/g, '');
      bad(`${s.f}: 小見出し「${h}」にゴールがない`);
    });
  });
  done(n0, bodySecs.length, `本文 ${bodySecs.length} 節すべてにあり、ゴール ${goalN} 件（うち小見出し ${subN} 件）すべて見出しの直下`);
}

/* --- 8. スキルの札（.task）------------------------------------------
   札は「DOMAIN n ＋ スキルの原文の名前」。**スキルに番号は無い**ので作らない。
   属性まで含めて拾う（`<p class="task">` だけを見て0件のまま ✓ が出た・§7 #96）。 */
head('[8] スキルの札');
{
  const n0 = ng; let n = 0, tags = 0;
  order.forEach(s => {
    for (const m of s.body.matchAll(/<p class="task"([^>]*)>([\s\S]*?)<\/p>/g)) {
      n++;
      const want = ((m[1].match(/data-s="([^"]+)"/) || [])[1] || '').trim().split(/\s+/).filter(Boolean);
      if (!want.length) { bad(`${s.f}: .task に data-s が無い`); continue; }
      const got = [...m[2].matchAll(/<span class="tn">([^<]*)<\/span><b>([^<]*)<\/b>/g)].map(x => [x[1], x[2]]);
      tags += got.length;
      const exp = want.map(k => SKILLS[k] ? [`DOMAIN ${BP_DOM[SKILLS[k].d].n}`, SKILLS[k].name.replace(/&/g, '&amp;')] : ['?', k]);
      if (JSON.stringify(got) !== JSON.stringify(exp)) bad(`${s.f} #${s.id}: 札（${got.map(x => x.join(' ')).join(' / ') || 'なし'}）が data-s="${want.join(' ')}" と合わない`);
    }
  });
  [...FILES, 'index.html'].forEach(f => { if (read(f).includes('ブループリント対応なし')) bad(`${f}: 「ブループリント対応なし」が残っている`); });
  done(n0, n, `.task ${n} 件・札 ${tags} 枚すべて「DOMAIN n ＋ 原文の名前」で、data-s と一致`);
}

/* --- 9. スキルとトピックの網羅（COVER）----------------------------------
   各スキルに対応する節があるか、その節に札があるか、そして
   **説明文に列挙された133項目（topics）が、そのスキルの節の中で**本文に出ているか。
   本文全体で探すと、関係のない節で偶然当たって通ってしまう（ccaf-learn §7 #69）。 */
head('[9] スキルとトピックの網羅');
{
  const n0 = ng; let n = 0, tn = 0; const skipped = [];
  const txtOf = Object.fromEntries(order.filter(s => !s.quiz).map(s => [s.id, textOf(s.body)]));
  Object.entries(SKILLS).forEach(([k, sk]) => {
    if (!inScope(k)) { skipped.push(k); return; }
    n++;
    const cv = COVER[k];
    if (!cv || !cv.sections || !cv.sections.length) { bad(`スキル「${sk.name}」に対応する節が COVER に無い（未作成）`); return; }
    cv.sections.forEach(id => {
      const s = order.find(x => x.id === id);
      if (!s) bad(`スキル「${sk.name}」の節 id「${id}」が存在しない`);
      else if (!s.skills.includes(k)) bad(`${s.f} #${id}: スキル「${sk.name}」の節なのに、札（data-s）に ${k} が無い`);
    });
    const hay = cv.sections.map(id => txtOf[id] || '').join('\n');
    Object.keys(cv.topics || {}).filter(t => !sk.topics.includes(t))
      .forEach(t => bad(`スキル「${sk.name}」の COVER に原文に無いトピック「${t}」がある`));
    sk.topics.forEach(t => {
      tn++;
      const re = (cv.topics || {})[t];
      if (!re) { bad(`「${sk.name}」のトピック「${t}」の正規表現が COVER に無い`); return; }
      const res = (Array.isArray(re) ? re : [re]).map(x => new RegExp(x));
      const miss = res.findIndex(r => !r.test(hay));
      if (miss >= 0) bad(`「${sk.name}」のトピック「${t}」が、対応節（${cv.sections.join(' / ')}）の本文に無い${res.length > 1 ? `（条件 ${miss + 1}/${res.length}）` : ''}`);
      else {
        const where = cv.sections.filter(id => res.some(r => r.test(txtOf[id] || '')));
        console.log(`     ${sk.name} ／ ${t} → ${where.join(' / ')}`);
      }
    });
  });
  if (skipped.length) console.log(`  ⏭ --dirs で除外: ${skipped.length} スキル`);
  // 数えるのは対象のスキル数（対応節が無いスキルはトピックを数える前に ✗ 済みなので、トピック数で数えると ✗ が重なる）
  if (n) done(n0, n, `${n} スキル・トピック ${tn} 項目すべて、対応する節の本文にあり（原文の列挙と1対1）`);
  else console.log('  ⏭ 対象のスキルなし（--dirs）');
}

/* --- 10. ブループリントの内部整合 ---------------------------------
   blueprint.mjs は手で直すファイルなので、**直したときに辻褄が合うか**を見る。
   topics は原文の説明文から切り出したもの ── ①そのまま在る ②重ならない
   ③取り除くと GLUE の語だけが残る（＝取りこぼしが無い）。 */
head('[10] ブループリントの内部整合');
{
  const n0 = ng;
  const keys = Object.keys(BP_DOM);
  const wsum = keys.reduce((a, k) => a + BP_DOM[k].w, 0);
  if (wsum !== 1000) bad(`ドメインの重みの合計が ${pct(wsum)}（100.0% でない）`);
  const ns = keys.map(k => BP_DOM[k].n).sort((a, b) => a - b);
  if (ns.join() !== ns.map((_, i) => i + 1).join()) bad(`ドメイン番号が 1..${keys.length} の連番でない → ${ns.join()}`);
  const di = domainItems();
  const isum = Object.values(di).reduce((a, b) => a + b, 0);
  if (isum !== EXAM.items) bad(`按分した問数の合計が ${isum}（EXAM.items = ${EXAM.items}）`);
  keys.forEach(k => {
    const sum = Object.values(SKILLS).filter(s => s.d === k).reduce((a, s) => a + s.w, 0);
    if (sum !== BP_DOM[k].w) bad(`Domain ${BP_DOM[k].n} のスキルの重みの合計 ${pct(sum)} が、ドメインの ${pct(BP_DOM[k].w)} と合わない`);
  });
  let topicN = 0;
  Object.entries(SKILLS).forEach(([k, s]) => {
    if (!BP_DOM[s.d]) { bad(`スキル ${k} が知らないドメイン「${s.d}」を指している`); return; }
    const parts = [...s.groups, ...s.topics];
    topicN += s.topics.length;
    parts.forEach(p => { const c = s.desc.split(p).length - 1; if (c !== 1) bad(`${k}: 「${p}」が説明文に ${c} 回（ちょうど1回のはず）`); });
    // 見つからない句（上で ✗ 済み）は位置の計算から外す ── -1 のまま使うと、重なりと残りが誤って出る
    const spans = parts.filter(p => s.desc.includes(p)).map(p => [s.desc.indexOf(p), s.desc.indexOf(p) + p.length, p]).sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < spans.length; i++) if (spans[i][0] < spans[i - 1][1]) bad(`${k}: 「${spans[i - 1][2]}」と「${spans[i][2]}」が重なっている`);
    let rest = s.desc;
    spans.slice().reverse().forEach(([a, b]) => { rest = rest.slice(0, a) + ' ' + rest.slice(b); });
    const left = rest.replace(/[(),.;:]/g, ' ').split(/\s+/).filter(w => w && w !== 'e.g.' && !GLUE.includes(w));
    if (left.length) bad(`${k}: 説明文の「${left.join(' ')}」がどの項目にも入っていない（取りこぼし）`);
  });
  // 例題 ─ 設問文は持たないので、持っている「分類」だけが壊れていないかを見る
  if (SAMPLES.length !== EXAM.sampleQuestions) bad(`SAMPLES が ${SAMPLES.length} 問（EXAM.sampleQuestions = ${EXAM.sampleQuestions}）`);
  const trapUse = {};
  SAMPLES.forEach(s => {
    // 例題はどれも4択・1つ選ぶ。誤答の数は「選択肢の数 − 正解の数」
    if (s.traps.length !== 4 - 1) bad(`例題 Sample ${s.n} の誤答の型が ${s.traps.length} 個（4択・1つ選ぶので3個）`);
    if (!BP_DOM[s.d]) bad(`例題 Sample ${s.n} が知らないドメイン「${s.d}」を指している`);
    s.traps.forEach(t => { if (!TRAPS[t]) bad(`例題 Sample ${s.n} が知らない誤答の型「${t}」を指している`); else trapUse[t] = (trapUse[t] || 0) + 1; });
    s.sections.forEach(id => { if (!allIds.has(id)) bad(`例題 Sample ${s.n} の戻り先「${id}」が存在しない`); });
    if (SCOPE_DIRS.has(summaryDir) && !s.sections.length) bad(`例題 Sample ${s.n} の戻り先が無い（まとめを書くときに足す）`);
  });
  Object.keys(TRAPS).forEach(t => { if (!trapUse[t]) bad(`誤答の型「${TRAPS[t].ja}」がどの例題からも指されていない`); });
  // 本文に手で書いた「例題N問」が、SAMPLES の実数と合っているか
  [...FILES, 'index.html'].forEach(f => {
    const body = f === 'index.html' ? read(f) : bodyOf(f);
    for (const m of body.matchAll(/例題(?:が)?\s*(\d+)\s*問/g)) if (+m[1] !== SAMPLES.length) bad(`${f} の「${m[0]}」が SAMPLES の ${SAMPLES.length} 問と合わない`);
  });
  if (!/^[0-9a-f]{64}$/.test(GUIDE.sha256)) bad('GUIDE.sha256 が64桁の16進でない');
  if (!PREPARE.length || !QUALIFIERS.length) bad('PREPARE / QUALIFIERS が空');
  done(n0, Object.keys(SKILLS).length,
    `ドメイン ${keys.length}・スキル ${Object.keys(SKILLS).length}（トピック ${topicN}）・例題 ${SAMPLES.length} 問（誤答 ${Object.values(trapUse).reduce((a, b) => a + b, 0)} 個を ${Object.keys(TRAPS).length} 型に分類）すべて辻褄が合う（${GUIDE.code} v${GUIDE.version}・問数 ${Object.entries(di).map(([k, v]) => `D${BP_DOM[k].n}=${v}`).join(' ')}）`);
}

/* --- 11. スキルが、本文の札から参照されているか ---------------------------
   逆向き（札にあって SKILLS に無いキー）は reindex が throw する。こちら向き ──
   **スキルがあるのに、どの節の札にも出てこない** ── は何も落ちずに通ってしまう（§7 #60）。
   あわせて、札を付けた節が COVER に載っているか（札と COVER の食い違い）も見る。 */
head('[11] スキルの参照（札 ⇄ COVER）');
{
  const n0 = ng; let n = 0;
  const used = {};
  order.forEach(s => s.skills.forEach(k => { (used[k] = used[k] || []).push(s.id); }));
  Object.entries(SKILLS).forEach(([k, sk]) => {
    if (!inScope(k)) return;
    n++;
    if (!used[k]) bad(`スキル「${sk.name}」を札に持つ節がない（未作成）`);
    (used[k] || []).forEach(id => { if (!((COVER[k] || {}).sections || []).includes(id)) bad(`#${id} が「${sk.name}」の札を持つのに、COVER の sections に無い`); });
  });
  if (n) done(n0, n, `${n} スキルすべて、札と COVER の両方に節がある`);
  else console.log('  ⏭ 対象のスキルなし（--dirs）');
}

/* --- 12. 分量の釣り合い ------------------------------------------------
   Out-of-Scope リストが無い試験なので、「厚く教えすぎ」「薄すぎ」は重みとの比で見る。
   節の本文の文字数を、その節の札のスキルに等分し、**ドメインの中で**重みの比と比べる
   （書きかけのドメインがあっても使えるように、ドメイン内で正規化する）。
   比が RATIO_MAX 倍を超えるか、1/RATIO_MAX を下回ったら落とす。
   RATIO_MAX は、全ドメインを書き終えた時点の実測（0.56〜1.89 倍）のすぐ外に置いた（§7 #38）。
   いちばん厚いスキルがさらに厚くなる・いちばん薄いスキルがさらに薄くなる崩れを捕まえるため。 */
head('[12] 分量の釣り合い（スキルの重みとの比）');
{
  const n0 = ng; let n = 0;
  const RATIO_MAX = 2.0;
  const len = {};
  order.filter(s => !s.quiz && s.skills.length).forEach(s => {
    const c = textOf(s.body).replace(/\s+/g, '').length;
    s.skills.forEach(k => { len[k] = (len[k] || 0) + c / s.skills.length; });
  });
  Object.keys(BP_DOM).forEach(d => {
    const ks = Object.keys(SKILLS).filter(k => SKILLS[k].d === d);
    if (!ks.every(inScope) || ks.length < 2) return;
    const tot = ks.reduce((a, k) => a + (len[k] || 0), 0);
    if (!tot) return;
    n++;
    const rows = ks.map(k => {
      const share = (len[k] || 0) / tot, want = SKILLS[k].w / BP_DOM[d].w, r = share / want;
      if (r > RATIO_MAX || r < 1 / RATIO_MAX) bad(`Domain ${BP_DOM[d].n}「${SKILLS[k].name}」の分量が重みの ${r.toFixed(2)} 倍（文字 ${Math.round(share * 100)}% ／ 重み ${Math.round(want * 100)}%）`);
      return `${SKILLS[k].name} ${r.toFixed(2)}`;
    });
    console.log(`     Domain ${BP_DOM[d].n}: ${rows.join(' ／ ')}`);
  });
  if (n) done(n0, n, `${n} ドメインで、スキルの分量が重みの 1/${RATIO_MAX}〜${RATIO_MAX} 倍に収まっている`);
  else console.log('  ⏭ 対象のドメインなし（スキルが2つ以上あり、書き終えたドメインだけを見る）');
}

/* --- 13. 設問の按分 ------------------------------------------------------
   1問ずつ s（スキル）を持つので、按分は設問データから数える。
   本文（ドメインのディレクトリ）の設問 … スキルの重みで QCONF.total 問を按分した数と一致すること
   模擬試験（キーが QCONF.mock で始まる）… **回ごとに**、ドメインの重みで本番の問数を按分した数と一致すること */
head('[13] 設問の按分（スキル・ドメインの重みどおりか）');
{
  const n0 = ng; let n = 0;
  const want = skillQuiz(QCONF.total), got = {};
  const mockGot = {};   // 回（設問キー）ごとの { ドメイン: 問数 }
  order.forEach(s => {
    if (!s.quiz || !QUIZ[s.quiz]) return;
    const inDomain = !!BP_DOM[dirOf(s.f).key];
    QUIZ[s.quiz].forEach((x, i) => {
      if (!SKILLS[x.s]) { bad(`設問キー ${s.quiz} Q${i + 1}: s="${x.s}" が知らないスキル`); return; }
      if (s.quiz.startsWith(QCONF.mock)) { const m = (mockGot[s.quiz] = mockGot[s.quiz] || {}); m[SKILLS[x.s].d] = (m[SKILLS[x.s].d] || 0) + 1; }
      else if (inDomain) got[x.s] = (got[x.s] || 0) + 1;
    });
  });
  Object.keys(SKILLS).filter(inScope).forEach(k => {
    n++;
    if ((got[k] || 0) !== want[k]) bad(`「${SKILLS[k].name}」の設問が ${got[k] || 0} 問、重みどおりなら ${want[k]} 問（総数 ${QCONF.total} を按分・§7 #40）`);
  });
  if (SCOPE_DIRS.has(summaryDir)) {
    const di = domainItems();
    const keys = Object.keys(QUIZ).filter(k => k.startsWith(QCONF.mock));
    if (!keys.length) bad('模擬試験の設問キーが無い');
    keys.forEach(k => {
      const got = mockGot[k] || {};
      const tot = Object.values(got).reduce((a, b) => a + b, 0);
      Object.keys(BP_DOM).forEach(d => { if ((got[d] || 0) !== di[d]) bad(`模擬試験 ${k} の Domain ${BP_DOM[d].n} が ${got[d] || 0} 問、本番の按分なら ${di[d]} 問`); });
      if (tot !== EXAM.items) bad(`模擬試験 ${k} が ${tot} 問（本番は ${EXAM.items} 問）`);
    });
  }
  if (n) done(n0, n, `${n} スキルの設問数が重みどおり（総数 ${QCONF.total} の按分）${SCOPE_DIRS.has(summaryDir) ? `・模擬試験 ${Object.keys(mockGot).length} 回も、各回 ${EXAM.items} 問がドメインの按分どおり` : ''}`);
  else console.log('  ⏭ 対象のスキルなし（--dirs）');
}

/* --- 14. 図の中に、文が入り込んでいないか ----------------------------
   ラベルであるべき場所に文章が入ると、図の速さ（一目で分かる）が失われる（§7 #11）。
   閾値は ccaf-learn の実測分布から決めた上限。`<code>` だけのラベルは対象外。 */
head('[14] 図の中の文の長さ');
{
  const n0 = ng; let n = 0;
  const LEN_MAX = { 'fig-h': 24, 'fig-note': 48, 'fig-do': 48, 'sq-note': 60 };
  FILES.forEach(f => {
    const body = bodyOf(f);
    Object.entries(LEN_MAX).forEach(([cls, max]) => {
      for (const m of body.matchAll(new RegExp('<(?:b|span)\\s+class="' + cls + '"[^>]*>([\\s\\S]*?)</(?:b|span)>', 'g'))) {
        n++;
        if (!m[1].replace(/<code>[\s\S]*?<\/code>/g, '').replace(/<[^>]*>/g, '').replace(/[\s　]+/g, '')) continue;
        const c = [...m[1].replace(/<[^>]*>/g, '').replace(/[\s　]+/g, '')].length;
        if (c > max) bad(`${f}: .${cls} が ${c}字（上限 ${max}字）── 文になっている → 「${m[1].replace(/<[^>]*>/g, '').slice(0, 30)}…」`);
      }
    });
  });
  done(n0, FILES.length, `本文 ${FILES.length} ファイル・図の中の ${n} 箇所すべて上限内`);
}

/* --- 15. 丸番号が、指す先を持っているか ------------------------------
   `pre.code` の <span class="n">N</span> と、直後の <ol class="ann"> の番号の集合が一致すること（§7 #31）。 */
head('[15] 丸番号の対応（コードの印 ⇄ 注記）');
{
  const n0 = ng; let n = 0;
  FILES.forEach(f => {
    (bodyOf(f).match(/<div class="figbox"[\s\S]*?<\/div>\s*(?=<|$)/g) || []).forEach(box => {
      if (!/<pre class="code"/.test(box)) return;
      const ol = (box.match(/<ol class="ann">[\s\S]*?<\/ol>/) || [''])[0];
      const marks = [...box.replace(ol, '').matchAll(/<span class="n">(\d+)<\/span>/g)].map(m => +m[1]).sort((a, b) => a - b);
      const notes = [...ol.matchAll(/<span class="n">(\d+)<\/span>/g)].map(m => +m[1]).sort((a, b) => a - b);
      if (marks.length || notes.length) n++;
      if (marks.join() !== notes.join()) bad(`${f}「${(box.match(/codelabel">([^<]*)/) || [, '?'])[1]}」: コードの印 [${marks.join(',') || 'なし'}] と注記 [${notes.join(',') || 'なし'}] が対応していない`);
    });
  });
  done(n0, FILES.length, `本文 ${FILES.length} ファイル・印のある ${n} か所すべてで、コードの番号と注記が一致`);
}

/* --- 16. 設問の形 --------------------------------------------------------
   選択肢は app.js が**描画のたびに混ぜる**（§7 #29）。順序に依存する書き方は解けなくなる。
   1つ選ぶ設問  … 4択、a は範囲内の整数
   複数選ぶ設問 … 5択以上、a は昇順・重複なしの配列で長さ2以上、誤答が3つ以上残ること
                  **要素1つの配列は禁止**（app.js が固まる）。「2つ選べ」を問題文に手で書かない（a から出す）
   s（スキル）は全問に必須。 */
head('[16] 設問の形（選択肢・正解・スキル）');
{
  const n0 = ng; let n = 0, multi = 0;
  const ORDER_WORDS = /(上記|下記|以上のすべて|すべて正しい|上の選択肢|\d+番目|前者|後者|選択肢\s*[A-Z]|[（(][A-Z][）)])/;
  Object.entries(QUIZ).forEach(([k, v]) => v.forEach((x, i) => {
    n++;
    const at = `設問キー ${k} Q${i + 1}`;
    const m = [x.q, ...x.o, x.e].join(' ').match(ORDER_WORDS);
    if (m) bad(`${at}: 「${m[0]}」は選択肢の並びに依存する（混ぜると壊れる）`);
    if (new Set(x.o).size !== x.o.length) bad(`${at}: 選択肢に重複がある`);
    if (/[0-9０-９一二三四五六]\s*つ(を|まで)?\s*選/.test(x.q)) bad(`${at}: 問題文に選ぶ数を手で書いている（正解の数から自動で出る）`);
    if (!SKILLS[x.s]) bad(`${at}: s="${x.s}" が知らないスキル`);
    if (Array.isArray(x.a)) {
      multi++;
      const ok = x.a.length >= 2 && x.a.every((a, j) => Number.isInteger(a) && a >= 0 && a < x.o.length && (j === 0 || a > x.a[j - 1]));
      if (!ok) bad(`${at}: a=${JSON.stringify(x.a)} は「昇順・重複なし・長さ2以上・範囲内」の配列でない`);
      if (x.o.length < 5) bad(`${at}: 複数選ぶ設問なのに選択肢が ${x.o.length} 個（5個以上）`);
      if (x.o.length - x.a.length < 3) bad(`${at}: 誤答が ${x.o.length - x.a.length} 個しかない（3個以上残す）`);
    } else {
      if (!(Number.isInteger(x.a) && x.a >= 0 && x.a < x.o.length)) bad(`${at}: a=${x.a} が選択肢の範囲外`);
      if (x.o.length !== 4) bad(`${at}: 1つ選ぶ設問の選択肢が ${x.o.length} 個（4個にそろえる）`);
    }
  }));
  done(n0, n, `${n}問（うち複数選ぶ ${multi}問）すべて、並びに依存する文言なし・形も正しい`);
}

/* --- 17. 正解だけが長くなっていないか --------------------------------
   正解には理由まで書き、誤答は短く切り捨てるので、正解が独りでに長くなる（§7 #91）。
   直す向きは「選択肢には選ぶものだけを書き、理由は解説（e）へ移す」。
   1問ずつの比（1.5倍まで）に加えて、**全体の偏り**も見る ── 比の上限を守っていても、
   「いちばん長い選択肢が正解」の問が多いと、読まずに長さで当てられる。偶然なら4択で約25%、
   2つ選ぶ5択で約40%なので、10問以上あるときに 40% を超えたら落とす（§7 #104）。 */
head('[17] 正解だけが長くないか');
{
  const n0 = ng; let n = 0, top = 0;
  Object.entries(QUIZ).forEach(([k, v]) => v.forEach((x, i) => {
    n++;
    const L = x.o.map(o => o.length), C = new Set(correctOf(x));
    const maxC = Math.max(...[...C].map(j => L[j])), maxW = Math.max(...L.filter((_, j) => !C.has(j)));
    if (maxC === Math.max(...L)) top++;
    if (maxC > maxW * 1.5) bad(`設問キー ${k} Q${i + 1}: 正解 ${maxC}字 ÷ 誤答の最長 ${maxW}字 = ${(maxC / maxW).toFixed(2)}倍（1.5倍まで。理由を解説へ移す）`);
  }));
  if (n >= 10 && top / n > 0.4) bad(`最長の選択肢が正解の問が ${top}/${n}問（${Math.round(top / n * 100)}%）── 長さで当てられる。正解を短くするか、誤答に具体を足す`);
  done(n0, n, `${n}問すべて、正解は誤答の最長の1.5倍以内（最長が正解だったのは ${top}問 = ${n ? Math.round(top / n * 100) : 0}%・上限 40%）`);
}

/* 原文の英語の集まり ─ 札（data-en）と対訳表（GLOSSARY）の英語は、ここにあるものだけ（§7 #82） */
const CORPUS = [
  ...Object.values(BP_DOM).map(d => d.en),
  ...Object.values(SKILLS).flatMap(s => [s.name, s.desc]),
  ...PREPARE.map(p => p.en),
  ...QUALIFIERS.map(q => q.en.replace(/<[^>]+>/g, '')),
  ...QUOTES,
].join(' ').toLowerCase();

/* --- 18. 原語の札（data-en）------------------------------------------
   ① 英語は原文からしか取らない ② 札は1語につき1回だけ（定義している節に）
   ③ TERMS にあるのに札が無い語を残さない */
head('[18] 原語の札（data-en）');
{
  const n0 = ng;
  Object.entries(EN_TERMS).forEach(([ja, en]) => { if (!CORPUS.includes(en.toLowerCase())) bad(`原語の札「${ja}」の英語 "${en}" が公式の原文にない`); });
  const used = {};
  FILES.forEach(f => [...bodyOf(f).matchAll(/<span data-en="([^"]+)"/g)].forEach(m => {
    if (!EN_TERMS[m[1]]) bad(`${f}: 未知の用語 data-en="${m[1]}"（blueprint.mjs の TERMS にない）`);
    used[m[1]] = (used[m[1]] || 0) + 1;
  }));
  Object.entries(used).forEach(([ja, c]) => { if (c > 1) bad(`原語の札「${ja}」が ${c} 回ある（定義している節に1回だけ）`); });
  Object.keys(EN_TERMS).forEach(ja => { if (!used[ja]) bad(`原語の札「${ja}」が本文のどこにも無い`); });
  // 札が1語も無いのは書きはじめなら正常なので、見た本文の数で数える
  done(n0, FILES.length, `本文 ${FILES.length} ファイル・札 ${Object.keys(EN_TERMS).length} 語すべて、英語は原文由来で1語1回`);
}

/* --- 19. 登場人物の枠（data-cast）------------------------------------
   ① 未知の名前を使っていないか ② 節に2つ以上置いていないか
   ③ やり取りを述べる文が5つ以上あるのに枠が無い節はないか（§7 #95） */
head('[19] 登場人物の枠（data-cast）');
{
  const n0 = ng; let withN = 0, noneN = 0;
  const VERB = /(送(る|り|っ|信)|返(す|し|っ|る)|渡(す|し|さ)|受け取|呼(ぶ|び|ん|ば)|投げ|届(く|け))/;
  FILES.forEach(f => {
    const body = bodyOf(f);
    const specs = [...body.matchAll(/<p class="cast" data-cast="([^"]+)"/g)].map(m => m[1]);
    if (specs.length > 1) bad(`${f}: 登場人物の枠が ${specs.length} 個（節に1つ）`);
    specs.filter(s => s !== 'mixed').forEach(s => s.split(',').forEach(k => { if (!CAST[k]) bad(`${f}: 未知の登場人物 "${k}"`); }));
    if (specs.length) { withN++; return; }
    if (/data-quiz/.test(body) && !/class="point"/.test(body)) return;
    noneN++;
    const prose = body.replace(/<pre[\s\S]*?<\/pre>/g, ' ').replace(/<figure[\s\S]*?<\/figure>/g, ' ').replace(/<table[\s\S]*?<\/table>/g, ' ')
      .replace(/<[^>]+>/g, '').split(/(?<=[。？])/).filter(s => s.length > 8 && VERB.test(s));
    if (prose.length >= 5) bad(`${f}: やり取りを述べる文が ${prose.length} あるのに登場人物の枠が無い`);
  });
  done(n0, FILES.length, `枠あり ${withN} 節は名前が CAST 由来で1節1つ、枠なし ${noneN} 節もやり取りを繰り返し述べていない`);
}

/* --- 20. 本文のタグの釣り合い・属性値の > ------------------------------
   `</div>` が1つ多いと、ブラウザはその節を早じまいする（§7 #28）。
   属性値に `>` を書くと、素朴なタグ除去がそこで早じまいする（§7 #95）。 */
head('[20] 本文のタグの釣り合い');
{
  const n0 = ng; let attrN = 0;
  const files = [...FILES, 'index.html'];
  files.forEach(f => {
    const body = f === 'index.html' ? (read(f).match(/▼ 本文[^\n]*-->([\s\S]*?)<!-- ▲ 本文/) || [])[1] || '' : bodyOf(f);
    ['div', 'section', 'figure', 'table', 'ul', 'ol'].forEach(t => {
      const open = (body.match(new RegExp(`<${t}[\\s>]`, 'g')) || []).length, close = (body.match(new RegExp(`</${t}>`, 'g')) || []).length;
      if (open !== close) bad(`${f}: <${t}> が ${open} 個に対し </${t}> が ${close} 個（${close > open ? '閉じ過ぎ' : '閉じ忘れ'}）`);
    });
    [...body.matchAll(/\s[\w-]+="([^"]*)"/g)].forEach(m => { attrN++; if (m[1].includes('>')) bad(`${f}: 属性値に > がある（${m[0].trim().slice(0, 40)}）`); });
  });
  done(n0, files.length, `${files.length} ファイルの本文でタグが釣り合い、属性 ${attrN} 個の値に > を含まない`);
}

/* --- 21. 本文の中のリンクが、実在する先を指しているか ------------------ */
head('[21] 本文のリンク');
{
  const n0 = ng; let n = 0;
  [...FILES, 'index.html'].forEach(f => {
    const body = f === 'index.html' ? (read(f).match(/▼ 本文[^\n]*-->([\s\S]*?)<!-- ▲ 本文/) || [])[1] || '' : bodyOf(f);
    [...body.matchAll(/href="([^"]+)"/g)].map(m => m[1]).forEach(href => {
      if (/^(https?:|mailto:)/.test(href)) return;
      n++;
      if (href.startsWith('#')) { if (!body.includes(`id="${href.slice(1)}"`)) bad(`${f}: リンク先 ${href} の id が本文にない`); return; }
      if (!fs.existsSync(path.resolve(path.dirname(path.join(ROOT, f)), href.split(/[?#]/)[0]))) bad(`${f}: リンク先 ${href} が存在しない`);
    });
  });
  done(n0, n, `本文のリンク ${n} 本すべて実在する先を指している`);
}

/* --- 22. キー操作の集約・畳む幅の一致 ----------------------------------
   keydown を機能ごとに足すと「入力中か」の判定が散る（§7 #81）。
   ナビと目次を畳む幅は、app.js の matchMedia と style.css の @media が同じ値であること
   （片方だけ直すと、畳んだのにボタンが出ない幅ができる）。 */
head('[22] キー操作の集約・畳む幅');
{
  const n0 = ng;
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'assets/style.css'), 'utf8');
  const kd = (js.match(/document\.addEventListener\(\s*['"]keydown['"]/g) || []).length;
  if (kd !== 1) bad(`app.js の document への keydown が ${kd} か所（1 か所にまとめる）`);
  const mqs = [...js.matchAll(/const (NAV_FOLD|TOC_FOLD) = '([^']+)'/g)];
  if (mqs.length !== 2) bad(`app.js に NAV_FOLD / TOC_FOLD が見つからない（${mqs.length} 個）`);
  mqs.forEach(([, name, q]) => { if (!css.includes(`@media ${q}{`) && !css.includes(`@media ${q} {`)) bad(`app.js の ${name} = ${q} が style.css の @media に無い`); });
  done(n0, kd + mqs.length, `keydown は ${kd} か所、畳む幅 ${mqs.map(m => m[2]).join(' / ')} は CSS と一致`);
}

/* --- 23. 対訳表の英語が、公式の原文から来ているか ----------------------
   私が英語を作ってはいけない（本番で出ない語を覚えることになる）。日本語は名詞句にそろえる。 */
head('[23] 対訳表（英語の出どころ・品詞）');
{
  const n0 = ng;
  GLOSSARY.forEach(g => {
    if (!CORPUS.includes(g.en.toLowerCase())) bad(`対訳「${g.ja}」の英語 "${g.en}" が公式の原文にない`);
    if (/[うくぐすずつぬふぶむる]$/.test(g.ja.replace(/（[^）]*）$/, ''))) bad(`対訳「${g.ja}」が動詞で終わっている（英語が名詞句なので日本語も名詞句に）`);
    if (!BP_DOM[g.d]) bad(`対訳「${g.ja}」が知らないドメイン「${g.d}」を指している`);
  });
  if (SCOPE_DIRS.has(summaryDir)) done(n0, GLOSSARY.length, `対訳 ${GLOSSARY.length} 組すべて、英語は原文にあり、日本語も名詞句`);
  else if (ng === n0) console.log(`  ✓ 対訳 ${GLOSSARY.length} 組（まとめは --dirs の外なので、0組でも落とさない）`);
}

/* --- 24. 「使わない」と決めた書き方が復活していないか --------------------
     ① <details>       学習に有用な情報を折りたたまない（#7）
     ② 個別の max-width 読み幅は容器側で1回だけ決める（#16）
     ③ text-wrap       pretty は iPhone で行末が空き、balance は行が短くなる（#19 #50）
     ④ columns         段組みは読む順が縦→横に折れて追えない（#25）
     ⑤ 2列の表の data-l 左が語・右が説明なら、ラベルは繰り返すだけ（#74 #83）
     ⑥ 設問数の手書き   数は data から。`.lead` には <span class="qcount"></span> を置く（#45） */
head('[24] やめた書き方の復活');
{
  const n0 = ng;
  const idx = (read('index.html').match(/▼ 本文[^\n]*-->([\s\S]*?)<!-- ▲ 本文/) || [])[1] || '';
  const css = fs.readFileSync(path.join(ROOT, 'assets/style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const bodies = FILES.map(f => [f, bodyOf(f)]);
  const all = [...bodies, ['index.html', idx]];
  const hit = (label, list) => list.forEach(f => bad(`${f}: ${label}`));
  hit('<details> で折りたたんでいる（§7 #7）', all.filter(([, b]) => /<details[\s>]/.test(b)).map(([f]) => f));
  hit('本文の要素に max-width がある（§7 #16）', bodies.filter(([, b]) => /style="[^"]*max-width/.test(b)).map(([f]) => f));
  if (/text-wrap:\s*(pretty|balance)/.test(css)) bad('style.css に text-wrap: pretty / balance がある（§7 #19 #50）');
  if (/[^-\w]columns\s*:/.test(css)) bad('style.css に CSS の段組み columns がある（§7 #25）');
  hit('2列の表（.tbl.pair）に data-l がある（§7 #74 #83）',
    all.filter(([, b]) => [...b.matchAll(/<table class="tbl pair">[\s\S]*?<\/table>/g)].some(m => /data-l=/.test(m[0]))).map(([f]) => f));
  hit('設問の項の .lead に問数を手書きしている（§7 #45）',
    bodies.filter(([, b]) => /data-quiz=/.test(b) && /<p class="lead">(?:(?!<\/p>)[\s\S])*?\d+\s*問/.test(b)).map(([f]) => f));
  done(n0, all.length, `${all.length} ファイルと style.css で、やめた6つの書き方はどれも復活していない`);
}

/* --- 25. 丸の中の数字が、行送りで下にずれていないか --------------------
   丸番号（border-radius:50% ＋ place-items:center）には line-height:1 と padding-bottom:1px（§7 #80）。 */
head('[25] 丸番号の中央そろえ');
{
  const n0 = ng; let n = 0;
  const css = fs.readFileSync(path.join(ROOT, 'assets/style.css'), 'utf8');
  for (const m of css.matchAll(/([.#][\w-][^{]*)\{([^}]*)\}/g)) {
    const sel = m[1].trim().replace(/\s+/g, ' '), b = m[2];
    if (!/border-radius:\s*50%/.test(b) || !/place-items:\s*center/.test(b)) continue;
    n++;
    if (!/line-height:\s*1\b/.test(b)) bad(`style.css の ${sel} に line-height:1 がない`);
    else if (!/padding-bottom:\s*1px/.test(b)) bad(`style.css の ${sel} に padding-bottom:1px がない`);
  }
  done(n0, n, `丸番号の規則 ${n} 件すべて、行送りと下寄せを指定している`);
}

/* --- 26. ラベルの中で色を変えて強調していないか ------------------------ */
head('[26] ラベルの中の強調');
{
  const n0 = ng; let n = 0;
  FILES.forEach(f => {
    for (const m of bodyOf(f).matchAll(/<span class="exl">([\s\S]*?)<\/span>/g)) {
      n++;
      if (/<b>/.test(m[1])) bad(`${f}: ラベルの中に <b> がある ── 色ではなく「」で囲う → 「${m[1].replace(/<[^>]+>/g, '').slice(0, 30)}」`);
    }
  });
  done(n0, FILES.length, `本文 ${FILES.length} ファイル・ラベル ${n} 件すべて、中で色を変えていない`);
}

/* --- 27. CLAUDE.md が書いた節番号が、その節を指しているか ---------------
   「番号 ＋ すぐ後ろの語」が、どこかの節の題の先頭と5字以上一致するのに、
   書かれた番号の節ではないときに落とす（§7 #72）。 */
head('[27] CLAUDE.md の節参照');
{
  const n0 = ng; let n = 0;
  const md = fs.readFileSync(path.join(REPO, 'CLAUDE.md'), 'utf8').split('\n');
  const titles = {};
  FILES.forEach(f => {
    for (const h of bodyOf(f).matchAll(/<h2>([^<]*)<\/h2>/g)) {
      const parts = h[1].split('　');
      if (parts.length > 1) titles[parts[0]] = parts.slice(1).join('　');
    }
  });
  md.forEach((line, li) => {
    for (const m of line.matchAll(/(?<![\d.\-\/])([0-9])-(\d{1,2})(?![\d\-])/g)) {
      const key = m[1] + '-' + m[2];
      const after = line.slice(m.index + m[0].length).replace(/^[ 　]+/, '').replace(/^\*+/, '');
      let best = 0, owners = [];
      for (const [num, title] of Object.entries(titles)) {
        for (let k = Math.min(title.length, after.length); k >= 5; k--) {
          if (!after.startsWith(title.slice(0, k))) continue;
          if (k > best) { best = k; owners = [num]; } else if (k === best) owners.push(num);
          break;
        }
      }
      if (best < 5) continue;
      n++;
      if (!owners.includes(key)) bad(`CLAUDE.md L${li + 1} の「${key} ${after.slice(0, best)}」── その題は ${owners.join(' / ')}`);
    }
  });
  // 題つきの参照が1件も無いのは正常（CLAUDE.md は節番号で指さない方針）なので、行数で数える
  done(n0, md.length, `CLAUDE.md ${md.length} 行・題つきの節参照 ${n} 件すべて、その節を指している`);
}

/* --- 28. CLAUDE.md に書いた数と一覧が、実物と合っているか ----------------
   CLAUDE.md は毎セッション読み込まれる。古い数字があると、それを前提に作業が進む（§7 #66）。
   **理想は数を書かないこと。** 書いてあるものだけを見る：
   ① §7 の番号が 1..N の連番・昇順 ② §2 の差し込みブロックの一覧が reindex.mjs の BLOCKS と一致
   ③ 検査の項目数 */
head('[28] CLAUDE.md の数字');
{
  const n0 = ng; let n = 0;
  const md = fs.readFileSync(path.join(REPO, 'CLAUDE.md'), 'utf8');
  const s7a = md.indexOf('## 7.'), s7b = md.indexOf('## 8.');
  if (s7a < 0 || s7b < 0) bad('CLAUDE.md に「## 7.」「## 8.」の見出しが無い（§7 の連番を見られない）');
  else {
    n++;
    const ns = [...md.slice(s7a, s7b).matchAll(/^\| (\d+) \|/gm)].map(x => +x[1]);
    if (!ns.length) bad('CLAUDE.md §7 に番号つきの行が無い');
    else if (ns.join() !== ns.map((_, i) => i + 1).join()) bad(`CLAUDE.md §7 の番号が 1..${ns.length} の連番・昇順でない`);
  }
  const blocks = [...((fs.readFileSync(path.join(REPO, 'tools/reindex.mjs'), 'utf8').match(/const BLOCKS = \{([\s\S]*?)\};/) || [])[1] || '')
    .matchAll(/(\w+):/g)].map(m => m[1]);
  const m = md.match(/いまある(\d+)個（([^）]+)）/);
  if (!m) bad('CLAUDE.md §2 に差し込みブロックの一覧（いまあるN個（…））が見つからない');
  else {
    n++;
    const listed = [...m[2].matchAll(/`([a-z]+)`/g)].map(x => x[1]).concat(md.includes('`alllist`') ? [] : []);
    const real = [...blocks, 'alllist'];
    if (+m[1] !== real.length) bad(`CLAUDE.md §2 の差し込みブロックが ${m[1]}個、実際は ${real.length}個（${real.join(' / ')}）`);
    real.filter(k => !listed.includes(k)).forEach(k => bad(`CLAUDE.md §2 に載っていない差し込みブロック: ${k}`));
    listed.filter(k => !real.includes(k)).forEach(k => bad(`CLAUDE.md §2 にあるが reindex.mjs に無い差し込みブロック: ${k}`));
  }
  const checks = (fs.readFileSync(new URL(import.meta.url).pathname, 'utf8').match(/^head\('\[\d+\]/gm) || []).length;
  const c = md.match(/検査は全(\d+)項目/);
  if (!c) bad('CLAUDE.md に「検査は全N項目」の記載が見つからない');
  else { n++; if (+c[1] !== checks) bad(`CLAUDE.md の「検査は全${c[1]}項目」が、実際は ${checks} 項目`); }
  done(n0, n, `CLAUDE.md の数と一覧 ${n} 件すべて実物と一致（§7 の連番・差し込みブロック・検査 ${checks} 項目）`);
}

/* --- 29. 文字サイズが段階（--fs-*）で書かれているか -------------------
   px の直書き・clamp()・em/rem/% は段階の外の値を作る（§7 #10 #15）。 */
head('[29] 文字サイズの段階');
{
  const n0 = ng;
  const FS_STEPS = ['xs', 'sm', 'base', 'lg', 'xl'];
  const css = fs.readFileSync(path.join(ROOT, 'assets/style.css'), 'utf8');
  const lines = css.split('\n');
  lines.forEach((l, i) => {
    if (/font-size:\s*[\d.]+px/.test(l) && !/--fs-/.test(l)) bad(`style.css:${i + 1} 段階を使わず px 直書き → ${l.trim().slice(0, 60)}`);
    if (/font-size:\s*clamp\(/.test(l)) bad(`style.css:${i + 1} clamp() は段階外の中間サイズを作る`);
    if (/font-size:\s*[\d.]+(em|rem|%)/.test(l)) bad(`style.css:${i + 1} 相対指定は段階外のサイズを生む`);
  });
  const defined = [...new Set([...css.matchAll(/--fs-([\w-]+)\s*:/g)].map(m => m[1]))];
  const used = [...new Set([...css.matchAll(/var\(--fs-([\w-]+)\)/g)].map(m => m[1]))];
  defined.filter(s => !FS_STEPS.includes(s)).forEach(s => bad(`--fs-${s} は許可された段階にない`));
  used.filter(s => !defined.includes(s)).forEach(s => bad(`var(--fs-${s}) を使っているが定義がない`));
  done(n0, lines.length, `style.css ${lines.length} 行、文字サイズはすべて --fs-* の${FS_STEPS.length}段階`);
}

/* --- 30. 検索インデックスが本文と同期しているか -------------------- */
head('[30] 検索インデックスの同期');
{
  const n0 = ng;
  const IDX = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/search-index.js'), 'utf8')
    .replace(/^window\.SEARCH_INDEX\s*=\s*/, '').replace(/;\s*$/, ''));
  if (IDX.length !== order.length) bad(`節 ${order.length} 件に対しインデックス ${IDX.length} 件 → ./tools/x reindex を実行`);
  done(n0, IDX.length, `${IDX.length} 節ぶん同期`);
}

/* --- 31. サイトの構成（site.mjs ⇄ blueprint ⇄ ディスク ⇄ 番号 ⇄ 色）------
   読む順を番号順から外したので、**番号が住所として正しいか**を別に見る（§7 #86）。
   ① site.mjs のドメインと blueprint のドメインが同じ集合
   ② ディスクにあるのに site.mjs に無いディレクトリ（ナビにも検索にも載らない）
   ③ ディレクトリ名の番号 ＝ 公式の Domain 番号
   ④ 項番号「5-2」＝ ディレクトリの番号 ＋ ディレクトリの中の順（ファイル名の NN とも一致）
   ⑤ 全ドメインに、両テーマのアクセント色がある（無いと黙って既定色になる）
   ⑥ 節の id がサイト全体で重複しない（COVER・例題の戻り先・リンクは id で節を引く） */
head('[31] サイトの構成');
{
  const n0 = ng;
  const siteKeys = DIRS.filter(d => BP_DOM[d.key]).map(d => d.key).sort();
  const bpKeys = Object.keys(BP_DOM).sort();
  if (siteKeys.join() !== bpKeys.join()) bad(`site.mjs のドメイン（${siteKeys.join(',')}）と blueprint（${bpKeys.join(',')}）が一致しない`);
  if (DIRS.filter(d => !BP_DOM[d.key]).length !== 1) bad('site.mjs に配点の無いディレクトリ（まとめ）がちょうど1つでない');
  fs.readdirSync(ROOT).filter(x => /^\d\d-/.test(x) && !DIRS.some(d => d.dir === x))
    .forEach(x => bad(`docs/${x} が site.mjs の DIRS に無い（ナビにも送りにも検索にも載らない）`));
  DIRS.forEach(d => {
    const num = +d.dir.slice(0, 2);
    if (BP_DOM[d.key] && num !== BP_DOM[d.key].n) bad(`${d.dir} の番号 ${num} が公式の Domain ${BP_DOM[d.key].n} と合わない`);
    const files = FILES.filter(f => f.startsWith(d.dir + '/'));
    files.forEach((f, i) => {
      const h2 = ((bodyOf(f).match(/<h2>([\s\S]*?)<\/h2>/) || ['', ''])[1]).replace(/<[^>]*>/g, '').trim();
      const want = `${num}-${i + 1}`;
      if (!h2.startsWith(want + '　')) bad(`${f}: 項番号が「${h2.split('　')[0]}」、住所どおりなら「${want}」`);
      if (+f.split('/')[1].slice(0, 2) !== i + 1) bad(`${f}: ファイル名の番号が並び順（${i + 1}）と合わない`);
    });
  });
  const seen = {};
  order.forEach(s => { if (seen[s.id]) bad(`節の id「${s.id}」が ${seen[s.id]} と ${s.f} で重複している`); else seen[s.id] = s.f; });
  const css = fs.readFileSync(path.join(ROOT, 'assets/style.css'), 'utf8');
  DIRS.forEach(d => {
    if (!css.includes(`\n[data-domain="${d.key}"]`)) bad(`style.css にドメイン「${d.key}」のダークのアクセント色が無い`);
    if (!css.includes(`html[data-theme="light"] [data-domain="${d.key}"]`)) bad(`style.css にドメイン「${d.key}」のライトのアクセント色が無い`);
  });
  done(n0, DIRS.length, `ディレクトリ ${DIRS.length}・節 ${FILES.length}：ドメインの集合・番号・住所・両テーマの色がそろっている`);
}

/* --- 32. 生成物に undefined / NaN が出ていないか -----------------------
   データに無い項目を差し込むと、画面に "undefined" や "NaN%" が黙って出る。
   `<code>` の中の語としての undefined は対象外。 */
head('[32] 生成物の undefined / NaN');
{
  const n0 = ng;
  const files = [...FILES, 'index.html'];
  files.forEach(f => {
    const h = read(f).replace(/<code>[\s\S]*?<\/code>/g, ' ');
    const m = h.match(/.{0,30}\b(undefined|NaN)\b.{0,30}/);
    if (m) bad(`${f}: 「${m[1]}」が出ている → …${m[0].trim()}…`);
  });
  done(n0, files.length, `${files.length} ファイルに undefined / NaN は出ていない`);
}

/* --- 33. 操作できる図の対応 --------------------------------------------
   本文の data-widget と、app.js の WIDGETS（実装の登録表）が過不足なく対応すること。
   ccaf-learn では実装の無い data-widget="p-seq2" が残っていた。 */
head('[33] 操作できる図の対応');
{
  const n0 = ng;
  const js = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  const reg = [...((js.match(/const WIDGETS = \{([\s\S]*?)\};/) || [])[1] || '').matchAll(/'([\w-]+)'\s*:/g)].map(m => m[1]);
  const used = new Set(FILES.flatMap(f => [...bodyOf(f).matchAll(/data-widget="([^"]+)"/g)].map(m => m[1])));
  [...used].filter(w => !reg.includes(w)).forEach(w => bad(`data-widget="${w}" の実装が app.js の WIDGETS に無い`));
  reg.filter(w => !used.has(w)).forEach(w => bad(`app.js の WIDGETS「${w}」を使う節が無い`));
  done(n0, FILES.length, `本文 ${FILES.length} ファイル・操作できる図 ${used.size} 個すべて、実装と対応`);
}

console.log('\n' + (ng ? `要修正 ${ng} 件` : 'すべて問題なし'));
process.exit(ng ? 1 : 0);
