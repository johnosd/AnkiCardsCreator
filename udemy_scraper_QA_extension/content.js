(() => {
  // Painel só no frame principal (evita múltiplas UIs)
  if (window.top !== window) return;

  // ---------- Helpers ----------
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const getText = (node) => (node?.textContent || "").replace(/\s+/g, " ").trim();
  const now = () => new Date().toLocaleTimeString();

  const SELECTORS = {
    // Modo teste (sidebar)
    quizHeader: '[class*="question-navigation-header--sidebar-header"]',
    navItem: 'li[data-purpose="question-navigation-item"]',
    navItemTitleBtn: 'div[class*="question-navigation-item--title-row"] button',

    // Comuns
    questionPrompt: '#question-prompt, [id="question-prompt"]',
    answerPane: '[class*="result-pane--answer-result-pane"]',
    answerText:
      '#answer-text, [id="answer-text"], .answer-result-pane--answer-body--cDGY6 [data-purpose*="rich-text-viewer:html"], [data-purpose="answer-body"] [data-purpose*="rich-text-viewer:html"]',
    explanation: '#overall-explanation, [id="overall-explanation"]',
    domainPane: '[data-purpose="domain-pane"]',

    // Página de revisão (lista de todas as questões)

    reviewQuestion: '.question-result--question-result--LWiOB',
    answerCorrectFlag: '[class*="answer-result-pane--answer-correct"]'
  };

  // ---------- Painel ----------
  function buildPanel() {
    if (document.getElementById('udemy-scraper-panel-host')) return;

    const host = document.createElement('div');
    host.id = 'udemy-scraper-panel-host';
    host.style.all = 'initial';
    host.style.position = 'fixed';
    host.style.bottom = '16px';
    host.style.right = '16px';
    host.style.zIndex = '2147483647';

    const shadow = host.attachShadow({ mode: 'open' });

    const css = document.createElement('style');
    css.textContent = `
      :host { all: initial; }
      .card { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, 'Helvetica Neue', Arial;
              width: 320px; box-shadow: 0 10px 25px rgba(0,0,0,.15); border-radius: 16px; overflow: hidden; border: 1px solid rgba(0,0,0,.08); background: #0f172a; color: #e2e8f0; }
      .header { display:flex; align-items:center; gap:10px; padding: 12px 14px; background: linear-gradient(180deg,#1e293b,#0f172a); border-bottom: 1px solid rgba(255,255,255,.06);}
      .dot { width:8px;height:8px;border-radius:999px;background:#22c55e; box-shadow:0 0 0 3px rgba(34,197,94,.2)}
      .title { font-weight:700; font-size:14px; letter-spacing:.3px }
      .body { padding: 12px 14px; display:flex; flex-direction:column; gap:10px }
      .row { display:flex; align-items:center; justify-content:space-between; gap:8px }
      .btn { cursor:pointer; border:0; border-radius:12px; padding:10px 12px; font-weight:700; background:#22c55e; color:#0b1220; }
      .btn:disabled { opacity:.5; cursor: not-allowed }
      .btn.secondary { background:#334155; color:#e2e8f0 }
      .btn.warn { background:#ef4444; color:white }
      .stat { font-size:12px; opacity:.9 }
      .mono { font-family: ui-monospace, Menlo, Monaco, Consolas, 'Liberation Mono', monospace; font-size:12px; color:#94a3b8 }
      .pill { font-size:11px; padding:2px 8px; border-radius:999px; background:#1f2937; border:1px solid rgba(255,255,255,.06); }
      .log { max-height: 140px; overflow:auto; background:#0b1220; border:1px solid rgba(255,255,255,.06); padding:8px; border-radius:10px }
    `;

    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.innerHTML = `
      <div class="header">
        <div class="dot"></div>
        <div class="title">Udemy QA Scraper</div>
        <div class="pill" id="status-pill">pronto</div>
      </div>
      <div class="body">
        <div class="row"><div class="stat">Perguntas extraídas:</div><div class="mono" id="q-count">0</div></div>
        <div class="row"><div class="stat">Respostas corretas:</div><div class="mono" id="a-count">0</div></div>
        <div class="row">
          <button class="btn" id="start-btn">Iniciar</button>
          <button class="btn warn" id="stop-btn" disabled>Parar</button>
          <button class="btn secondary" id="download-btn" disabled>Baixar JSON</button>
        </div>
        <div class="log mono" id="log"></div>
      </div>
    `;

    shadow.appendChild(css);
    shadow.appendChild(wrap);
    document.documentElement.appendChild(host);
  }

  function panelAPI() {
    const root = document.getElementById('udemy-scraper-panel-host')?.shadowRoot;
    const els = {
      status: root?.getElementById('status-pill'),
      q: root?.getElementById('q-count'),
      a: root?.getElementById('a-count'),
      log: root?.getElementById('log'),
      start: root?.getElementById('start-btn'),
      stop: root?.getElementById('stop-btn'),
      dl: root?.getElementById('download-btn'),
    };
    const setStatus = (txt) => els.status && (els.status.textContent = txt);
    const setQ = (n) => els.q && (els.q.textContent = String(n));
    const setA = (n) => els.a && (els.a.textContent = String(n));
    const log = (msg) => {
      if (!els.log) return;
      const line = document.createElement('div');
      line.textContent = `[${now()}] ${msg}`;
      els.log.appendChild(line);
      els.log.scrollTop = els.log.scrollHeight;
    };
    const toggleRunning = (running) => {
      if (!els.start || !els.stop) return;
      els.start.disabled = running;
      els.stop.disabled = !running;
    };
    const enableDownload = (enabled) => { if (els.dl) els.dl.disabled = !enabled; };
    return { ...els, setStatus, setQ, setA, log, toggleRunning, enableDownload };
  }

  // Constrói painel
  buildPanel();
  const ui = panelAPI();

  // ---------- Estado & armazenamento ----------
  let isRunning = false;
  let results = [];
  const STORE_KEY = 'udemy_scraper_results';
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch { return []; } },
    set(arr) { try { localStorage.setItem(STORE_KEY, JSON.stringify(arr)); } catch {} },
    clear() { try { localStorage.removeItem(STORE_KEY); } catch {} }
  };
  const processedKeys = new Set();

  function downloadJSON(data, filename = 'udemy_scraper_QA.json') {
    try {
      const persisted = store.get();
      const payload = (persisted && persisted.length) ? persisted : data;
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      ui.log(`Falha ao baixar JSON: ${e.message}`);
    }
  }

  // ---------- Modo teste (sidebar) ----------
  function isAnsweredNavItem(li) {
    const titleRow = li.querySelector('div[class*="question-navigation-item--title-row"]');
    const t = getText(titleRow).toLowerCase();
    return /correto|incorreto/.test(t);
  }
  function navItemsAnswered() {
    return Array.from(document.querySelectorAll(SELECTORS.navItem)).filter(isAnsweredNavItem);
  }
  function keyForNavItem(li) {
    const titleRow = li.querySelector('div[class*="question-navigation-item--title-row"]');
    const key = getText(titleRow) || getText(li);
    return key || Math.random().toString(36).slice(2);
  }
  async function waitForQuestionChange(prev = '', timeout = 5000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const cur = getQuestionText();
      if (cur && cur !== prev) return true;
      await sleep(100);
    }
    return false;
  }
  async function clickNavItem(li) {
    const btn = li.querySelector(SELECTORS.navItemTitleBtn) || li.querySelector('button.ud-btn');
    if (!btn) throw new Error('Botão da pergunta não encontrado.');
    btn.scrollIntoView({ block: 'center' });
    await sleep(50);
    btn.click();
  }

  function findCorrectAnswerTexts() {
    const panes = Array.from(document.querySelectorAll(SELECTORS.answerPane));
    const out = [];
    const useTextFallback = !panes.some(p => p.querySelector(SELECTORS.answerCorrectFlag));
    for (const pane of panes) {
      const hasCorrectFlag = !!pane.querySelector(SELECTORS.answerCorrectFlag);
      const txt = (pane.textContent || '').toLowerCase();
      if (hasCorrectFlag || (useTextFallback && /\bcorreta\b/.test(txt) && !/incorreta/.test(txt))) {
        const aNode = pane.querySelector(SELECTORS.answerText);
        const aText = getText(aNode);
        if (aText) out.push(aText);
      }
    }
    return Array.from(new Set(out));
  }
  function getQuestionText() {
    const q = document.querySelector(SELECTORS.questionPrompt);
    return getText(q);
  }
  function getExplanationAndDomain() {
    const expEl = document.querySelector(SELECTORS.explanation);
    const domEl = document.querySelector(SELECTORS.domainPane);
    const exp = getText(expEl);
    let tags = '';
    if (domEl) {
      const maybe = domEl.querySelector('.ud-text-md, div');
      tags = getText(maybe);
    }
    return { exp, tags };
  }

  // ---------- Modo página de revisão ----------
  function isReviewPage() {
    return Boolean(document.querySelector(SELECTORS.reviewQuestion));
  }
  function findCorrectAnswersInBlock(block) {
    const panes = Array.from(block.querySelectorAll(SELECTORS.answerPane));
    const outs = [];
    const useTextFallback = !panes.some(p => p.querySelector(SELECTORS.answerCorrectFlag));
    for (const pane of panes) {
      const hasCorrectFlag = !!pane.querySelector(SELECTORS.answerCorrectFlag);
      const txt = (pane.textContent || '').toLowerCase();
      if (hasCorrectFlag || (useTextFallback && txt.includes('correta') && !txt.includes('incorreta'))) {
        const aNode =
          pane.querySelector(SELECTORS.answerText) ||
          pane.querySelector('[id="answer-text"]') ||
          pane.querySelector('[data-purpose*="rich-text-viewer:html"]');
        const aText = (aNode?.textContent || '').replace(/\s+/g,' ').trim();
        if (aText) outs.push(aText);
      }
    }
    return Array.from(new Set(outs));
  }
  async function extractFromReviewPage() {
    const blocks = Array.from(document.querySelectorAll(SELECTORS.reviewQuestion));
    if (!blocks.length) return 0;

    let qCount = 0, aCount = 0;
    for (let i = 0; i < blocks.length && isRunning; i++) {
      const block = blocks[i];
      block.scrollIntoView({ block: 'center' });
      await sleep(50);

      const frontEl =
        block.querySelector(SELECTORS.questionPrompt) ||
        block.querySelector('[id="question-prompt"]') ||
        block.querySelector('[data-purpose*="rich-text-viewer:html"]');

      const front = (frontEl?.textContent || '').replace(/\s+/g,' ').trim();
      const correctAnswers = findCorrectAnswersInBlock(block);

      const expEl = block.querySelector(SELECTORS.explanation);
      const exp = (expEl?.textContent || '').replace(/\s+/g,' ').trim();

      const domainEl = block.querySelector('[data-purpose="domain-pane"] .ud-text-md, [data-purpose="domain-pane"] div');
      const tags = (domainEl?.textContent || '').replace(/\s+/g,' ').trim();

      if (front && correctAnswers.length) {
        const row = { front, back: correctAnswers.join('\n'), Explicacao: exp || '', tags: tags || '' };
        results.push(row);
        const acc = store.get(); acc.push(row); store.set(acc);

        qCount += 1; aCount += correctAnswers.length;
        ui.setQ(qCount); ui.setA(aCount);
        ui.log(`Pergunta ${i+1}: ok (${correctAnswers.length} correta(s)).`);
      } else {
        ui.log(`Pergunta ${i+1}: ignorada (sem enunciado ou sem resposta correta).`);
      }
    }
    if (results.length) ui.enableDownload(true);
    return qCount;
  }

  // ---------- Detector de contexto ----------
  function ensureOnQuizPage() {
    return Boolean(
      document.querySelector(SELECTORS.quizHeader) ||
      document.querySelector(SELECTORS.questionPrompt) ||
      document.querySelector(SELECTORS.reviewQuestion)
    );
  }

  // ---------- Execução ----------
  async function run() {
    ui.toggleRunning(true);
    ui.setStatus('checando página…');

    if (!ensureOnQuizPage()) {
      ui.log('Abra um simulado da Udemy e tente novamente.');
      ui.setStatus('simulado não detectado');
      ui.toggleRunning(false);
      return;
    }

    ui.setStatus('coletando…');

    // Tenta sidebar; se não houver, cai para página de revisão
    const items = Array.from(document.querySelectorAll(SELECTORS.navItem)).filter(isAnsweredNavItem);

    if (items.length === 0 && isReviewPage()) {
      const total = await extractFromReviewPage();
      ui.toggleRunning(false);
      ui.setStatus(total ? 'concluído' : 'sem dados');
      ui.log(total ? `Concluído. Total: ${total} perguntas exportáveis.` : 'Nada para exportar.');
      return;
    }

    if (!items.length) {
      ui.log('Nenhuma pergunta respondida encontrada (sidebar).');
      ui.setStatus('sem respondidas');
      ui.toggleRunning(false);
      return;
    }

    ui.log(`Encontradas ${items.length} perguntas respondidas (sidebar).`);

    let qCount = 0; let aCount = 0; let lastFront = '';

    while (isRunning) {
      const pool = navItemsAnswered().filter(li => !processedKeys.has(keyForNavItem(li)));
      if (!pool.length) break;

      const li = pool[0];
      const key = keyForNavItem(li);
      try {
        await clickNavItem(li);
        await waitForQuestionChange(lastFront, 5000);
        const loaded = document.querySelector(SELECTORS.questionPrompt) && document.querySelector(SELECTORS.answerPane);
        if (!loaded) { ui.log(`Item '${key}': timeout ao carregar.`); processedKeys.add(key); continue; }

        const front = getQuestionText();
        lastFront = front || lastFront;
        const correctAnswers = findCorrectAnswerTexts();
        const { exp, tags } = getExplanationAndDomain();

        if (!front) { ui.log(`Item '${key}': enunciado vazio; ignorado.`); processedKeys.add(key); continue; }
        if (!correctAnswers.length) { ui.log(`Item '${key}': nenhuma resposta correta visível; ignorado.`); processedKeys.add(key); continue; }

        const row = { front, back: correctAnswers.join('\n'), Explicacao: exp || '', tags: tags || '' };
        results.push(row);
        const acc = store.get(); acc.push(row); store.set(acc);

        qCount += 1; aCount += correctAnswers.length;
        ui.setQ(qCount); ui.setA(aCount);
        ui.log(`Item '${key}': ok (${correctAnswers.length} correta(s)).`);
        processedKeys.add(key);

        await sleep(800); // intervalo solicitado
      } catch (e) {
        ui.log(`Item '${key}': erro - ${e.message}`);
        processedKeys.add(key);
      }
    }

    ui.toggleRunning(false);
    const total = store.get().length || results.length;
    if (total) {
      ui.enableDownload(true);
      ui.setStatus('concluído');
      ui.log(`Concluído. Total: ${total} perguntas exportáveis.`);
    } else {
      ui.setStatus('sem dados');
      ui.log('Nada para exportar.');
    }
  }

  // ---------- Botões ----------
  if (ui.start) {
    ui.start.addEventListener('click', async () => {
      if (isRunning) return;
      isRunning = true;
      results = [];
      processedKeys.clear();
      store.clear();
      ui.setQ(0); ui.setA(0);
      ui.enableDownload(false);
      run().finally(() => { isRunning = false; });
    });
  }
  if (ui.stop) {
    ui.stop.addEventListener('click', () => {
      isRunning = false;
      ui.setStatus('interrompido');
      ui.toggleRunning(false);
    });
  }
  if (ui.dl) {
    ui.dl.addEventListener('click', () => downloadJSON(results));
  }
})();
