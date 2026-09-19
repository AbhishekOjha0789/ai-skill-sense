async function renderDashboardView(container) {
    container.innerHTML = `
        <div class="space-y-8">
            <div class="glow-card border border-slate-800 rounded-3xl p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <span class="text-xs font-mono uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">Daemon Supervisor: Active</span>
                    <h1 id="dash-welcome" class="text-3xl font-bold text-white tracking-tight mt-3">Autonomous Command Hub</h1>
                    <p class="text-xs text-slate-400 mt-1 font-mono">Real-time passive ingestion and background optimization online.</p>
                </div>
                <div class="flex gap-4">
                    <div class="bg-slate-950 border border-slate-800 px-6 py-4 rounded-2xl text-center">
                        <span class="block text-[10px] font-mono uppercase tracking-widest text-slate-500">Global XP</span>
                        <span id="dash-xp" class="text-2xl font-black text-emerald-400 mt-0.5 block">0</span>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Live Daemon Telemetry Stream -->
                <div class="glow-card border border-slate-800 rounded-3xl p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-sm font-bold text-white uppercase tracking-wider">Live System Telemetry</h3>
                        <span class="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                    </div>
                    <div class="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-[11px] text-slate-400 space-y-2 h-64 overflow-y-auto">
                        <p class="text-emerald-400">[02:00:00] External cron ping received. Render instance online.</p>
                        <p>[02:00:01] Daemon controller verified X-Daemon-Secret header signature.</p>
                        <p>[02:00:01] Pillar balance equilibrium evaluated across 6 core axes.</p>
                        <p class="text-cyan-400">[02:00:02] Webhook listener armed: GitHub, Fitness, Productivity endpoints active.</p>
                        <p class="text-slate-500">[System] Awaiting incoming passive ingestion payloads...</p>
                    </div>
                </div>

                <!-- Active Quests Quick Summary -->
                <div class="glow-card border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
                    <div>
                        <h3 class="text-sm font-bold text-white uppercase tracking-wider mb-2">Autonomous Growth Quests</h3>
                        <p class="text-xs text-slate-400 mb-4">Quests are automatically minted by the AI when pillar stagnation or curriculum gaps are detected.</p>
                    </div>
                    <div id="dash-quick-quests" class="space-y-3">
                        <p class="text-xs text-slate-500 italic">Loading active assignments...</p>
                    </div>
                    <button onclick="switchView('quests')" class="mt-4 w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-emerald-400 py-3 rounded-xl transition font-medium">Access Full Quests Hub →</button>
                </div>
            </div>
        </div>
    `;

    try {
        const data = await apiRequest('/users/matrix');
        document.getElementById('dash-welcome').innerText = `Welcome back, ${data.user.name}`;
        document.getElementById('dash-xp').innerText = data.user.overallXp || 0;

        const quickQuests = document.getElementById('dash-quick-quests');
        const pending = data.quests.filter(q => q.status === 'PENDING').slice(0, 2);
        
        if (pending.length === 0) {
            quickQuests.innerHTML = `<p class="text-xs text-slate-500 italic">No pending autonomous quests.</p>`;
        } else {
            quickQuests.innerHTML = pending.map(uq => `
                <div class="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex justify-between items-center">
                    <div>
                        <span class="text-[10px] font-mono text-emerald-400">${uq.quest.attribute}</span>
                        <h5 class="text-xs font-semibold text-white">${uq.quest.title}</h5>
                    </div>
                    <button onclick="switchView('quests')" class="text-[10px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg">Inspect</button>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error(err);
    }
}