/* =========================================================
   ブループリント ─ 公式 Exam Guide 由来の事実は、すべてここが出所。

   **このファイル以外に、公式由来の数字や語を書かない。**
   問数・帯の幅・設問の按分は、ここの値から計算して出す
   （手で書くと、重みを変えたときに図の中で数字が矛盾する ── ccaf-learn §7 #60）。

   CCDV-F のガイドは CCAR-F と作りが違う。
     - 出題の単位は「タスク」ではなく、重み付きの「スキル」（8ドメイン・25スキル）
     - **スキルに番号は無い。** 名前と重みだけ（例: "Agent Architecture (4.5%)"）
       → 札は原文の名前で出し、番号を作らない。ここのキー（'api-mechanics' 等）は
         教材の内部だけで使う呼び名で、読み手には見せない
     - Knowledge / Skills の箇条書きは無い。各スキルの説明文1つに、項目が列挙されている
       → その項目を topics として**原文のまま**切り出し、網羅の分母にする
     - シナリオ・準備演習・In/Out-of-Scope・技術一覧は無い。例題は3問

   改訂されたら：
     1. GUIDE.url から PDF を取り直し、sha256 と pages を照合する（下のコマンド）
     2. 変わっていたら「6. Exam Content Outline」と DOMAINS・SKILLS を突き合わせて直す
     3. ./tools/x check が落ちたところだけ、本文を追う
   ========================================================= */

/** 版そのもの。**改訂に気づくための記録。**
 *
 *  version と effective は PDF の中に印刷してある文字列なので、
 *  **同じ「Version 1.0」のまま差し替えられたら気づけない。**
 *  そのために sha256 と pages を持つ。取り直したら、まずこの2つを照合する：
 *
 *    curl -sS -o guide.pdf "<url>" && sha256sum guide.pdf
 *    docker run --rm -v "$PWD":/s alpine sh -c \
 *      'apk add --no-cache poppler-utils >/dev/null && pdfinfo /s/guide.pdf | grep Pages'
 *
 *  url のパスにある 1783542875 は upload 時刻の epoch（2026-07-08 ＝ PDF の作成日時と一致）。
 *  **差し替われば URL ごと変わる**ので、認定ページ（certs）が同じ URL を指しているかも合わせて見る。
 *  ページ番号は印字されていない（目次も無い）。pages は pdfinfo の値。 */
export const GUIDE = {
  title:     "Claude Certified Developer – Foundations",
  version:   "1.0",
  effective: "July 2026",
  code:      "CCDV-F",
  pages:     14,
  chapters:  16,
  sha256:    "8c52679323cb546790d7d663cbbb48ff42f76f813bbe97239dfde5c32c1c32bd",
  checked:   "2026-09-26",   // 上の2つを最後に実物と突き合わせた日
  url:       "https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542875%2FClaude+Certified+Developer+%E2%80%93+Foundations+Exam+Guide.pdf",
  // 認定ページと、ガイドの URL が載っている一覧ページ
  cert:      "https://anthropic-partners.skilljar.com/claude-certified-developer-foundations-certification",
  certs:     "https://anthropic-partners.skilljar.com/page/partner-certifications",
};

/** 5. Exam Details at a Glance ＋ 10〜15 の受験の実務 */
export const EXAM = {
  items:           53,
  minutes:         120,
  pass:            720,
  scaleMin:        100,
  scaleMax:        1000,
  fee:             125,          // USD
  validityMonths:  12,           // 認定の有効期間。期限内なら無料の更新試験（§14）
  retakeWaitDays:  [14, 30, 90], // 不合格のたびに待機が伸びる（§11）
  attemptsPerYear: 4,            // 同じ試験を受けられる回数（§11 "up to four times within a rolling twelve-month period"）
  attemptsWindowMonths: 12,      // その回数を数える期間（直近12か月の移動窓）
  cancelHours:     24,           // これを切ると受験料は戻らない（§10）
  appealDays:      14,           // 異議申し立ての期限（§15）
  sampleQuestions: 3,            // §8 に解説つきで載っている
  multiResponse:   true,         // 1つ選ぶ設問と、複数選ぶ設問が混じる。選ぶ数は問題文に書かれる
  // §11 Identification ─ 登録名の訂正はここへ。**予約する前**にしか直せない
  nameFixContact:  "certifications-support@anthropic.com",
  // §12 ─ 持ち込めないもの。原文の列挙をそのまま持つ
  banned:          ["携帯", "スマートウォッチ", "ヘッドホン", "参考書", "録音機器"],
};

/** 6. Exam Content Outline ─ 重みだけを持つ。問数は EXAM.items から導出する。
 *  **w は 0.1% 単位の整数**（14.7% → 147）。小数で持つと、合計が浮動小数で 1 にならず、
 *  按分も Math.round だと 53問が 54問になる（最大剰余法で配る ── apportion）。
 *  並びは原文どおりアルファベット順。**読む順は site.mjs**。 */
export const DOMAINS = {
  agents:   { n: 1, en: "Agents and Workflows",             w: 147 },
  apps:     { n: 2, en: "Applications and Integration",     w: 331 },
  code:     { n: 3, en: "Claude Code",                      w:  31 },
  debug:    { n: 4, en: "Eval, Testing, and Debugging",     w:  26 },
  models:   { n: 5, en: "Model Selection and Optimization", w: 168 },
  prompt:   { n: 6, en: "Prompt and Context Engineering",   w: 110 },
  security: { n: 7, en: "Security and Safety",              w:  81 },
  tools:    { n: 8, en: "Tools and MCPs",                   w: 106 },
};

/** 6. Detailed objectives by domain ─ 25スキル。並びは原文どおり。
 *
 *    d        … 所属ドメイン（DOMAINS のキー）
 *    name     … 原文の名前（訳さない。設問は英語で書かれる）
 *    w        … 重み（0.1% 単位の整数）。ドメインごとの合計が DOMAINS の w と一致する
 *    desc     … 原文の説明文そのもの（改行だけ詰めた）
 *    groups   … 説明文のうち、項目をくくる句（照合しない）
 *    topics   … 説明文に列挙された項目。**原文のまま**。これが網羅の分母（ccaf-learn の
 *               Knowledge / Skills 240項目にあたる）。check が次の3つを見る：
 *               ① すべて desc の中にそのまま在る ② 互いに重ならない
 *               ③ desc から groups と topics を取り除くと、GLUE の語だけが残る
 *               （＝取りこぼした項目が無い）
 *
 *  どの節が扱うか・本文の日本語に当てる正規表現は、ドメインを書くときに COVER に足す
 *  （先に書くと、本文の書き方に合わず書き直しになる）。 */
export const SKILLS = {
  /* ---- Domain 1: Agents and Workflows (14.7%) ---- */
  "agent-architecture": { d: "agents", name: "Agent Architecture", w: 45,
    desc: "Principles, patterns, and tradeoffs of agent and workflow architecture, including the decision criteria for using a workflow versus an agent, the structure of manager/supervisor hierarchies, and the role of subagents in improving task execution.",
    groups: ["Principles, patterns, and tradeoffs of agent and workflow architecture"],
    topics: ["the decision criteria for using a workflow versus an agent", "the structure of manager/supervisor hierarchies", "the role of subagents in improving task execution"] },
  "agent-construction": { d: "agents", name: "Agent Construction with Claude", w: 53,
    desc: "Methods, tools, and platforms for constructing Claude agents, including the Claude Agent SDK, custom agent loops and harnesses, managed agent deployment models (self-hosted vs. Anthropic-hosted), and hooks for deterministic actions.",
    groups: ["Methods, tools, and platforms for constructing Claude agents"],
    topics: ["the Claude Agent SDK", "custom agent loops and harnesses", "managed agent deployment models (self-hosted vs. Anthropic-hosted)", "hooks for deterministic actions"] },
  "agent-patterns": { d: "agents", name: "Agent Patterns and Frameworks", w: 49,
    desc: "Common agent design patterns (tool-use loops, sub-agents, memory, context-window management) and agentic abstraction frameworks (e.g., Strands, LangGraph, PydanticAI) for building agents and workflows for multi-step tasks.",
    groups: ["Common agent design patterns", "for building agents and workflows for multi-step tasks"],
    topics: ["tool-use loops", "sub-agents", "memory", "context-window management", "agentic abstraction frameworks (e.g., Strands, LangGraph, PydanticAI)"] },

  /* ---- Domain 2: Applications and Integration (33.1%) ---- */
  "requirements": { d: "apps", name: "Understanding Requirements", w: 34,
    desc: "Functional and infrastructure requirements based on business requirements and solution architecture.",
    groups: [],
    topics: ["Functional and infrastructure requirements", "business requirements and solution architecture"] },
  "life-cycle": { d: "apps", name: "Systems Life Cycle", w: 28,
    desc: "Systems life cycle management concepts and frameworks used to develop, implement, operate, and maintain IT systems.",
    groups: [],
    topics: ["Systems life cycle management concepts and frameworks", "develop, implement, operate, and maintain IT systems"] },
  "api-mechanics": { d: "apps", name: "Claude API Mechanics", w: 68,
    desc: "Claude API behavior and mechanics, including messages, tools, streaming, vision, thinking, caching, invoking Claude through third-party vendors, Messages API data access patterns, batch API use, and tradeoffs between realtime and batch API selection.",
    groups: ["Claude API behavior and mechanics"],
    topics: ["messages", "tools", "streaming", "vision", "thinking", "caching", "invoking Claude through third-party vendors", "Messages API data access patterns", "batch API use", "tradeoffs between realtime and batch API selection"] },
  "se-foundations": { d: "apps", name: "Software Engineering Foundations", w: 74,
    desc: "Core software engineering principles and practices, including REST APIs, JSON, asynchronous programming, version control, SDLC integration, code review, and small- and large-scale refactoring.",
    groups: ["Core software engineering principles and practices"],
    topics: ["REST APIs", "JSON", "asynchronous programming", "version control", "SDLC integration", "code review", "small- and large-scale refactoring"] },
  "app-design": { d: "apps", name: "Claude Application Design", w: 86,
    desc: "Design considerations for building Claude applications, including how Claude interprets instructions across interfaces (Claude Code, Desktop, claude.ai, API, SDKs), content boundaries, schema design, session hygiene, and plugin management.",
    groups: ["Design considerations for building Claude applications"],
    topics: ["how Claude interprets instructions across interfaces (Claude Code, Desktop, claude.ai, API, SDKs)", "content boundaries", "schema design", "session hygiene", "plugin management"] },
  "config-management": { d: "apps", name: "Configuration Management", w: 41,
    desc: "Configuration management for Claude system components, including CLAUDE.md files, settings.json, model version pinning, prompt versioning, and plugin dependencies.",
    groups: ["Configuration management for Claude system components"],
    topics: ["CLAUDE.md files", "settings.json", "model version pinning", "prompt versioning", "plugin dependencies"] },

  /* ---- Domain 3: Claude Code (3.1%) ---- */
  "claude-code-operation": { d: "code", name: "Claude Code Operation", w: 31,
    desc: "Claude Code core components (Rules, Skills, Commands, Agents, Agent Memory), features (session management, built-in and custom slash commands, headless mode, streaming mode, auto-mode), the CLAUDE.md hierarchy, repository initialization, and settings.json configuration.",
    groups: ["Claude Code core components", "features"],
    topics: ["Rules", "Skills", "Commands", "Agents", "Agent Memory", "session management", "built-in and custom slash commands", "headless mode", "streaming mode", "auto-mode", "the CLAUDE.md hierarchy", "repository initialization", "settings.json configuration"] },

  /* ---- Domain 4: Eval, Testing, and Debugging (2.6%) ---- */
  "debugging": { d: "debug", name: "Debugging and Error Handling", w: 26,
    desc: "Debugging and error handling techniques for Claude applications, including error type identification, recovery strategy selection, trace analysis to identify failure modes, and problem origin isolation between the integration layer and model output.",
    groups: ["Debugging and error handling techniques for Claude applications"],
    topics: ["error type identification", "recovery strategy selection", "trace analysis to identify failure modes", "problem origin isolation between the integration layer and model output"] },

  /* ---- Domain 5: Model Selection and Optimization (16.8%) ---- */
  "llm-fundamentals": { d: "models", name: "LLM Fundamentals", w: 52,
    desc: "Basic understanding of LLMs (tokens, context windows, sampling, non-determinism, next-token generation), model options (fast mode, extended thinking, adaptive thinking, effort levels), and fundamental prompting techniques (zero-shot, single-shot, multi-shot).",
    groups: ["Basic understanding of LLMs", "model options", "fundamental prompting techniques"],
    topics: ["tokens", "context windows", "sampling", "non-determinism", "next-token generation", "fast mode", "extended thinking", "adaptive thinking", "effort levels", "zero-shot", "single-shot", "multi-shot"] },
  "technical-fundamentals": { d: "models", name: "Technical Fundamentals", w: 61,
    desc: "Foundational technical concepts supporting AI application development, including basic engineering practices (integrating with SDKs that wrap REST APIs, websockets).",
    groups: ["Foundational technical concepts supporting AI application development", "basic engineering practices"],
    topics: ["integrating with SDKs that wrap REST APIs", "websockets"] },
  "model-selection": { d: "models", name: "Model Selection and Tradeoffs", w: 27,
    desc: "Claude model capabilities (Opus vs. Sonnet vs. Haiku use cases, adaptive thinking support), tradeoffs across quality/latency/cost parameters, and breaking behavior changes across model releases when selecting models for tasks.",
    groups: ["Claude model capabilities", "when selecting models for tasks"],
    topics: ["Opus vs. Sonnet vs. Haiku use cases", "adaptive thinking support", "tradeoffs across quality/latency/cost parameters", "breaking behavior changes across model releases"] },
  "cost-tokens": { d: "models", name: "Cost and Token Management", w: 28,
    desc: "Token budgeting and cost management techniques for Claude applications, including token usage tracking, cost modeling, and caching techniques (prompt caching, cache check-pointing) for cost optimization.",
    groups: ["Token budgeting and cost management techniques for Claude applications", "caching techniques", "for cost optimization"],
    topics: ["token usage tracking", "cost modeling", "prompt caching", "cache check-pointing"] },

  /* ---- Domain 6: Prompt and Context Engineering (11.0%) ---- */
  "context-engineering": { d: "prompt", name: "Context Engineering", w: 38,
    desc: "Context and memory management techniques for Claude applications, including context window management, prevention of context drift and bloat (tool output pruning, compaction), and context isolation through subagents or multi-step agentic workflows.",
    groups: ["Context and memory management techniques for Claude applications"],
    topics: ["context window management", "prevention of context drift and bloat", "tool output pruning", "compaction", "context isolation through subagents or multi-step agentic workflows"] },
  "prompt-engineering": { d: "prompt", name: "Prompt Engineering", w: 46,
    desc: "Prompt engineering principles and methods (instruction clarity, few-shot examples, system versus user placement, output constraints, prompt and instruction placement across components, iterative refinement, prompt adjustment, input sanitization) when writing and iterating on prompts for Claude.",
    groups: ["Prompt engineering principles and methods", "when writing and iterating on prompts for Claude"],
    topics: ["instruction clarity", "few-shot examples", "system versus user placement", "output constraints", "prompt and instruction placement across components", "iterative refinement", "prompt adjustment", "input sanitization"] },
  "output-handling": { d: "prompt", name: "Output Handling", w: 26,
    desc: "Established patterns and techniques for producing, validating, and consuming Claude output, including structured output patterns, response validation, defensive parsing, and skepticism toward confident output.",
    groups: ["Established patterns and techniques for producing, validating, and consuming Claude output"],
    topics: ["structured output patterns", "response validation", "defensive parsing", "skepticism toward confident output"] },

  /* ---- Domain 7: Security and Safety (8.1%) ---- */
  "app-security": { d: "security", name: "AI Application Security", w: 32,
    desc: "Data privacy and security best practices, including prompt injection awareness and mitigation, jailbreak defense, untrusted input handling, data leakage prevention, PII handling, and ensuring authentication, authorization, confidentiality, privacy, and integrity.",
    groups: ["Data privacy and security best practices"],
    topics: ["prompt injection awareness and mitigation", "jailbreak defense", "untrusted input handling", "data leakage prevention", "PII handling", "ensuring authentication, authorization, confidentiality, privacy, and integrity"] },
  "guardrails": { d: "security", name: "Guardrails and Safe Deployment", w: 23,
    desc: "Safe and responsible deployment practices (content policy, guardrail layering) and secure-by-design principles (privacy, identity and access management, least privilege).",
    groups: ["Safe and responsible deployment practices", "secure-by-design principles"],
    topics: ["content policy", "guardrail layering", "privacy", "identity and access management", "least privilege"] },
  "hooks": { d: "security", name: "Claude Hooks", w: 10,
    desc: "Leveraging hooks for guardrails and safety controls to prevent destructive actions within Claude applications.",
    groups: [],
    topics: ["Leveraging hooks for guardrails and safety controls", "prevent destructive actions within Claude applications"] },
  "secrets": { d: "security", name: "Identity, Secrets, and Key Management", w: 16,
    desc: "Managing secrets, credentials, and API keys across Claude development and production environments, including identity validation and authentication, access approval and level verification, and authorized access monitoring.",
    groups: [],
    topics: ["Managing secrets, credentials, and API keys across Claude development and production environments", "identity validation and authentication", "access approval and level verification", "authorized access monitoring"] },

  /* ---- Domain 8: Tools and MCPs (10.6%) ---- */
  "tool-implementation": { d: "tools", name: "Tool Implementation", w: 44,
    desc: "Tool implementation practices for Claude applications, including tool use and function calling, configuration for external system interaction, tool description writing, error handling, tool usage patterns (agentic harness dispatch, client-side vs. server-side tools, approval patterns), and tool set construction best practices.",
    groups: ["Tool implementation practices for Claude applications", "tool usage patterns"],
    topics: ["tool use and function calling", "configuration for external system interaction", "tool description writing", "error handling", "agentic harness dispatch", "client-side vs. server-side tools", "approval patterns", "tool set construction best practices"] },
  "mcp-server": { d: "tools", name: "MCP Server Development", w: 21,
    desc: "MCP server development practices, including server authoring, deployment, integration with Claude applications, MCP resources, tools, and prompts, and communication patterns (stdio, sockets, client vs. server).",
    groups: ["MCP server development practices", "communication patterns"],
    topics: ["server authoring", "deployment", "integration with Claude applications", "MCP resources, tools, and prompts", "stdio", "sockets", "client vs. server"] },
  "agentic-customization": { d: "tools", name: "Agentic Customization", w: 41,
    desc: "Tradeoffs among built-in Tools, custom Tools, Skills, and MCPs for selecting and applying the appropriate approach for a given use case.",
    groups: [],
    topics: ["Tradeoffs among built-in Tools, custom Tools, Skills, and MCPs", "selecting and applying the appropriate approach for a given use case"] },
};

/** desc から groups と topics を取り除いたあとに残ってよい語（つなぎ）。
 *  ここに無い語が残ったら、項目を取りこぼしている ── check が落とす。 */
export const GLUE = ["including", "and", "based", "on", "used", "to", "for"];

/** どの節がどのトピックを扱うか ＋ 本文の日本語に当てる正規表現。
 *  **ドメインを書くときに足す**（先に書くと、本文の書き方に合わず書き直しになる）。
 *  形: { "<スキルのキー>": { sections: ["節のid", …], topics: { "<topics の原文>": "正規表現" | ["正規表現", …] } } }
 *  正規表現は、そのスキルの sections の本文の中だけで照合する（関係のない節で偶然当たる穴を塞ぐ）。 */
export const COVER = {
  "llm-fundamentals": { sections: ["token", "window", "think", "shot"], topics: {
    "tokens":                "トークンは、単語や文字の断片",
    "next-token generation": "次の1トークンを確率で選ぶ",
    "sampling":              "確率に従って1つ選ぶことを[^。]{0,10}サンプリング",
    "non-determinism":       "非決定性",
    "context windows":       "入力と出力の両方",
    "fast mode":             "fast mode[^。]{0,40}(速さ|速く)",
    "extended thinking":     "extended thinking[^。]{0,40}予算を決め",
    "adaptive thinking":     "adaptive thinking[^。]{0,40}考える量をモデルが決める",
    "effort levels":         "effort[^。]{0,60}low[^。]{0,10}max",
    "zero-shot":             "zero-shot",
    "single-shot":           "single-shot",
    "multi-shot":            "multi-shot" } },
  "technical-fundamentals": { sections: ["sdk", "wire"], topics: {
    "integrating with SDKs that wrap REST APIs": ["SDK は、HTTP で API を呼ぶ手間を肩代わり", "POST /v1/messages"],
    "websockets":                                "WebSocket[^。]{0,40}双方向" } },
  "model-selection": { sections: ["choose"], topics: {
    "Opus vs. Sonnet vs. Haiku use cases":             ["Opus", "Sonnet", "Haiku", "向く仕事"],
    "adaptive thinking support":                       "adaptive thinking[^。]{0,40}モデルごと",
    "tradeoffs across quality/latency/cost parameters": "能力・速さ・費用のかね合い",
    "breaking behavior changes across model releases": "乗り換えで壊れる" } },
  "cost-tokens": { sections: ["cost", "cache"], topics: {
    "token usage tracking": "使用量の記録",
    "cost modeling":        "見積もりの式",
    "prompt caching":       "前半をキャッシュに置け",
    "cache check-pointing": "キャッシュの区切り（cache check-pointing）" } },
  "api-mechanics": { sections: ["cache", "blocks", "data", "stream", "batch"], topics: {
    "messages":                                            "メッセージの列",
    "tools":                                               "道具の依頼",
    "streaming":                                           ["差分の種類", "途中で切れたら"],
    "vision":                                              "画像を読ませる",
    "thinking":                                            "考えた内容のブロック",
    "caching":                                             "cache_control",
    "invoking Claude through third-party vendors":         "他社のクラウド経由で呼ぶ",
    "Messages API data access patterns":                   "資料を読ませる道は2つ",
    "batch API use":                                       "custom_id",
    "tradeoffs between realtime and batch API selection":  "すぐ答えが要るか" } },
  "tool-implementation": { sections: ["define", "dispatch", "fail"], topics: {
    "tool use and function calling":                  "ツール使用（関数呼び出し）",
    "configuration for external system interaction":  "外のシステムにつなぐ設定",
    "tool description writing":                       "「いつ使うか」を書く",
    "error handling":                                 "is_error",
    "agentic harness dispatch":                       "ハーネス",
    "client-side vs. server-side tools":              ["クライアント側", "サーバ側"],
    "approval patterns":                              "承認を挟む",
    "tool set construction best practices":           "ツールの組をそろえる" } },
  "mcp-server": { sections: ["mcp", "transport"], topics: {
    "server authoring":                    "公式の SDK",
    "deployment":                          "置き場所",
    "integration with Claude applications": ["claude mcp add", "MCP コネクタ"],
    "MCP resources, tools, and prompts":   ["ツール", "リソース", "プロンプト"],
    "stdio":                               "stdio",
    "sockets":                             "ソケット",
    "client vs. server":                   ["ホスト", "クライアント", "サーバ"] } },
  "agentic-customization": { sections: ["builtin", "extend"], topics: {
    "Tradeoffs among built-in Tools, custom Tools, Skills, and MCPs":      ["組み込みのツール", "自作のツール", "Skills", "MCP"],
    "selecting and applying the appropriate approach for a given use case": "4つの手の選び方" } },
  "prompt-engineering": { sections: ["place", "clear", "refine"], topics: {
    "instruction clarity":                                "はっきり頼む",
    "few-shot examples":                                  "例を見せる",
    "system versus user placement":                       "指示は system に、材料は user に",
    "output constraints":                                 "出力の制約",
    "prompt and instruction placement across components": "部品ごとの置き場所",
    "iterative refinement":                               "プロンプトを直していく手順",
    "prompt adjustment":                                  "直す場所を選ぶ",
    "input sanitization":                                 "入力を整えてから渡す" } },
  "context-engineering": { sections: ["prune", "isolate"], topics: {
    "context window management":              "窓は、大きさの決まった予算",
    "prevention of context drift and bloat":  ["膨らむ", "ずれる"],
    "tool output pruning":                    "ツールの結果を刈り込む",
    "compaction":                             "会話を圧縮する",
    "context isolation through subagents or multi-step agentic workflows": ["子に切り出す", "段階に分ける"] } },
  "output-handling": { sections: ["struct", "doubt"], topics: {
    "structured output patterns":         "output_config\\.format",
    "response validation":                "中身は確かめる",
    "defensive parsing":                  "壊れた出力に備える",
    "skepticism toward confident output": "自信のある出力ほど疑う" } },
  "agent-architecture": { sections: ["workflow", "supervisor"], topics: {
    "the decision criteria for using a workflow versus an agent": "手順を先に決めておけるか",
    "the structure of manager/supervisor hierarchies":           "監督役を置く形",
    "the role of subagents in improving task execution":         "子に任せると良くなること" } },
  "agent-patterns": { sections: ["loop", "memory", "framework"], topics: {
    "tool-use loops":            "ループの骨組み",
    "sub-agents":                "子の窓で済ませ",
    "memory":                    "記憶のツール",
    "context-window management": "窓の中身を入れ替え",
    "agentic abstraction frameworks (e.g., Strands, LangGraph, PydanticAI)": ["Strands", "LangGraph", "PydanticAI"] } },
  "agent-construction": { sections: ["agentsdk", "harness", "deploy", "hooks"], topics: {
    "the Claude Agent SDK":             "Agent SDK は、Claude Code",
    "custom agent loops and harnesses": ["ハーネス", "3つの作り方"],
    "managed agent deployment models (self-hosted vs. Anthropic-hosted)": ["Managed Agents", "実行は手元", "全部自前"],
    "hooks for deterministic actions":  ["フック", "決定的"] } },
  "se-foundations": { sections: ["rest", "async", "change", "refactor"], topics: {
    "REST APIs":                "REST は、Web の API",
    "JSON":                     "JSON の形",
    "asynchronous programming":           "非同期処理",
    "version control":                    "ブランチ",
    "SDLC integration":                   "開発工程",
    "code review":                        "レビューする",
    "small- and large-scale refactoring": ["小さな書き換え", "大きな作り直し"] } },
  "requirements": { sections: ["require"], topics: {
    "Functional and infrastructure requirements":      ["機能の要件", "基盤の要件"],
    "business requirements and solution architecture": ["業務の要件", "ソリューションアーキテクチャ"] } },
  "life-cycle": { sections: ["lifecycle"], topics: {
    "Systems life cycle management concepts and frameworks": ["ライフサイクル管理", "進め方の3つの型"],
    "develop, implement, operate, and maintain IT systems":  ["開発", "導入", "運用", "保守"] } },
  "app-design": { sections: ["surface", "boundary", "schema", "session"], topics: {
    "how Claude interprets instructions across interfaces (Claude Code, Desktop, claude.ai, API, SDKs)": ["前から入っている指示", "Desktop", "Agent SDK"],
    "content boundaries": ["置き場所で示", "出力の境目"],
    "schema design":      ["逃げ道", "道具の結果の形"],
    "session hygiene":    ["/clear", "始め直"],
    "plugin management":  ["/plugin", "enabledPlugins"] } },
  "config-management": { sections: ["config", "version"], topics: {
    "CLAUDE.md files":       ["CLAUDE.md", "つなげて読む"],
    "settings.json":         ["settings.json", "強いほうが勝つ"],
    "model version pinning": "モデルの ID と、引退",
    "prompt versioning":     "前の版と同じテスト",
    "plugin dependencies":   "dependencies" } },
  "claude-code-operation": { sections: ["parts", "run"], topics: {} },
  "app-security": { sections: ["inject", "leak"], topics: {} },
  "guardrails": { sections: ["layer"], topics: {} },
  "hooks": { sections: ["hookstop"], topics: {} },
  "secrets": { sections: ["secret"], topics: {} },
  "debugging": { sections: ["errors", "trace"], topics: {} },
};

/** 7. How to Prepare ─ 原文の5項目。日本語の要旨と対応する節は、まとめを書くときに足す */
export const PREPARE = [
  { en: "Study the exam blueprint in Section 6 and self-assess against each objective" },
  { en: "Review official Anthropic documentation for the Claude API, models, prompt engineering, Claude Code, Skills, and MCP" },
  { en: "Build and operate at least one Claude application that exercises the API, integrates one or more tools, applies basic prompt and context engineering, and includes simple security and evaluation practices" },
  { en: "Practice the developer competencies: writing prompts and system instructions, building agents and workflows, configuring Claude Code, managing tokens and cost, implementing guardrails, and creating custom tools or MCP servers" },
  { en: "Complete the sample questions in Section 8 to familiarize yourself with item style" },
];

/** 8. Sample Questions ─ 公式の例題3問（どれも4択で、正解はすべて B）。
 *  **設問文・選択肢・解説の訳は持たない。** 公式の例題そのものなので、訳して載せない。
 *  ここに持つのは「何を問うているか」「誤答がどの型か」「どの節に戻ればよいか」だけ。
 *
 *  TRAPS は、3問9個の誤答を**公式の解説の言葉で**分類したもの（en は解説の原文）。
 *  件数は SAMPLES から導出する（ここに書かない）。 */
export const TRAPS = {
  lever: { ja: "効かないつまみを回す",
           sign: "並列にする／max_tokens を下げる／temperature を上げる",
           why: "動かしているのは、<b>問われている軸とは別のつまみ</b>",
           en: "does not address the batch-versus-realtime tradeoff" },
  model: { ja: "モデルの大小で片づける",
           sign: "いちばん小さいモデルにする／大きいモデルにする",
           why: "モデルを替えても<b>仕組みの問題は残る</b>。指示に従順なモデルほど注入に弱いこともある",
           en: "a more instruction-following model (D) can be more susceptible, not less" },
  ask:   { ja: "頼んで守らせる",
           sign: "<code>system</code> に「〜しないで」と書く",
           why: "お願いは<b>強制力のある制御ではない</b>",
           en: "a polite request (C) is not an enforceable control" },
  reuse: { ja: "その場しのぎで使い回せない",
           sign: "プロンプトに書き込む／データを毎回貼る",
           why: "動きはするが、<b>使い回せず保守もできない</b>。貼ったデータは古くなり窓を食う",
           en: "Hard-coding logic into prompts (A) is neither reusable nor maintainable" },
  fact:  { ja: "事実で消える",
           sign: "組み込みツールが何でも届く、のような機能の誤解",
           why: "知っていれば読んだ瞬間に消える。<b>考える前に、まずこれを外す</b>",
           en: "built-in tools (D) do not automatically reach arbitrary internal APIs" },
};

/** 3問。d は原文のラベルのドメイン、answer は正解の記号、traps は誤答3つの型（A・C・D の順）、
 *  sections は間違えたときの戻り先（まとめを書くときに足す）。 */
export const SAMPLES = [
  { n: 1, d: "apps",     answer: "B", ja: "急がない大量処理を、いちばん安く回す",           traps: ["lever", "lever", "model"], sections: [] },
  { n: 2, d: "security", answer: "B", ja: "読み込んだページに仕込まれた指示を、効かせない", traps: ["lever", "ask", "model"],   sections: [] },
  { n: 3, d: "tools",    answer: "B", ja: "社内の REST API を、複数のアプリから使い回す",   traps: ["reuse", "reuse", "fact"],  sections: [] },
];

/** 8. Sample Questions の設問文から抜いた、**正解を決める限定語**。
 *  訳ではなく「何を要求しているか」を書く ── ここを取り違えると、妥当な選択肢でも誤答になる。 */
export const QUALIFIERS = [
  { en: "Which approach <b>best fits</b> the requirement?", ja: "要件にいちばん合うのは", note: "正しいかどうかではなく、<b>書かれた条件（費用・急ぎ・使い回し）に合うか</b>で選ぶ" },
  { en: "Which mitigation is <b>most effective</b>?",        ja: "いちばん効く対策は",     note: "<b>強制力のある手</b>が勝つ。頼むだけの手や、関係のないつまみは効かない" },
];

/** この教材の日本語 ⇄ 公式の英語。**英語は原文（DOMAINS・SKILLS・PREPARE・QUOTES）からしか取らない。**
 *  d は所属ドメイン（DOMAINS のキー）。ドメインを書くときに足す。 */
export const GLOSSARY = [
  { d: "models", en: "next-token generation",                           ja: "次の1トークンの生成" },
  { d: "models", en: "sampling",                                        ja: "サンプリング（確率に従った選び方）" },
  { d: "models", en: "non-determinism",                                 ja: "非決定性（同じ入力でも出力が揺れる性質）" },
  { d: "models", en: "context windows",                                 ja: "窓（一度に扱えるトークンの上限）" },
  { d: "models", en: "extended thinking",                               ja: "予算を決めて考えさせる方式" },
  { d: "models", en: "adaptive thinking",                               ja: "考える量をモデルが決める方式" },
  { d: "models", en: "effort levels",                                   ja: "力の入れ具合の段階" },
  { d: "models", en: "fast mode",                                       ja: "同じモデルを速く動かす指定" },
  { d: "models", en: "multi-shot",                                      ja: "例を複数見せる頼み方" },
  { d: "models", en: "integrating with SDKs that wrap REST APIs",       ja: "REST API を包む SDK での接続" },
  { d: "models", en: "websockets",                                      ja: "双方向の常時接続（WebSocket）" },
  { d: "models", en: "tradeoffs across quality/latency/cost parameters", ja: "品質・待ち時間・費用のかね合い" },
  { d: "models", en: "breaking behavior changes across model releases", ja: "版の更新による挙動の破壊的な変化" },
  { d: "models", en: "token usage tracking",                            ja: "トークン使用量の記録" },
  { d: "models", en: "cost modeling",                                   ja: "費用の見積もり" },
  { d: "models", en: "prompt caching",                                  ja: "プロンプトキャッシュ" },
  { d: "models", en: "cache check-pointing",                            ja: "キャッシュの区切りの置き方" },

  { d: "tools", en: "tool use and function calling",                     ja: "ツール使用（関数呼び出し）" },
  { d: "tools", en: "tool description writing",                          ja: "ツールの説明の書き方" },
  { d: "tools", en: "tool set construction best practices",              ja: "ツールの組のそろえ方" },
  { d: "tools", en: "agentic harness dispatch",                          ja: "ハーネスによる呼び出しの振り分け" },
  { d: "tools", en: "client-side vs. server-side tools",                 ja: "クライアント側とサーバ側のツール" },
  { d: "tools", en: "approval patterns",                                 ja: "承認の挟み方" },
  { d: "tools", en: "server authoring",                                  ja: "MCP サーバの作成" },
  { d: "tools", en: "MCP resources, tools, and prompts",                 ja: "MCP のリソース・ツール・プロンプト" },
  { d: "tools", en: "stdio",                                             ja: "標準入出力でのつなぎ方（stdio）" },
  { d: "tools", en: "Tradeoffs among built-in Tools, custom Tools, Skills, and MCPs", ja: "組み込み・自作・Skills・MCP の使い分け" },

  { d: "prompt", en: "instruction clarity",                                ja: "指示のはっきりさ" },
  { d: "prompt", en: "few-shot examples",                                  ja: "少数の例（few-shot）" },
  { d: "prompt", en: "system versus user placement",                       ja: "system と user の置き分け" },
  { d: "prompt", en: "output constraints",                                 ja: "出力の制約" },
  { d: "prompt", en: "prompt and instruction placement across components", ja: "部品ごとの指示の置き場所" },
  { d: "prompt", en: "iterative refinement",                               ja: "結果を見ながらの手直し" },
  { d: "prompt", en: "input sanitization",                                 ja: "渡す前の入力の整え方" },
  { d: "prompt", en: "prevention of context drift and bloat",              ja: "文脈のずれと膨らみの防止" },
  { d: "prompt", en: "tool output pruning",                                ja: "ツールの結果の刈り込み" },
  { d: "prompt", en: "compaction",                                         ja: "圧縮（会話を要約に置き換えること）" },
  { d: "prompt", en: "context isolation",                                  ja: "文脈の切り分け" },
  { d: "prompt", en: "structured output patterns",                         ja: "構造化出力の型" },
  { d: "prompt", en: "response validation",                                ja: "応答の検証" },
  { d: "prompt", en: "defensive parsing",                                  ja: "壊れた出力に備えた読み取り" },
  { d: "prompt", en: "skepticism toward confident output",                 ja: "自信のある出力への疑い" },

  { d: "agents", en: "a workflow versus an agent",         ja: "ワークフローかエージェントかの判断" },
  { d: "agents", en: "manager/supervisor hierarchies",     ja: "監督役を置く階層" },
  { d: "agents", en: "subagents",                          ja: "子（別の窓で動くエージェント）" },
  { d: "agents", en: "tool-use loops",                     ja: "ツールを使うループ" },
  { d: "agents", en: "memory",                             ja: "記憶（窓の外に残すメモ）" },
  { d: "agents", en: "agentic abstraction frameworks",     ja: "エージェントの枠組み" },
  { d: "agents", en: "custom agent loops and harnesses",   ja: "自前のループとハーネス" },
  { d: "agents", en: "self-hosted vs. Anthropic-hosted",   ja: "自前で動かすか、Anthropic が動かすか" },
  { d: "agents", en: "hooks for deterministic actions",    ja: "決まった処理を必ず行うフック" },

  { d: "apps", en: "invoking Claude through third-party vendors",         ja: "他社のクラウド経由での呼び出し" },
  { d: "apps", en: "Messages API data access patterns",                   ja: "Messages API への資料の渡し方" },
  { d: "apps", en: "tradeoffs between realtime and batch API selection",  ja: "通常の呼び出しと Batch の選び分け" },
  { d: "apps", en: "asynchronous programming",                            ja: "非同期処理" },
  { d: "apps", en: "version control",                                     ja: "バージョン管理" },
  { d: "apps", en: "SDLC integration",                                    ja: "開発工程への組み込み" },
  { d: "apps", en: "code review",                                         ja: "コードレビュー" },
  { d: "apps", en: "small- and large-scale refactoring",                  ja: "小さな書き換えと大きな作り直し" },
  { d: "apps", en: "Functional and infrastructure requirements",          ja: "機能の要件と基盤の要件" },
  { d: "apps", en: "business requirements and solution architecture",    ja: "業務の要件と全体の構成" },
  { d: "apps", en: "Systems life cycle management",                       ja: "システムのライフサイクル管理" },
  { d: "apps", en: "how Claude interprets instructions across interfaces", ja: "入口ごとの指示の読まれ方" },
  { d: "apps", en: "content boundaries",                                  ja: "指示とデータの境目" },
  { d: "apps", en: "schema design",                                       ja: "入出力の形の設計" },
  { d: "apps", en: "session hygiene",                                     ja: "セッションの衛生" },
  { d: "apps", en: "plugin management",                                   ja: "プラグインの管理" },
  { d: "apps", en: "model version pinning",                               ja: "モデルの版の固定" },
  { d: "apps", en: "prompt versioning",                                   ja: "プロンプトの版管理" },
  { d: "apps", en: "plugin dependencies",                                 ja: "プラグインの依存関係" },
];

/** 原文の行のうち、GLOSSARY や TERMS の出どころになったもので、SKILLS 以外の章にあるもの（**原文のまま**）。 */
export const QUOTES = [];

/** 教材が日本語で作った「名前」と、公式の英語。
 *  本文には `<span data-en="窓"></span>` の目印だけを置き、reindex が「窓（context window）」に展開する。
 *  **HTML に手で書かない。** 英語は原文からしか取らない。ドメインを書くときに足す。 */
export const TERMS = {
  "窓":               "context window",
  "キャッシュの区切り": "cache check-pointing",
  "刈り込み":          "tool output pruning",
  "圧縮":             "compaction",
  "子":               "subagent",
  "監督役":            "supervisor",
  "ツールを使うループ":  "tool-use loops",
  "枠組み":            "agentic abstraction frameworks",
  "決定的":            "deterministic",
  "非同期処理":         "asynchronous programming",
  "ライフサイクル管理":  "life cycle management",
  "セッションの衛生":    "session hygiene",
};

/** 節の「登場人物」。本文に `<p class="cast" data-cast="app,claude"></p>` と置くと
 *  reindex が「アプリ → Claude」に展開する。**HTML に名前を手で書かない。**
 *  side は色の規約に合わせる ── **アプリ側＝青／モデル側＝琥珀**、外にいる人は中立。 */
export const CAST = {
  app:    { ja: "アプリ",       side: "blue" },
  dev:    { ja: "開発者",       side: "blue" },
  cc:     { ja: "Claude Code", side: "blue" },
  tool:   { ja: "ツール",       side: "blue" },
  mcp:    { ja: "MCP サーバ",   side: "blue" },
  hook:   { ja: "フック",       side: "blue" },
  claude: { ja: "Claude",      side: "amber" },
  parent: { ja: "親",          side: "amber" },
  child:  { ja: "子",          side: "amber" },
  human:  { ja: "人",          side: "neutral" },
};

/* ---------- 導出 ─ ここから先は計算。手で書かない ---------- */

/** 最大剰余法。total を重み（整数）の比で配り、**合計を必ず total にそろえる**。
 *  同点のときは定義順（先にあるほう）に1を足す。整数だけで計算する（浮動小数の誤差を持ち込まない）。 */
export const apportion = (total, weights) => {
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map(w => total * w);
  const out = raw.map(r => Math.floor(r / sum));
  const left = total - out.reduce((a, b) => a + b, 0);
  raw.map((r, i) => [r % sum, i])
     .sort((a, b) => b[0] - a[0] || a[1] - b[1])
     .slice(0, left)
     .forEach(([, i]) => { out[i]++; });
  return out;
};

/** 本試験 EXAM.items 問のドメイン別の問数（目安）。{ agents: 8, apps: 17, … } */
export const domainItems = () => {
  const keys = Object.keys(DOMAINS);
  const n = apportion(EXAM.items, keys.map(k => DOMAINS[k].w));
  return Object.fromEntries(keys.map((k, i) => [k, n[i]]));
};

/** 設問 total 問を、スキルの重みで配る。{ "agent-architecture": 4, … } */
export const skillQuiz = (total) => {
  const keys = Object.keys(SKILLS);
  const n = apportion(total, keys.map(k => SKILLS[k].w));
  return Object.fromEntries(keys.map((k, i) => [k, n[i]]));
};

/** 重み（0.1% 単位）を表示用の文字列に。147 → "14.7%"、110 → "11.0%"（原文と同じ1桁） */
export const pct = (w) => `${(w / 10).toFixed(1)}%`;
