async function renderTelemetryView(container) {
    container.innerHTML = `
        <div class="space-y-6">
            <div class="glow-card border border-slate-800 rounded-3xl p-8 space-y-6">
                <div>
                    <h2 class="text-xl font-bold text-white tracking-tight">Passive Telemetry & Webhook Bridge</h2>
                    <p class="text-xs text-slate-400 mt-1 font-mono">Connect GitHub repositories, fitness APIs, and automation scripts to pipe telemetry directly into your AI agent.</p>
                </div>
                <div>
                    <label class="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Secure GitHub Webhook URL</label>
                    <div class="flex gap-3">
                        <input type="text" id="telemetry-url-input" readonly class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 font-mono text-xs text-emerald-400 select-all" value="Fetching secure endpoint...">
                        <button onclick="loadWebhookBridge()" class="bg-slate-800 hover:bg-slate-700 text-white px-5 py-3 rounded-xl text-xs font-medium transition">Regenerate</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    loadWebhookBridge();
}

async function loadWebhookBridge() {
    try {
        const data = await apiRequest('/users/webhook-bridge');
        document.getElementById('telemetry-url-input').value = data.webhookUrl;
    } catch (err) {
        console.error(err);
    }
}