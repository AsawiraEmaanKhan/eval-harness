/* ============================================================
   STATE
   ============================================================ */
const uid = () => Math.random().toString(36).slice(2, 9);

let criteria = [
  { id: uid(), name: "Accuracy", desc: "Output matches the expected facts / intent" },
  { id: uid(), name: "Format", desc: "Follows the requested structure or schema" },
  { id: uid(), name: "Tone", desc: "Voice matches what was asked for" },
];

let cases = [
  { id: uid(), input: "Summarize: 'Q3 revenue grew 12% but churn rose to 4.1%.' in one sentence for a PM update.", expected: "One sentence, mentions both growth and churn." },
  { id: uid(), input: "Extract the meeting action items from: 'We agreed Asawira ships the eval tool by Friday, and Ali reviews the resume draft Monday.'", expected: "A clean list of 2 action items with owner + date." },
];

const PRESETS = {
  summary: "You are a product manager writing a crisp status update.\n\nSummarize the following in one sentence, plain language, no jargon:\n\n{{input}}",
  extract: "Extract every action item from the text below. Return a bulleted list with owner and date if mentioned.\n\nText:\n{{input}}",
  support: "You are a support agent. Reply to the message below in a warm, direct tone. Keep it under 4 sentences.\n\nMessage:\n{{input}}",
};

let lastResults = null;

/* ============================================================
   UTIL
   ============================================================ */
function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
function escapeAttr(str){ return (str || '').replace(/"/g, '&quot;'); }

function scoreColor(score){
  if (score >= 4) return 'var(--pass)';
  if (score >= 3) return 'var(--warn)';
  return 'var(--fail)';
}

function toast(message, isError){
  const stack = document.getElementById('toastStack');
  const el = document.createElement('div');
  el.className = 'toast' + (isError ? ' is-error' : '');
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 0.3s ease';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 4200);
}

/* ============================================================
   GAUGE
   ============================================================ */
const GAUGE_ARC_LENGTH = 314; // approx path length for the drawn arc

function initTicks(){
  const g = document.getElementById('gaugeTicks');
  const cx = 120, cy = 140, rOuter = 100, rInner = 88;
  let html = '';
  for (let i = 0; i <= 5; i++){
    const angle = Math.PI - (i / 5) * Math.PI; // 180deg (left) to 0deg (right)
    const x1 = cx + rOuter * Math.cos(angle);
    const y1 = cy - rOuter * Math.sin(angle);
    const x2 = cx + rInner * Math.cos(angle);
    const y2 = cy - rInner * Math.sin(angle);
    html += `<line class="gauge-tick" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" />`;
  }
  g.innerHTML = html;
}

function setGauge(score){
  const fill = document.getElementById('gaugeFill');
  const needle = document.getElementById('gaugeNeedle');
  const num = document.getElementById('gaugeNum');

  if (score === null){
    fill.style.strokeDashoffset = GAUGE_ARC_LENGTH;
    needle.style.transform = 'rotate(-90deg)';
    num.textContent = '—';
    return;
  }
  const pct = Math.max(0, Math.min(1, score / 5));
  fill.style.strokeDashoffset = String(GAUGE_ARC_LENGTH * (1 - pct));
  fill.style.stroke = scoreColor(score).replace('var(', '').replace(')', '');
  // resolve CSS var manually since SVG stroke can't read var() reliably across all cases
  fill.style.stroke = getComputedStyle(document.documentElement).getPropertyValue(
    score >= 4 ? '--pass' : score >= 3 ? '--warn' : '--fail'
  ).trim();
  const deg = -90 + pct * 180;
  needle.style.transform = `rotate(${deg}deg)`;
  num.textContent = score.toFixed(1);
}

/* ============================================================
   RENDER: CRITERIA
   ============================================================ */
function renderCriteria(){
  const list = document.getElementById('criteriaList');
  list.innerHTML = '';
  criteria.forEach(c => {
    const row = document.createElement('div');
    row.className = 'crit-row';
    row.innerHTML = `
      <input type="text" placeholder="Criterion name" value="${escapeAttr(c.name)}" data-id="${c.id}" data-field="name">
      <input type="text" placeholder="What good looks like" value="${escapeAttr(c.desc)}" data-id="${c.id}" data-field="desc">
      <button class="row-remove" aria-label="Remove criterion" data-remove="${c.id}">✕</button>
    `;
    list.appendChild(row);
  });
  list.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', e => {
      const { id, field } = e.target.dataset;
      const item = criteria.find(c => c.id === id);
      if (item) item[field] = e.target.value;
    });
  });
  list.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', e => {
      criteria = criteria.filter(c => c.id !== e.target.dataset.remove);
      renderCriteria();
    });
  });
}

document.getElementById('addCriterion').addEventListener('click', () => {
  criteria.push({ id: uid(), name: '', desc: '' });
  renderCriteria();
});

/* ============================================================
   RENDER: CASES
   ============================================================ */
function renderCases(){
  const list = document.getElementById('casesList');
  list.innerHTML = '';
  cases.forEach((c, i) => {
    const card = document.createElement('div');
    card.className = 'case-card';
    card.innerHTML = `
      <div class="case-top">
        <span class="case-tag">CASE ${String(i + 1).padStart(2, '0')}</span>
        <button class="row-remove" data-remove="${c.id}" aria-label="Remove case">✕</button>
      </div>
      <textarea rows="2" placeholder="Input to send" data-id="${c.id}" data-field="input">${escapeHtml(c.input)}</textarea>
      <textarea rows="1" placeholder="Expected / reference notes (optional)" data-id="${c.id}" data-field="expected">${escapeHtml(c.expected)}</textarea>
    `;
    list.appendChild(card);
  });
  list.querySelectorAll('textarea').forEach(ta => {
    ta.addEventListener('input', e => {
      const { id, field } = e.target.dataset;
      const item = cases.find(c => c.id === id);
      if (item) item[field] = e.target.value;
    });
  });
  list.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', e => {
      cases = cases.filter(c => c.id !== e.target.dataset.remove);
      renderCases();
    });
  });
}

document.getElementById('addCase').addEventListener('click', () => {
  cases.push({ id: uid(), input: '', expected: '' });
  renderCases();
});

/* ============================================================
   PRESETS + KEY VISIBILITY
   ============================================================ */
document.getElementById('presetRow').addEventListener('click', e => {
  const btn = e.target.closest('[data-preset]');
  if (!btn) return;
  document.getElementById('promptTemplate').value = PRESETS[btn.dataset.preset];
  document.querySelectorAll('.chip').forEach(c => c.style.borderColor = '');
  btn.style.borderColor = 'var(--teal)';
});

document.getElementById('toggleKey').addEventListener('click', () => {
  const input = document.getElementById('apiKey');
  const btn = document.getElementById('toggleKey');
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  btn.textContent = showing ? 'Show' : 'Hide';
});

/* ============================================================
   RAIL: active step tracking
   ============================================================ */
const railSteps = Array.from(document.querySelectorAll('.rail-step'));
const sections = railSteps.map(s => document.getElementById(s.dataset.target));

railSteps.forEach(step => {
  step.addEventListener('click', () => {
    document.getElementById(step.dataset.target).scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const idx = sections.indexOf(entry.target);
    if (idx === -1) return;
    if (entry.isIntersecting){
      railSteps.forEach(s => s.classList.remove('is-active'));
      railSteps[idx].classList.add('is-active');
    }
  });
}, { rootMargin: '-20% 0px -60% 0px', threshold: 0 });

sections.forEach(s => s && io.observe(s));

/* ============================================================
   API CALL
   ============================================================ */
async function callClaude(prompt, apiKey){
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok){
    const errText = await res.text();
    throw new Error(`API error ${res.status}: ${errText.slice(0, 180)}`);
  }
  const data = await res.json();
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}

/* ============================================================
   RUN EVAL
   ============================================================ */
const runBtn = document.getElementById('runBtn');
const runBtnLabel = document.getElementById('runBtnLabel');
const runStatus = document.getElementById('runStatus');
const emptyState = document.getElementById('emptyState');
const resultsList = document.getElementById('resultsList');
const copyBtn = document.getElementById('copyReport');
const downloadBtn = document.getElementById('downloadReport');

runBtn.addEventListener('click', runEval);

async function runEval(){
  const apiKey = document.getElementById('apiKey').value.trim();
  if (!apiKey){
    toast('Paste an Anthropic API key above to run live evals.', true);
    return;
  }

  const activeCases = cases.filter(c => c.input.trim());
  const activeCriteria = criteria.filter(c => c.name.trim());
  if (activeCases.length === 0 || activeCriteria.length === 0){
    toast('Add at least one test case and one rubric criterion first.', true);
    return;
  }

  const promptTemplate = document.getElementById('promptTemplate').value;
  emptyState.style.display = 'none';
  resultsList.innerHTML = '';
  setGauge(null);
  runBtn.disabled = true;
  copyBtn.disabled = true;
  downloadBtn.disabled = true;

  const results = [];

  for (let i = 0; i < activeCases.length; i++){
    const tc = activeCases[i];
    runBtnLabel.textContent = `Running…`;
    runStatus.textContent = `Case ${i + 1} of ${activeCases.length}`;

    const filledPrompt = promptTemplate.replace(/{{\s*input\s*}}/gi, tc.input);
    let output = '';
    try{
      output = await callClaude(filledPrompt, apiKey);
    }catch(e){
      toast(e.message, true);
      runBtn.disabled = false;
      runBtnLabel.textContent = 'Run eval';
      runStatus.textContent = '';
      return;
    }

    const rubricList = activeCriteria.map(c => `- ${c.name}: ${c.desc || 'no description given'}`).join('\n');
    const judgePrompt = `You are grading a model output against a rubric. Be strict and honest.

Task given to the model:
${tc.input}

Expected / reference notes (may be partial): ${tc.expected || 'none provided'}

Model output:
${output}

Rubric criteria:
${rubricList}

For each criterion, give a score from 1-5 and a one-sentence reason. Respond ONLY with valid JSON, no markdown fences, no preamble, in this exact shape:
{"scores": [{"criterion": "name", "score": 1, "reason": "..."}], "overall_note": "one sentence summary"}`;

    let judge = { scores: [], overall_note: '[scoring failed]' };
    try{
      const judgeRaw = await callClaude(judgePrompt, apiKey);
      const cleaned = judgeRaw.replace(/```json|```/g, '').trim();
      judge = JSON.parse(cleaned);
    }catch(e){ /* fallback kept */ }

    results.push({ input: tc.input, output, judge });
    renderResults(results);
    updateGaugeFromResults(results);
  }

  runBtn.disabled = false;
  runBtnLabel.textContent = 'Run eval';
  runStatus.textContent = `Done — ${activeCases.length} case${activeCases.length > 1 ? 's' : ''}`;
  copyBtn.disabled = false;
  downloadBtn.disabled = false;
  lastResults = results;
  toast('Eval complete.');
}

function updateGaugeFromResults(results){
  let total = 0, count = 0;
  results.forEach(r => (r.judge.scores || []).forEach(s => { total += s.score; count++; }));
  setGauge(count ? total / count : null);
}

function renderResults(results){
  resultsList.innerHTML = '';
  results.forEach((r, i) => {
    const scores = r.judge.scores || [];
    const avg = scores.length ? (scores.reduce((a, s) => a + s.score, 0) / scores.length).toFixed(1) : '—';
    const scoresHtml = scores.map(s => `
      <div class="score-line">
        <span class="score-num" style="color:${scoreColor(s.score)};">${s.score}/5</span>
        <div class="score-bar-track"><div class="score-bar-fill" style="width:${(s.score/5)*100}%; background:${scoreColor(s.score)};"></div></div>
        <span><strong>${escapeHtml(s.criterion)}</strong> — ${escapeHtml(s.reason)}</span>
      </div>
    `).join('');
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = `
      <div class="result-head">
        <span>CASE ${String(i + 1).padStart(2, '0')}</span>
        <span class="result-avg" style="color:${scores.length ? scoreColor(parseFloat(avg)) : 'inherit'}">${avg} avg</span>
      </div>
      <div class="result-body">
        <div class="io-block"><span class="field-label">Input</span>${escapeHtml(r.input)}</div>
        <div class="output-block"><span class="field-label">Model output</span>${escapeHtml(r.output)}</div>
        <div class="score-grid">${scoresHtml}</div>
        ${r.judge.overall_note ? `<div class="note">${escapeHtml(r.judge.overall_note)}</div>` : ''}
      </div>
    `;
    resultsList.appendChild(card);
  });
}

/* ============================================================
   COPY / DOWNLOAD
   ============================================================ */
copyBtn.addEventListener('click', async () => {
  if (!lastResults) return;
  const lines = lastResults.map((r, i) => {
    const scores = (r.judge.scores || []).map(s => `  ${s.criterion}: ${s.score}/5 — ${s.reason}`).join('\n');
    return `Case ${i + 1}\nInput: ${r.input}\nOutput: ${r.output}\n${scores}\nNote: ${r.judge.overall_note || ''}`;
  }).join('\n\n');
  try{
    await navigator.clipboard.writeText(lines);
    toast('Report copied to clipboard.');
  }catch(e){
    toast('Could not copy — clipboard permission blocked.', true);
  }
});

downloadBtn.addEventListener('click', () => {
  if (!lastResults) return;
  const blob = new Blob([JSON.stringify(lastResults, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'eval-report.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('Report downloaded.');
});

/* ============================================================
   INIT
   ============================================================ */
document.getElementById('promptTemplate').value =
  "You are a helpful assistant. Respond concisely.\n\nTask: {{input}}";

initTicks();
setGauge(null);
renderCriteria();
renderCases();
