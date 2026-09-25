/* =========================================================
   サイトの組み立て ─ 読む順・ディレクトリ・ナビの名前・色キー。

   **読む順の出所はここだけ。** reindex（送り・目次・検索）と check（既習の判定）と
   measure（代表ページ）の3つが、ここを読む。
   ccaf-learn では reindex がファイル内の表の順、check がディレクトリ名の順で
   ページを並べていた ── 読む順が番号順でなくなると、既習の判定が黙って誤る。

   公式由来の事実（ドメインの英語名・重み）は blueprint.mjs。ここは教材の都合だけを持つ。
   ドメインのディレクトリは公式の Domain 番号で名づけ（05-models ＝ Domain 5）、
   **並べる順だけ**を前提の少ない順にする。公式の並びはアルファベット順で、
   D1（エージェント）が API・ツール・コンテキストより前に来てしまうため。
   ========================================================= */

/** 読む順。key が blueprint.mjs の DOMAINS にあるものが「配点のあるドメイン」。
 *  num は配点のないもの（まとめ）にだけ書く ── ドメインの番号は blueprint から出す。
 *  h1 はドメインの見出し、nav は上部ナビの短い名前、sub は一覧に添える1行。 */
export const DIRS = [
  { dir: '05-models',      key: 'models',   h1: 'モデルの選択と最適化',          nav: 'モデル',       sub: 'LLM の基礎・モデル選択・コスト' },
  { dir: '02-apps',        key: 'apps',     h1: 'アプリケーション開発と連携',    nav: 'アプリと連携', sub: 'API・設計・構成管理・開発の基礎' },
  { dir: '06-prompt',      key: 'prompt',   h1: 'プロンプトとコンテキストの設計', nav: 'プロンプト',   sub: '指示・文脈・出力の扱い' },
  { dir: '08-tools',       key: 'tools',    h1: 'ツールと MCP',                  nav: 'ツールと MCP', sub: 'ツールの実装と使い分け' },
  { dir: '01-agents',      key: 'agents',   h1: 'エージェントとワークフロー',    nav: 'エージェント', sub: '組み方・作り方・型' },
  { dir: '03-claude-code', key: 'code',     h1: 'Claude Code',                   nav: 'Claude Code',  sub: 'Claude Code の運用' },
  { dir: '07-security',    key: 'security', h1: 'セキュリティと安全',            nav: 'セキュリティ', sub: '入力・権限・秘密の守り方' },
  { dir: '04-debug',       key: 'debug',    h1: '評価・テスト・デバッグ',        nav: 'デバッグ',     sub: '障害の切り分けと立て直し' },
  { dir: '09-summary',     key: 'summary',  h1: '全体をもう一度',                nav: 'まとめ',       sub: '配点・例題・模擬試験', num: 'まとめ' },
];

/** 設問の組み立て。
 *  total … 本文（ドメインのディレクトリ）に置く設問の総数。スキルの重みで按分する
 *          （blueprint の skillQuiz）。**基準を1つ固定してから総数を逆算する**（§7 #40）──
 *          足りないスキルに足していくと、総数も期待値も動いて、いつまでも合わない。
 *  mock  … 模擬試験の設問キーの頭。模擬試験は本番と同じ問数を、ドメインの重みで按分する
 *          （blueprint の domainItems）。
 *  1問ずつ s（スキルのキー）を持たせるので、按分は設問データから数えられる。 */
export const QUIZ = { total: 80, mock: 'mock' };

/** サイトの名前など。試験コードは blueprint.mjs の GUIDE.code から出す（ここに書かない） */
export const SITE = {
  name:      '学習ノート',
  // テーマの保存キー。GitHub Pages では同じ利用者の2サイトが同じオリジンになるので、
  // ccaf-learn（ccarf-theme）と分けておく
  themeKey:  'ccdvf-theme',
  // 検索窓の例。3か所に複製されていたので、ここだけに置く
  searchEg:  'tool_use、キャッシュ',
};
