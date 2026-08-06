const AGENT_CONFIG = [
  {
    id: 'math',
    label: 'Math Teacher',
    specialty: 'Numbers & formulas',
    color: 'math',
    defaultOn: true,
    role: 'Breaks problems into steps and explains the math clearly.',
    buildPrompt: (userInput, context) => `You are the Math Teacher. Provide a friendly, step-by-step explanation using numbers, equations, and simple reasoning. Use the user's question and any prior agent context: ${context}. User: ${userInput}`
  },
  {
    id: 'science',
    label: 'Science Teacher',
    specialty: 'Experiments & evidence',
    color: 'science',
    defaultOn: true,
    role: 'Connects concepts to experiments and real-world observations.',
    buildPrompt: (userInput, context) => `You are the Science Teacher. Explain the concept with experiments, evidence, cause-and-effect, and clear examples. Use the user's question and any prior agent context: ${context}. User: ${userInput}`
  },
  {
    id: 'history',
    label: 'History Teacher',
    specialty: 'People & events',
    color: 'history',
    defaultOn: true,
    role: 'Links events to cause, consequence, and historical context.',
    buildPrompt: (userInput, context) => `You are the History Teacher. Explain the topic with important events, context, people, and consequences. Use the user's question and any prior agent context: ${context}. User: ${userInput}`
  }
];

const API_ENDPOINT = 'https://vibe-proxy-gqv4.onrender.com/v1/chat/completions';
const API_HEADERS = {
  'Content-Type': 'application/json',
  Authorization: 'Bearer sk-vibe-summer-2026'
};

const agentListEl = document.getElementById('agentList');
const resultsEl = document.getElementById('results');
const workflowTraceEl = document.getElementById('workflowTrace');
const runAgentsBtn = document.getElementById('runAgentsBtn');
const userInput = document.getElementById('userInput');

const agents = AGENT_CONFIG.map((agent) => ({
  ...agent,
  enabled: agent.defaultOn,
  async run(userMessage, context) {
    const prompt = agent.buildPrompt(userMessage, context);

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({
        model: 'class-chat-model',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`Request failed for ${agent.label}: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 'No response returned.';
    return content.trim();
  }
}));

function renderAgentControls() {
  agentListEl.innerHTML = agents
    .map(
      (agent) => `
        <button class="agent-toggle ${agent.enabled ? 'active' : ''}" data-color="${agent.color}" data-agent-id="${agent.id}" type="button" aria-pressed="${agent.enabled}">
          <span class="agent-meta">
            <span class="agent-dot"></span>
            <span>
              <span class="agent-label">${agent.label}</span>
              <span class="agent-role">${agent.specialty}</span>
            </span>
          </span>
          <span class="switch" aria-hidden="true"></span>
        </button>
      `
    )
    .join('');

  agentListEl.querySelectorAll('.agent-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const agentId = button.dataset.agentId;
      const selectedAgent = agents.find((agent) => agent.id === agentId);
      if (!selectedAgent) return;

      selectedAgent.enabled = !selectedAgent.enabled;
      renderAgentControls();
    });
  });
}

function renderTrace(entries) {
  if (!entries.length) {
    workflowTraceEl.innerHTML = '<div class="empty-state">No orchestration steps yet.</div>';
    return;
  }

  workflowTraceEl.innerHTML = entries
    .map((entry) => `
      <div class="trace-step">
        ${entry}
      </div>
    `)
    .join('');
}

function renderResults(cards) {
  if (!cards.length) {
    resultsEl.innerHTML = '<div class="empty-state">Choose your agents and hit Run Agents.</div>';
    return;
  }

  resultsEl.innerHTML = cards
    .map(
      (card) => `
        <article class="result-card">
          <h3>${card.label}</h3>
          <p>${card.content.replace(/\n/g, '<br>')}</p>
        </article>
      `
    )
    .join('');
}

async function runOrchestrator() {
  const userMessage = userInput.value.trim();

  if (!userMessage) {
    resultsEl.innerHTML = '<div class="empty-state">Please enter a question first.</div>';
    workflowTraceEl.innerHTML = '<div class="empty-state">The orchestrator is waiting for your prompt.</div>';
    return;
  }

  const activeAgents = agents.filter((agent) => agent.enabled);

  if (!activeAgents.length) {
    resultsEl.innerHTML = '<div class="empty-state">Turn on at least one agent before running the workflow.</div>';
    workflowTraceEl.innerHTML = '<div class="empty-state">No active agents selected.</div>';
    return;
  }

  runAgentsBtn.disabled = true;
  resultsEl.innerHTML = '<div class="empty-state">Running the tutor team...</div>';

  const trace = [`Started orchestrator for: "${userMessage.slice(0, 80)}${userMessage.length > 80 ? '...' : ''}"`];
  const outputCards = [];
  let combinedContext = `User: ${userMessage}`;

  renderTrace(trace);

  try {
    for (const agent of activeAgents) {
      trace.push(`Delegating task to ${agent.label}`);
      renderTrace(trace);

      const response = await agent.run(userMessage, combinedContext);

      outputCards.push({ label: agent.label, content: response });
      combinedContext += `\n\n${agent.label}: ${response}`;

      trace.push(`${agent.label} responded and passed context to the next step.`);
      renderTrace(trace);
    }

    trace.push('Workflow complete. Final output assembled in the center panel.');
    renderTrace(trace);
    renderResults(outputCards);
  } catch (error) {
    trace.push(`Error: ${error.message}`);
    renderTrace(trace);
    resultsEl.innerHTML = `
      <div class="result-card">
        <h3>Agent Error</h3>
        <p>${error.message}</p>
      </div>
    `;
  } finally {
    runAgentsBtn.disabled = false;
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}

renderAgentControls();
renderTrace([]);
renderResults([]);
runAgentsBtn.addEventListener('click', runOrchestrator);
