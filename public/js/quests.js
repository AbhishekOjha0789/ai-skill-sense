async function renderQuestsView(container) {
    container.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h2 class="text-xl font-bold text-white tracking-tight">Autonomous Quests Hub</h2>
                    <p class="text-xs text-slate-400 font-mono">AI-architected growth challenges mapped to your professional and academic trajectory.</p>
                </div>
                <button onclick="triggerQuestGeneration()" class="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 px-4 py-2.5 rounded-xl transition font-medium">+ Request AI Quest Architect</button>
            </div>
            <div id="quests-hub-list" class="space-y-4">
                <p class="text-xs text-slate-500 italic">Querying quest database...</p>
            </div>
        </div>
    `;

    try {
        const data = await apiRequest('/users/matrix');
        const list = document.getElementById('quests-hub-list');
        list.innerHTML = '';

        if (!data.quests || data.quests.length === 0) {
            list.innerHTML = `<div class="glow-card border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-500 italic">No quests assigned. Use the AI Architect button to generate your next growth vector.</div>`;
            return;
        }

        data.quests.forEach(uq => {
            list.innerHTML += `
                <div class="glow-card border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div class="space-y-1">
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-mono bg-slate-900 border border-slate-800 text-emerald-400 px-2.5 py-0.5 rounded-md">${uq.quest.attribute}</span>
                            <h4 class="font-bold text-white text-sm">${uq.quest.title}</h4>
                        </div>
                        <p class="text-xs text-slate-400">${uq.quest.description}</p>
                    </div>
                    ${uq.status === 'PENDING' ? `
                        <button onclick="openQuestProofModal('${uq.id}', '${uq.quest.title}', '${uq.quest.description}')" class="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl transition whitespace-nowrap shadow-lg shadow-emerald-950">Complete with Proof</button>
                    ` : `
                        <span class="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-xl">VERIFIED & COMPLETED</span>
                    `}
                </div>
            `;
        });
    } catch (err) {
        console.error(err);
    }
}

async function triggerQuestGeneration() {
    try {
        const attributes = ['TECHNICAL', 'COGNITIVE', 'PHYSICAL', 'EMOTIONAL', 'CREATIVE', 'FINANCIAL'];
        const randomAttr = attributes[Math.floor(Math.random() * attributes.length)];
        
        await apiRequest('/quests/generate', {
            method: 'POST',
            body: JSON.stringify({ attribute: randomAttr })
        });
        alert('AI Quest Architect successfully minted a new growth vector.');
        switchView('quests');
    } catch (err) {
        alert(err.message);
    }
}

function openQuestProofModal(userQuestId, title, description) {
    openInspector(
        'PROOF OF WORK VALIDATION',
        title,
        `
            <div class="space-y-4">
                <p class="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">${description}</p>
                <div>
                    <label class="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">Evidence Payload / PR Link / Notes</label>
                    <textarea id="proof-input-text" rows="4" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:outline-none focus:border-emerald-500 text-white" placeholder="Provide technical logs, PR commits, or reflection notes..."></textarea>
                </div>
            </div>
        `,
        `<button onclick="submitProof('${userQuestId}')" class="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-emerald-950">Verify & Claim XP</button>`
    );
}

async function submitProof(userQuestId) {
    const proofText = document.getElementById('proof-input-text').value;
    if (!proofText || proofText.trim().length < 5) {
        alert('Please provide valid evidence notes.');
        return;
    }

    try {
        const data = await apiRequest('/quests/complete', {
            method: 'POST',
            body: JSON.stringify({ userQuestId, proofText })
        });
        alert(data.message);
        closeInspector();
        switchView('quests');
    } catch (err) {
        alert(err.message);
    }
}