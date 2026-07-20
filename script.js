/* ============================================================
   DATA
   ============================================================ */
const uid = () => Math.random().toString(36).slice(2, 9);

const TASKS = {
  summarize: {
    label: "Summarize something long",
    blurb: "Turn a messy update into one clear sentence.",
    instruction: "Summarize the following in one clear sentence for a busy reader. Keep the key facts, drop filler.",
    placeholder: "So we shipped the new onboarding flow on Tuesday, saw signups tick up about 12% week over week, but then noticed Thursday that the drop off rate on step 3 jumped because the loading spinner was hanging on Safari, we patched it Friday morning, and by the weekend numbers looked more normal, still waiting on the final weekly report before we call it a win.",
    criteria: [
      { name: "Accuracy", desc: "Sticks to real facts, invents nothing" },
      { name: "Length limit", desc: "Genuinely one sentence, not a shortened paragraph" },
      { name: "Actionable", desc: "A busy reader knows what happened without asking follow up questions" },
    ],
  },
  extract: {
    label: "Pull out action items",
    blurb: "Turn a conversation into a clean to do list.",
    instruction: "Extract every action item from the following text as a bulleted list. Include the owner and date if mentioned.",
    placeholder: "Okay so recapping the call. Asawira is going to ship the eval tool by Friday, Ali said he would review the resume draft on Monday, and we all agreed to hold off on the LinkedIn post until both of those are done. Also someone needs to double check the GitHub Pages link works before we share it anywhere.",
    criteria: [
      { name: "Completeness", desc: "Every real action item is captured, nothing missed" },
      { name: "Clean formatting", desc: "Clear bulleted list, not a paragraph" },
      { name: "No missed items", desc: "Includes who is doing it and when, when that info exists" },
    ],
  },
  reply: {
    label: "Write a reply",
    blurb: "Respond to a message in a tone you choose.",
    instruction: "Write a warm, direct reply to the following message in under 4 sentences. Do not over apologize.",
    placeholder: "Hey, I noticed the report you sent yesterday still has last quarter's numbers in the chart. Can you take a look before the 3pm meeting? Kind of stressed about this one.",
    criteria: [
      { name: "Tone match", desc: "Warm and direct, not stiff or over apologetic" },
      { name: "Length limit", desc: "Under 4 sentences, no rambling" },
      { name: "No over apologizing", desc: "Does not grovel or repeat sorry multiple times" },
    ],
  },
  custom: {
    label: "Something else",
    blurb: "Describe your own task in plain words.",
    instruction: "",
    placeholder: "Paste the real text you want the AI to work on here.",
    criteria: [],
  },
};

const LIBRARY = [
  { category: "Accuracy and facts", items: [
    { name: "Accuracy", desc: "Sticks to real facts, invents nothing" },
    { name: "No hallucination", desc: "Does not add details that were not in the source" },
    { name: "Correct numbers", desc: "Any numbers or stats match the source exactly" },
    { name: "Source fidelity", desc: "Represents the original meaning without distortion" },
  ]},
  { category: "Tone and voice", items: [
    { name: "Tone match", desc: "Matches the voice you are going for, formal or casual" },
    { name: "Warmth", desc: "Feels human and considerate, not cold or robotic" },
    { name: "Confidence", desc: "Sounds sure of itself without overselling" },
    { name: "No over apologizing", desc: "Does not grovel or repeat sorry unnecessarily" },
    { name: "Professionalism", desc: "Appropriate for a workplace audience" },
  ]},
  { category: "Structure and format", items: [
    { name: "Format", desc: "Follows the exact structure you asked for, list or table" },
    { name: "Clean formatting", desc: "No stray symbols, broken lists, or markdown artifacts" },
    { name: "Logical order", desc: "Ideas flow in a sensible sequence" },
    { name: "Scannable", desc: "Easy to skim, not a wall of text" },
  ]},
  { category: "Length and brevity", items: [
    { name: "Length limit", desc: "Stays within the length you specified" },
    { name: "No padding", desc: "Does not repeat itself or add filler to seem thorough" },
    { name: "Right level of detail", desc: "Not too short to be useful, not too long to read" },
  ]},
  { category: "Completeness", items: [
    { name: "Completeness", desc: "Covers everything it needs to, nothing missing" },
    { name: "No missed items", desc: "Every real item or point from the source is captured" },
    { name: "Follows all instructions", desc: "Every part of the instruction was actually followed" },
  ]},
  { category: "Audience fit", items: [
    { name: "No jargon", desc: "Avoids technical terms a non expert would not know" },
    { name: "Reader appropriate", desc: "Matches what this specific audience needs to know" },
    { name: "Actionable", desc: "Reader knows what to do next after reading it" },
  ]},
  { category: "Safety and appropriateness", items: [
    { name: "No overpromising", desc: "Does not make commitments or guarantees it should not" },
    { name: "Neutral framing", desc: "Does not spin bad news as good or vice versa" },
    { name: "Appropriate content", desc: "Nothing inappropriate, offensive, or off brand" },
  ]},
];

/* ============================================================
   STATE
   ============================================================ */
let state = {
  step: 1,
  taskKey: null,
  instruction: "",
  customLine: "",
  customRules: "",
  advancedOpen: false,
  criteria: [],
  libraryOpen: false,
  inputText: "",
  fileName: "",
  result: null,
  notGradable: null,
};

/* ============================================================
   UTIL
   ============================================================ */
function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
function scoreColor(score){
  if (score >= 4) return 'var(--pass)';
  if (score >= 3) return 'var(--warn)';
  return 'var(--fail)';
}
function verdictLabel(avg){
  if (avg >= 4.3) return 'Strong';
  if (avg >= 3.5) return 'Solid, with room to improve';
  if (avg >= 2.5) return 'Mixed, worth revising';
  return 'Needs real work';
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
function parseJson(raw){
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}
function effectiveInstruction(){
  if (state.taskKey === 'custom'){
    return [state.customLine.trim(), state.customRules.trim()].filter(Boolean).join('\n\nAlso: ');
  }
  return state.instruction;
}

/* ============================================================
   API CALL
   ============================================================ */
async function callClaude(prompt){
  const apiKey = document.getElementById('apiKey').value.trim();
  if (!apiKey) throw new Error('no_key');
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
    throw new Error(`api_error_${res.status}: ${errText.slice(0, 160)}`);
  }
  const data = await res.json();
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}

/* ============================================================
   RAIL AND PROGRESS
   ============================================================ */
function updateRailAndProgress(){
  document.querySelectorAll('.rail-step').forEach(el => {
    const n = parseInt(el.dataset.step, 10);
    el.classList.toggle('is-active', n === state.step);
    el.classList.toggle('is-done', n < state.step);
  });
  document.getElementById('progressFill').style.width = `${(state.step / 4) * 100}%`;
  [1, 2, 3, 4].forEach(n => {
    document.getElementById(`step${n}`).style.display = n === state.step ? 'block' : 'none';
  });
}

document.querySelectorAll('.rail-step').forEach(el => {
  el.addEventListener('click', () => {
    const target = parseInt(el.dataset.step, 10);
    if (target < state.step || (target === state.step + 1)) {
      state.step = target;
      updateRailAndProgress();
    }
  });
});

/* ============================================================
   STEP 1: task picker
   ============================================================ */
function renderTaskGrid(){
  const grid = document.getElementById('taskGrid');
  grid.innerHTML = '';
  Object.entries(TASKS).forEach(([key, t]) => {
    const card = document.createElement('button');
    card.className = 'task-card';
    card.innerHTML = `<div class="task-card-title">${escapeHtml(t.label)}</div><div class="task-card-blurb">${escapeHtml(t.blurb)}</div>`;
    card.addEventListener('click', () => pickTask(key));
    grid.appendChild(card);
  });
}

function pickTask(key){
  const t = TASKS[key];
  state.taskKey = key;
  state.instruction = t.instruction;
  state.customLine = '';
  state.customRules = '';
  state.advancedOpen = false;
  state.criteria = t.criteria.map(c => ({ ...c, id: uid() }));
  state.libraryOpen = false;
  state.inputText = '';
  state.fileName = '';
  state.result = null;
  state.notGradable = null;
  state.step = 2;
  renderInstructionArea();
  renderCriteriaList();
  document.getElementById('libraryPanel').style.display = 'none';
  document.getElementById('libraryPanel').innerHTML = '';
  document.getElementById('openLibraryBtn').style.display = 'inline-block';
  updateRailAndProgress();
}

/* ============================================================
   STEP 2: instruction
   ============================================================ */
function renderInstructionArea(){
  const area = document.getElementById('instructionArea');
  if (state.taskKey === 'custom'){
    area.innerHTML = `
      <input type="text" id="customLineInput" placeholder="In one line, what should the AI do? Example: rewrite this in simpler English" value="${escapeHtml(state.customLine)}" style="margin-bottom:8px;">
      <input type="text" id="customRulesInput" placeholder="Any specific rules? Optional. Example: keep it under 50 words" value="${escapeHtml(state.customRules)}">
    `;
    document.getElementById('customLineInput').addEventListener('input', e => state.customLine = e.target.value);
    document.getElementById('customRulesInput').addEventListener('input', e => state.customRules = e.target.value);
    return;
  }
  if (!state.advancedOpen){
    area.innerHTML = `
      <div class="instruction-card">
        <p>${escapeHtml(state.instruction)}</p>
        <button class="btn-text" id="customizeBtn">Customize this, advanced</button>
      </div>
    `;
    document.getElementById('customizeBtn').addEventListener('click', () => { state.advancedOpen = true; renderInstructionArea(); });
  } else {
    area.innerHTML = `
      <textarea id="instructionTextarea" rows="3" style="margin-bottom:8px;">${escapeHtml(state.instruction)}</textarea>
      <button class="btn-text" id="doneCustomizeBtn">Done customizing</button>
    `;
    document.getElementById('instructionTextarea').addEventListener('input', e => state.instruction = e.target.value);
    document.getElementById('doneCustomizeBtn').addEventListener('click', () => { state.advancedOpen = false; renderInstructionArea(); });
  }
}

/* ============================================================
   STEP 2: criteria chips
   ============================================================ */
function renderCriteriaList(){
  const list = document.getElementById('criteriaList');
  const hint = document.getElementById('criteriaEmptyHint');
  hint.style.display = state.criteria.length === 0 ? 'block' : 'none';
  list.innerHTML = '';
  state.criteria.forEach(c => {
    const row = document.createElement('div');
    row.className = 'crit-chip';
    row.innerHTML = `
      <div>
        <div class="crit-chip-name">${escapeHtml(c.name)}</div>
        <div class="crit-chip-desc">${escapeHtml(c.desc)}</div>
      </div>
      <div style="display:flex; gap:4px; flex-shrink:0;">
        <button class="icon-btn" data-edit="${c.id}">Edit</button>
        <button class="icon-btn" data-remove="${c.id}">Remove</button>
      </div>
    `;
    list.appendChild(row);
  });
  list.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openCriterionEditor(btn.dataset.edit));
  });
  list.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.criteria = state.criteria.filter(c => c.id !== btn.dataset.remove);
      renderCriteriaList();
      if (state.libraryOpen) renderLibrary();
    });
  });
}

function openCriterionEditor(id){
  const c = state.criteria.find(x => x.id === id);
  const list = document.getElementById('criteriaList');
  const row = document.createElement('div');
  row.className = 'crit-edit-row';
  row.innerHTML = `
    <input type="text" id="editName" value="${escapeHtml(c.name)}" placeholder="What are you checking for">
    <input type="text" id="editDesc" value="${escapeHtml(c.desc)}" placeholder="What good looks like">
    <div style="display:flex; gap:8px;">
      <button class="btn btn-primary" id="editDone" style="padding:6px 14px; font-size:12px;">Done</button>
      <button class="btn-text" id="editRemove">Remove</button>
    </div>
  `;
  renderCriteriaList();
  list.appendChild(row);
  document.getElementById('editDone').addEventListener('click', () => {
    const name = document.getElementById('editName').value.trim();
    const desc = document.getElementById('editDesc').value.trim();
    if (name){ c.name = name; c.desc = desc; }
    renderCriteriaList();
  });
  document.getElementById('editRemove').addEventListener('click', () => {
    state.criteria = state.criteria.filter(x => x.id !== id);
    renderCriteriaList();
  });
}

document.getElementById('openLibraryBtn').addEventListener('click', () => {
  state.libraryOpen = true;
  document.getElementById('openLibraryBtn').style.display = 'none';
  renderLibrary();
});

function addFromLibrary(item){
  state.criteria.push({ id: uid(), name: item.name, desc: item.desc });
  renderCriteriaList();
  renderLibrary();
}

function addBlankCriterion(){
  const c = { id: uid(), name: '', desc: '' };
  state.criteria.push(c);
  renderCriteriaList();
  openCriterionEditor(c.id);
}

let libraryQuery = '';
let libraryOpenCat = null;

function renderLibrary(){
  const panel = document.getElementById('libraryPanel');
  panel.style.display = 'block';
  const q = libraryQuery.trim().toLowerCase();
  const isSearching = q.length > 0;
  const selectedNames = state.criteria.map(c => c.name);

  const matches = (item) => item.name.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q);

  let catsHtml = '';
  LIBRARY.forEach(cat => {
    const items = isSearching ? cat.items.filter(matches) : cat.items;
    if (isSearching && items.length === 0) return;
    const expanded = isSearching || libraryOpenCat === cat.category;
    catsHtml += `
      <div class="lib-cat">
        <button class="lib-cat-head" data-cat="${escapeHtml(cat.category)}" ${isSearching ? 'disabled' : ''}>
          <span>${escapeHtml(cat.category)}</span>
          <span>${expanded ? '-' : '+'}</span>
        </button>
        ${expanded ? `<div class="lib-cat-items">${items.map(item => {
          const already = selectedNames.includes(item.name);
          return `<button class="lib-chip" data-item="${escapeHtml(item.name)}" data-cat-src="${escapeHtml(cat.category)}" title="${escapeHtml(item.desc)}" ${already ? 'disabled' : ''}>${already ? 'Added ' : 'Add '}${escapeHtml(item.name)}</button>`;
        }).join('')}</div>` : ''}
      </div>
    `;
  });

  panel.innerHTML = `
    <div class="library-panel">
      <input type="text" class="library-search" id="librarySearch" placeholder="Search the library. Try tone, length, jargon" value="${escapeHtml(libraryQuery)}">
      <div class="lib-categories">${catsHtml}</div>
      <button class="btn-text" id="addCustomFromLib">Can't find it? Write your own</button>
    </div>
  `;

  document.getElementById('librarySearch').addEventListener('input', e => { libraryQuery = e.target.value; renderLibrary(); });
  document.getElementById('addCustomFromLib').addEventListener('click', addBlankCriterion);
  panel.querySelectorAll('.lib-cat-head').forEach(btn => {
    btn.addEventListener('click', () => {
      libraryOpenCat = libraryOpenCat === btn.dataset.cat ? null : btn.dataset.cat;
      renderLibrary();
    });
  });
  panel.querySelectorAll('.lib-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = LIBRARY.find(c => c.category === btn.dataset.catSrc);
      const item = cat.items.find(i => i.name === btn.dataset.item);
      addFromLibrary(item);
    });
  });
}

/* ============================================================
   STEP NAV
   ============================================================ */
document.getElementById('back1').addEventListener('click', () => { state.step = 1; updateRailAndProgress(); });
document.getElementById('next2').addEventListener('click', () => {
  state.step = 3;
  document.getElementById('inputText').value = state.inputText;
  updateRailAndProgress();
});
document.getElementById('back2').addEventListener('click', () => { state.step = 2; updateRailAndProgress(); });

/* ============================================================
   STEP 3: input and file
   ============================================================ */
document.getElementById('inputText').addEventListener('input', e => {
  state.inputText = e.target.value;
  state.fileName = '';
  document.getElementById('fileBadge').innerHTML = '';
});

document.getElementById('useExampleBtn').addEventListener('click', () => {
  const text = TASKS[state.taskKey]?.placeholder || '';
  state.inputText = text;
  document.getElementById('inputText').value = text;
});

document.getElementById('fileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('fileError').textContent = '';
  const okTypes = ['.txt', '.md', '.csv'];
  if (!okTypes.some(ext => file.name.toLowerCase().endsWith(ext))){
    document.getElementById('fileError').textContent = 'Only .txt, .md, or .csv files for now. For Word or PDF, open it and paste the text in below.';
    return;
  }
  const reader = new FileReader();
  reader.onload = ev => {
    state.inputText = ev.target.result;
    state.fileName = file.name;
    document.getElementById('inputText').value = state.inputText;
    document.getElementById('fileBadge').innerHTML = `<div class="file-badge">${escapeHtml(file.name)} <button class="icon-btn" id="clearFile">Remove</button></div>`;
    document.getElementById('clearFile').addEventListener('click', () => {
      state.inputText = ''; state.fileName = '';
      document.getElementById('inputText').value = '';
      document.getElementById('fileBadge').innerHTML = '';
    });
  };
  reader.onerror = () => { document.getElementById('fileError').textContent = 'Could not read that file. Try pasting the text instead.'; };
  reader.readAsText(file);
});

/* ============================================================
   RUN
   ============================================================ */
document.getElementById('runBtn').addEventListener('click', runEval);

async function runEval(){
  const errorEl = document.getElementById('step3Error');
  errorEl.textContent = '';

  if (!document.getElementById('apiKey').value.trim()){
    toast('Paste your Anthropic API key at the top first.', true);
    return;
  }
  if (!state.inputText.trim()){
    errorEl.textContent = 'Paste some real text or attach a file first. That is what gets tested.';
    return;
  }
  const activeCriteria = state.criteria.filter(c => c.name.trim());
  if (activeCriteria.length === 0){
    errorEl.textContent = 'Add at least one thing you are checking for on the previous step.';
    return;
  }
  const instruction = effectiveInstruction();
  if (!instruction.trim()){
    errorEl.textContent = 'Tell us what the AI should do with the text on the previous step.';
    return;
  }

  const runBtn = document.getElementById('runBtn');
  runBtn.disabled = true;
  runBtn.textContent = 'Checking...';

  try{
    const checkRaw = await callClaude(
      `Is the following genuine, meaningful content, or is it empty, placeholder text like dddd or asdf or test, or too short to mean anything? Respond only with JSON, no markdown: {"valid": true or false, "reason": "one short plain English sentence"}\n\nText:\n${state.inputText}`
    );
    const check = parseJson(checkRaw);
    if (!check.valid){
      errorEl.textContent = check.reason || 'That does not look like real content yet. Paste the actual text you want tested.';
      runBtn.disabled = false;
      runBtn.textContent = 'Run it';
      return;
    }
  }catch(e){
    if (e.message === 'no_key'){
      toast('Paste your Anthropic API key at the top first.', true);
      runBtn.disabled = false;
      runBtn.textContent = 'Run it';
      return;
    }
    // if the check itself fails for another reason, do not block the user
  }

  state.step = 4;
  updateRailAndProgress();
  document.getElementById('runningState').style.display = 'block';
  document.getElementById('reportState').style.display = 'none';
  document.getElementById('runLabel').textContent = 'Running your instructions on the example...';

  let output = '';
  try{
    output = await callClaude(`${instruction}\n\nText:\n${state.inputText}`);
  }catch(e){
    toast('Could not reach the model to generate a result. Check your key and try again.', true);
    state.step = 3;
    updateRailAndProgress();
    runBtn.disabled = false;
    runBtn.textContent = 'Run it';
    return;
  }

  document.getElementById('runLabel').textContent = 'Grading the result against your checklist...';

  const rubricList = activeCriteria.map(c => `- ${c.name}: ${c.desc || 'no description given'}`).join('\n');
  const judgePrompt = `You are grading an AI's output against a rubric. Be strict and honest, and explain scores in plain, everyday language a non technical person would understand. Avoid jargon.

If the output is not a genuine attempt at the task, for example it is a refusal, an empty response, or a note saying the input made no sense, do not force scores. Instead set gradable to false and explain why in overall_note.

Original instruction given to the AI:
${instruction}

Text it was given:
${state.inputText}

AI's output:
${output}

Rubric:
${rubricList}

If gradable, give each criterion a score from 1 to 5 and one plain English sentence explaining the score, plus a one sentence overall verdict in plain language.

Respond only with valid JSON, no markdown fences, no preamble, in this exact shape:
{"gradable": true, "scores": [{"criterion": "name", "score": 1, "reason": "..."}], "overall_note": "one plain English sentence"}
or
{"gradable": false, "scores": [], "overall_note": "one plain English sentence explaining why this cannot be graded"}`;

  let judge = { gradable: true, scores: [], overall_note: '' };
  try{
    const raw = await callClaude(judgePrompt);
    judge = parseJson(raw);
  }catch(e){
    state.notGradable = "The grading step did not return a readable result. This happens occasionally. Try running again.";
    state.result = { output, judge: { scores: [] } };
    renderReport();
    runBtn.disabled = false;
    runBtn.textContent = 'Run it';
    return;
  }

  if (judge.gradable === false){
    state.notGradable = judge.overall_note || 'This result could not be meaningfully graded.';
    state.result = { output, judge: { scores: [] } };
  } else {
    state.notGradable = null;
    state.result = { output, judge };
  }

  renderReport();
  runBtn.disabled = false;
  runBtn.textContent = 'Run it';
}

/* ============================================================
   REPORT
   ============================================================ */
function renderReport(){
  document.getElementById('runningState').style.display = 'none';
  const el = document.getElementById('reportState');
  el.style.display = 'block';

  if (state.notGradable){
    el.innerHTML = `
      <div class="not-gradable-card">
        <div class="not-gradable-title">Could not grade this one</div>
        <p style="margin:0; font-size:14px;">${escapeHtml(state.notGradable)}</p>
      </div>
      <div class="output-block">
        <span class="output-block-label">What the AI produced</span>
        <div class="output-box">${escapeHtml(state.result.output)}</div>
      </div>
      <button class="btn" id="tryAgainBtn">Try a different example</button>
    `;
    document.getElementById('tryAgainBtn').addEventListener('click', () => {
      state.step = 3; state.result = null; state.notGradable = null;
      document.getElementById('step3Error').textContent = '';
      updateRailAndProgress();
    });
    return;
  }

  const scores = state.result.judge.scores || [];
  const avg = scores.length ? scores.reduce((a, s) => a + s.score, 0) / scores.length : null;

  const scoresHtml = scores.map(s => `
    <div class="score-line">
      <span class="score-num" style="color:${scoreColor(s.score)};">${s.score}/5</span>
      <span><strong>${escapeHtml(s.criterion)}</strong>. ${escapeHtml(s.reason)}</span>
    </div>
  `).join('');

  el.innerHTML = `
    ${avg !== null ? `
      <div class="verdict-card">
        <span class="verdict-title" style="color:${scoreColor(avg)};">${verdictLabel(avg)}</span>
        <span class="verdict-num">${avg.toFixed(1)}/5</span>
        <p class="verdict-note">${escapeHtml(state.result.judge.overall_note || '')}</p>
      </div>
      <p class="bias-note">The same AI that wrote this also graded it, which can bias the score. Treat this as a first pass, not a final verdict.</p>
    ` : ''}
    <div class="output-block">
      <span class="output-block-label">What the AI produced</span>
      <div class="output-box">${escapeHtml(state.result.output)}</div>
    </div>
    <div class="score-grid">${scoresHtml}</div>
    <div class="report-actions">
      <button class="btn" id="tryAgainBtn">Try a different example</button>
      <button class="btn" id="startOverBtn">Start over</button>
    </div>
  `;

  document.getElementById('tryAgainBtn').addEventListener('click', () => {
    state.step = 3; state.result = null;
    updateRailAndProgress();
  });
  document.getElementById('startOverBtn').addEventListener('click', () => {
    state.step = 1; state.result = null;
    updateRailAndProgress();
  });
}

/* ============================================================
   KEY VISIBILITY
   ============================================================ */
document.getElementById('toggleKey').addEventListener('click', () => {
  const input = document.getElementById('apiKey');
  const btn = document.getElementById('toggleKey');
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  btn.textContent = showing ? 'Show' : 'Hide';
});

/* ============================================================
   INIT
   ============================================================ */
renderTaskGrid();
updateRailAndProgress();
