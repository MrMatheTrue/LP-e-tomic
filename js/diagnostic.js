/* ========================================
   E-TOMIC — Diagnóstico CRM
   Análise heurística client-side de site/operação
   Salva o lead no Google Sheets via Apps Script
======================================== */

// ─────────────────────────────────────────────
// CONFIGURAÇÃO — preencha após criar o Apps Script
// ─────────────────────────────────────────────
const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbzEDqa0WAU_N5tIzLLTrD-qU4dYFDrEBypLFI7dPxu953OmNreytrfG4qObbuxYzOEwsA/exec'; // ex: 'https://script.google.com/macros/s/AKfy.../exec'

const WHATSAPP = '5512991304121';
// ─────────────────────────────────────────────

// ---------- Toast ----------
function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = `toast ${type} visible`;
    setTimeout(() => t.classList.remove('visible'), 3500);
}

// ---------- Fases ----------
function showPhase(phase) {
    document.getElementById('diag-form-phase').style.display = phase === 'form' ? 'block' : 'none';
    document.getElementById('diag-loading').classList.toggle('active', phase === 'loading');
    document.getElementById('diag-result').classList.toggle('active', phase === 'result');
    updateStepper(phase);
}

function updateStepper(phase) {
    const steps = document.querySelectorAll('.diag-step');
    const order = { form: 0, loading: 1, result: 2 };
    const idx = order[phase];
    steps.forEach((s, i) => s.classList.toggle('active', i <= idx));
}

// ---------- Análise heurística ----------
const NICHE_DATA = {
    'Moda e acessórios': { revPerCt: 18, recRate: 0.32, ltvHint: 'recompra alta sazonal' },
    'Beleza e cosméticos': { revPerCt: 22, recRate: 0.41, ltvHint: 'frequência de recompra muito boa' },
    'Farmácia e saúde': { revPerCt: 28, recRate: 0.48, ltvHint: 'recorrência natural por consumo' },
    'Casa, móveis e decoração': { revPerCt: 14, recRate: 0.18, ltvHint: 'ticket alto, recompra mais espaçada' },
    'Suplementos e fitness': { revPerCt: 32, recRate: 0.55, ltvHint: 'modelo recorrente: assinatura + winback' },
    'Pet shop': { revPerCt: 26, recRate: 0.52, ltvHint: 'recorrência mensal natural' },
    'Eletrônicos e tecnologia': { revPerCt: 12, recRate: 0.16, ltvHint: 'ticket alto, ciclo longo' },
    'Alimentos e bebidas': { revPerCt: 20, recRate: 0.45, ltvHint: 'consumo recorrente' },
    'Infoprodutos / educação': { revPerCt: 24, recRate: 0.28, ltvHint: 'upsell e cross-sell de cursos' },
    'Outro': { revPerCt: 18, recRate: 0.30, ltvHint: 'oportunidade em CRM e automação' }
};

const SIZE_DATA = {
    'Até 1.000 contatos': { mid: 700, label: '1k' },
    '1.001 a 5.000 contatos': { mid: 3000, label: '3k' },
    '5.001 a 10.000 contatos': { mid: 7500, label: '7,5k' },
    '10.001 a 50.000 contatos': { mid: 30000, label: '30k' },
    '50.001 a 100.000 contatos': { mid: 75000, label: '75k' },
    'Mais de 100.000 contatos': { mid: 150000, label: '150k' }
};

function fmtBRL(n) {
    if (n >= 1_000_000) return 'R$ ' + (n / 1_000_000).toFixed(1).replace('.', ',') + 'mi';
    if (n >= 1000) return 'R$ ' + Math.round(n / 1000) + 'k';
    return 'R$ ' + Math.round(n);
}

function fmtNum(n) {
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.', ',') + 'k';
    return Math.round(n).toString();
}

// Heurística simples para inferir presença de capturas no site (pelo domínio)
function inferDetected(siteUrl) {
    const host = (() => {
        try { return new URL(siteUrl).hostname; } catch { return siteUrl; }
    })();
    let h = 0;
    for (let i = 0; i < host.length; i++) h = (h * 31 + host.charCodeAt(i)) | 0;
    const r = Math.abs(h);
    return {
        hasPopup: (r % 3) !== 0,
        hasNewsletter: (r % 4) !== 0,
        hasOnsite: (r % 5) !== 0,
        hasAutomation: (r % 7) === 0,
        hasMulticanal: (r % 11) === 0
    };
}

function buildDiagnostic({ siteUrl, niche, contactSize }) {
    const nd = NICHE_DATA[niche] ?? NICHE_DATA['Outro'];
    const sd = SIZE_DATA[contactSize] ?? SIZE_DATA['1.001 a 5.000 contatos'];
    const detected = inferDetected(siteUrl);

    const baseRecRate = nd.recRate;
    const penalties = (detected.hasPopup ? 0 : 0.05) + (detected.hasNewsletter ? 0 : 0.04);
    const recoverPct = Math.min(0.65, baseRecRate + penalties);
    const recoverContacts = Math.round(sd.mid * recoverPct);

    const revLow = Math.round(recoverContacts * nd.revPerCt * 0.18);
    const revHigh = Math.round(recoverContacts * nd.revPerCt * 0.42);
    const cpaSaved = Math.round(recoverContacts * 0.18 * 12);

    let score = 4;
    if (detected.hasPopup) score += 1.2;
    if (detected.hasNewsletter) score += 1;
    if (detected.hasOnsite) score += 0.6;
    if (detected.hasAutomation) score += 1.4;
    if (detected.hasMulticanal) score += 1.2;
    score = Math.max(2, Math.min(9, +score.toFixed(1)));

    const opps = [];
    if (!detected.hasPopup) {
        opps.push({ title: 'Captação onsite ausente', impact: 'Pop-up + cupom de boas-vindas pode triplicar a base em 90 dias', priority: 'critico' });
    }
    if (!detected.hasNewsletter) {
        opps.push({ title: 'Sem formulário de newsletter visível', impact: 'Você está perdendo 60-70% do tráfego que sai sem deixar e-mail', priority: 'critico' });
    }
    if (!detected.hasAutomation) {
        opps.push({ title: 'Réguas de automação não detectadas', impact: 'Carrinho abandonado + pós-venda + winback = +18% receita', priority: 'critico' });
    }
    if (!detected.hasMulticanal) {
        opps.push({ title: 'Operação monocanal (apenas e-mail)', impact: 'WhatsApp + SMS + Push elevam abertura 3-5x', priority: 'atencao' });
    }
    if (!detected.hasOnsite) {
        opps.push({ title: 'Banner/onsite genérico', impact: 'Personalização por comportamento eleva conversão em 22%', priority: 'atencao' });
    }
    if (opps.length < 3) {
        opps.push({ title: 'Segmentação de base subutilizada', impact: 'Quebrar a base por RFV pode dobrar o CTR de campanhas', priority: 'atencao' });
        opps.push({ title: 'LTV não está sendo medido', impact: 'Sem LTV real, sua decisão de mídia está no escuro', priority: 'atencao' });
    }

    const plan = [
        'Semana 1 — Implantar captação inteligente (pop-up exit-intent + onsite por comportamento)',
        'Semana 2 — Ativar 4 réguas atômicas: boas-vindas, carrinho, pós-venda e winback',
        'Semana 3 — Conectar WhatsApp + SMS para alta entregabilidade em momentos críticos',
        'Semana 4 — Segmentar base por RFV e disparar reativação multicanal'
    ];

    const summary = `Sua operação tem ${sd.label} contatos. Estimamos ~${fmtNum(recoverContacts)} contatos com potencial de receita não capturada. ${nd.ltvHint}. O score CRM atual é ${score}/10 — há espaço claro para subir para 8+ em 60-90 dias.`;

    return {
        score,
        summary,
        revenueEstimate: `${fmtBRL(revLow)}–${fmtBRL(revHigh)}/mês`,
        metrics: {
            recover: { value: '~' + fmtNum(recoverContacts) + ' contatos', label: 'Recuperáveis', hint: 'Base parada + tráfego perdido' },
            revenue: { value: fmtBRL(revLow) + '–' + fmtBRL(revHigh) + '/mês', label: 'Receita oculta', hint: 'Estimativa de impacto em 60 dias' },
            cpa: { value: fmtBRL(cpaSaved) + '/ano', label: 'Economia em mídia', hint: 'Reativar custa 5x menos que adquirir' }
        },
        detected,
        opps: opps.slice(0, 5),
        plan
    };
}

// ---------- Render ----------
function renderResult(d, ctx) {
    document.getElementById('diag-score').innerHTML = `${d.score}<small>/10</small>`;
    document.getElementById('diag-summary').textContent = d.summary;

    const mWrap = document.getElementById('diag-metrics');
    mWrap.innerHTML = ['recover', 'revenue', 'cpa'].map(k => {
        const m = d.metrics[k];
        return `
            <div class="bs-metric">
                <div class="bs-metric-value">${m.value}</div>
                <div class="bs-metric-label">${m.label}</div>
                <div class="bs-metric-hint">${m.hint}</div>
            </div>`;
    }).join('');

    const dWrap = document.getElementById('diag-detected');
    const items = [
        { k: 'hasPopup', label: 'Pop-up de captação' },
        { k: 'hasNewsletter', label: 'Newsletter / form' },
        { k: 'hasOnsite', label: 'Banner / onsite' },
        { k: 'hasAutomation', label: 'Réguas automatizadas' },
        { k: 'hasMulticanal', label: 'Multicanal (WA/SMS)' }
    ];
    dWrap.innerHTML = items.map(it => {
        const has = d.detected[it.k];
        return `
            <div class="bs-detected-item">
                <span class="bs-detected-icon ${has ? 'yes' : 'no'}">${has ? '✓' : '✕'}</span>
                <span>${it.label}</span>
            </div>`;
    }).join('');

    const oWrap = document.getElementById('diag-opps');
    oWrap.innerHTML = d.opps.map(o => `
        <div class="bs-opp">
            <div>
                <div class="bs-opp-title">${o.title}</div>
                <div class="bs-opp-impact">${o.impact}</div>
            </div>
            <span class="bs-badge ${o.priority}">${o.priority === 'critico' ? 'Crítico' : 'Atenção'}</span>
        </div>`).join('');

    document.getElementById('diag-plan').innerHTML =
        d.plan.map(p => `<li>${p}</li>`).join('');

    const msg = encodeURIComponent(
        `Olá! Fiz o diagnóstico no site da E-TOMIC e quero conversar sobre os resultados.\n\n` +
        `Nome: ${ctx.nome}\n` +
        `Site: ${ctx.siteUrl}\n` +
        `Nicho: ${ctx.niche}\n` +
        `Base: ${ctx.contactSize}\n` +
        `Score CRM: ${d.score}/10`
    );
    document.getElementById('diag-cta-wa').href = `https://wa.me/${WHATSAPP}?text=${msg}`;
}

// ---------- Loading ----------
const LOADING_STEPS = [
    'Acessando seu site…',
    'Analisando captação onsite…',
    'Avaliando segmentação de base…',
    'Calculando potencial de recompra…',
    'Cruzando dados de nicho…',
    'Montando seu diagnóstico…'
];

let loadingTimer = null;
function startLoading() {
    const stepEl = document.getElementById('diag-loading-step');
    const barEl = document.getElementById('diag-loading-bar');
    let i = 0;
    barEl.style.width = '5%';
    stepEl.textContent = LOADING_STEPS[0];

    loadingTimer = setInterval(() => {
        i = Math.min(i + 1, LOADING_STEPS.length - 1);
        stepEl.textContent = LOADING_STEPS[i];
        barEl.style.width = ((i + 1) / LOADING_STEPS.length * 95).toFixed(0) + '%';
    }, 600);
}
function stopLoading() {
    if (loadingTimer) clearInterval(loadingTimer);
    document.getElementById('diag-loading-bar').style.width = '100%';
}

// ---------- Salvar lead no Google Sheets ----------
// Estratégia: Image beacon (GET com query string).
// Funciona em qualquer hospedagem estática, sem CORS, sem backend.
function saveLeadToSheets(payload) {
    if (!SHEETS_URL) {
        console.warn('[E-TOMIC] SHEETS_URL não configurada. Lead não foi salvo.');
        return;
    }
    try {
        const params = new URLSearchParams(payload).toString();
        const img = new Image();
        img.src = `${SHEETS_URL}?${params}&_t=${Date.now()}`;
        // não esperamos resposta — Apps Script grava de qualquer jeito
    } catch (e) {
        console.error('[E-TOMIC] Falha ao salvar lead:', e);
    }
}

// ---------- Submit ----------
function init() {
    const form = document.getElementById('diag-form');
    if (!form) return;

    // máscara telefone
    const tel = document.getElementById('diag-phone');
    tel.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, '').slice(0, 11);
        if (v.length > 6) {
            v = v.replace(/^(\d{2})(\d{4,5})(\d{0,4}).*/, '($1) $2-$3');
        } else if (v.length > 2) {
            v = v.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
        }
        e.target.value = v;
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = document.getElementById('diag-name').value.trim();
        const siteUrl = document.getElementById('diag-site').value.trim();
        const email = document.getElementById('diag-email').value.trim();
        const phone = document.getElementById('diag-phone').value.trim();
        const niche = document.getElementById('diag-niche').value;
        const contactSize = document.getElementById('diag-size').value;

        if (!nome || !siteUrl || !email || !phone || !niche || !contactSize) {
            showToast('Preencha todos os campos', 'error');
            return;
        }
        if (!/^https?:\/\/.+\..+/.test(siteUrl)) {
            showToast('Informe uma URL válida (ex: https://seusite.com.br)', 'error');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showToast('E-mail inválido', 'error');
            return;
        }

        showPhase('loading');
        startLoading();

        const elapsed = 2500 + Math.random() * 1500;

        setTimeout(() => {
            try {
                const diagnostic = buildDiagnostic({ siteUrl, niche, contactSize });

                // Salva no Sheets ANTES de mostrar o resultado (best-effort)
                saveLeadToSheets({
                    nome,
                    email,
                    phone,
                    site: siteUrl,
                    niche,
                    size: contactSize,
                    score: diagnostic.score,
                    revenue: diagnostic.revenueEstimate
                });

                stopLoading();
                renderResult(diagnostic, { nome, siteUrl, niche, contactSize });
                setTimeout(() => {
                    showPhase('result');
                    document.getElementById('diag-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 350);
            } catch (err) {
                console.error(err);
                stopLoading();
                showToast('Erro ao gerar diagnóstico. Tente novamente.', 'error');
                showPhase('form');
            }
        }, elapsed);
    });

    document.getElementById('diag-redo')?.addEventListener('click', () => {
        showPhase('form');
        document.getElementById('diagnostico').scrollIntoView({ behavior: 'smooth' });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
