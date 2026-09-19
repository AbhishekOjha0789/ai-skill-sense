async function renderMatrixView(container) {
    container.innerHTML = `
        <div class="space-y-6">
            <div>
                <h2 class="text-xl font-bold text-white tracking-tight">Life Pillars Matrix</h2>
                <p class="text-xs text-slate-400 font-mono">Real-time equilibrium across Technical, Cognitive, Physical, Emotional, Creative, and Financial axes.</p>
            </div>
            <div id="matrix-pillars-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <p class="text-xs text-slate-500 italic">Synchronizing pillar matrices...</p>
            </div>
        </div>
    `;

    try {
        const data = await apiRequest('/users/matrix');
        const grid = document.getElementById('matrix-pillars-grid');
        grid.innerHTML = '';

        Object.keys(data.attributeMatrix).forEach(attr => {
            const m = data.attributeMatrix[attr];
            const skillsHtml = m.skills.map(s => `
                <div onclick="inspectSkill('${s.id}', '${s.name}', '${s.attribute}', '${s.description || 'Verified via autonomous vector telemetry.'}', ${s.verified})" 
                     class="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 hover:border-emerald-500/50 transition cursor-pointer flex justify-between items-center">
                    <div>
                        <h6 class="text-xs font-semibold text-white">${s.name}</h6>
                        <span class="text-[10px] font-mono text-slate-500">${s.verified ? '✓ Verified Vector' : 'Pending'}</span>
                    </div>
                    <span class="text-xs font-mono text-emerald-400">+${s.progress[0]?.xp || 50} XP</span>
                </div>
            `).join('') || `<p class="text-[11px] text-slate-600 italic">No skills registered on this axis yet.</p>`;

            grid.innerHTML += `
                <div class="glow-card border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
                    <div>
                        <div class="flex justify-between items-center mb-4">
                            <span class="font-bold text-white text-sm tracking-wider">${attr}</span>
                            <span class="text-xs font-mono bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-semibold">Lvl ${m.level}</span>
                        </div>
                        <div class="flex justify-between text-xs text-slate-400 font-mono mb-3">
                            <span>Total XP: ${m.totalXp}</span>
                            <span>Skills: ${m.totalSkills}</span>
                        </div>
                        <div class="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800 mb-4">
                            <div class="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full" style="width: ${Math.min((m.totalXp % 150) / 1.5, 100)}%"></div>
                        </div>
                        <div class="space-y-2 max-h-48 overflow-y-auto pr-1">
                            ${skillsHtml}
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error(err);
    }
}

function inspectSkill(id, name, attribute, description, verified) {
    openInspector(
        attribute,
        name,
        `
            <div class="space-y-3">
                <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <span class="block text-[10px] font-mono text-slate-500 uppercase">Vector Description & Evidence</span>
                    <p class="text-xs text-slate-300 mt-1">${description}</p>
                </div>
                <div class="grid grid-cols-2 gap-3 font-mono">
                    <div class="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span class="text-[10px] text-slate-500 uppercase block">Verification Status</span>
                        <span class="text-emerald-400 text-xs">${verified ? 'Semantic Guard Passed' : 'Unverified'}</span>
                    </div>
                    <div class="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span class="text-[10px] text-slate-500 uppercase block">Database Record ID</span>
                        <span class="text-slate-400 text-[10px]">${id.substring(0, 12)}...</span>
                    </div>
                </div>
            </div>
        `,
        `<button onclick="closeInspector()" class="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2 rounded-xl text-xs font-medium">Close Inspector</button>`
    );
}