// CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = 'https://utwzipqbsbcmbjrqjbgr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bZ3T3dYSax4f3aUTouwn0g_0DM3by21';
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// VARIÁVEIS DE CONTROLE DE SESSÃO
let localidadeAtual = '';
let turmaAtual = '';
let alunosData = [];
let realtimeChannel = null;

// CONTROLE DE NAVEGAÇÃO ENTRE TELAS
function selecionarLocalidade(local) {
    localidadeAtual = local;
    document.getElementById('subtituloLocalidade').innerText = `Local: ${local}`;
    document.getElementById('localidadeScreen').style.display = 'none';
    document.getElementById('turmaScreen').style.display = 'flex';
}

function voltarParaLocalidades() {
    document.getElementById('turmaScreen').style.display = 'none';
    document.getElementById('localidadeScreen').style.display = 'flex';
}

function selecionarTurma(turma) {
    turmaAtual = turma;
    document.getElementById('turmaScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    
    document.getElementById('localidadeBadgeDisplay').innerText = `Local: ${localidadeAtual}`;
    document.getElementById('turmaBadgeDisplay').innerText = `Turma: ${turmaAtual}`;
    
    atualizarOpcoesDeFaixa();
    carregarDadosDaTurma();
    atualizarDataHeader();
    iniciarTempoReal();
}

function voltarParaHome() {
    if (realtimeChannel) {
        _supabase.removeChannel(realtimeChannel);
    }
    localidadeAtual = '';
    turmaAtual = '';
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('turmaScreen').style.display = 'none';
    document.getElementById('localidadeScreen').style.display = 'flex';
}

// REGRAS DE FAIXAS POR IDADE/TURMA
function obterFaixasPermitidasPorTurma(turma) {
    if (turma === 'Kids') {
        return [
            'Faixa Branca',
            'Cinza e Branca',
            'Cinza',
            'Cinza e Preta',
            'Amarela e Branca',
            'Amarela',
            'Amarela e Preta',
            'Laranja e Branca',
            'Laranja',
            'Laranja e Preta',
            'Verde e Branca',
            'Verde',
            'Verde e Preta'
        ];
    } else if (turma === 'Juvenil') {
        return [
            'Faixa Branca',
            'Amarela e Branca',
            'Amarela',
            'Amarela e Preta',
            'Laranja e Branca',
            'Laranja',
            'Laranja e Preta',
            'Verde e Branca',
            'Verde',
            'Verde e Preta'
        ];
    } else {
        return [
            'Faixa Branca',
            'Faixa Azul',
            'Faixa Roxa',
            'Faixa Marrom',
            'Faixa Preta'
        ];
    }
}

function atualizarOpcoesDeFaixa() {
    const selectFaixa = document.getElementById('faixaInput');
    if (!selectFaixa) return;
    
    const faixas = obterFaixasPermitidasPorTurma(turmaAtual);
    selectFaixa.innerHTML = '';
    
    faixas.forEach(faixa => {
        const option = document.createElement('option');
        option.value = faixa;
        option.textContent = faixa;
        selectFaixa.appendChild(option);
    });

    const filtroFaixa = document.getElementById('filtroFaixaSelect');
    if (filtroFaixa) {
        filtroFaixa.innerHTML = '<option value="">Todas as Faixas</option>';
        faixas.forEach(faixa => {
            const option = document.createElement('option');
            option.value = faixa;
            option.textContent = faixa;
            filtroFaixa.appendChild(option);
        });
    }
}

// CONTROLE DE ABAS DO PAINEL PRINCIPAL
function switchTab(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.menu button').forEach(el => {
        if(!el.classList.contains('baymax-icon-btn') && !el.closest('.baymax-icon-btn')) {
            el.classList.remove('active');
        }
    });
    
    document.getElementById(tabId).classList.add('active');
    if(btnElement && !btnElement.classList.contains('baymax-icon-btn')) {
        btnElement.classList.add('active');
    }
    
    const titles = {
        'scanner': 'Check Diário de Presença',
        'cadastro': document.getElementById('editIndexId').value ? 'Editar Aluno' : 'Cadastro de Alunos',
        'relatorio': 'Relatório & Graduação'
    };
    document.getElementById('pageTitle').innerText = titles[tabId] || 'Painel BTT';
}

function atualizarDataHeader() {
    const hoje = new Date();
    const opcoes = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const labelData = document.getElementById('currentDateLabel');
    if (labelData) {
        labelData.innerText = `Data: ${hoje.toLocaleDateString('pt-BR', opcoes)}`;
    }
}

// CARREGAR DADOS DO SUPABASE
async function carregarDadosDaTurma() {
    try {
        const { data, error } = await _supabase
            .from('alunos')
            .select('*')
            .eq('localidade', localidadeAtual)
            .eq('turma', turmaAtual);

        if (error) throw error;
        
        alunosData = data || [];
        renderizarTabelas();
    } catch (error) {
        console.error('Erro ao carregar dados:', error.message);
    }
}

// SINCRONIZAÇÃO EM TEMPO REAL ENTRE OS APARELHOS
function iniciarTempoReal() {
    if (realtimeChannel) {
        _supabase.removeChannel(realtimeChannel);
    }

    realtimeChannel = _supabase
        .channel('public:alunos')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'alunos' }, payload => {
            carregarDadosDaTurma();
        })
        .subscribe();
}

// ASSISTENTE BAYMAX INTERATIVO COM TIMEOUT DE 3 SEGUNDOS
function acionarBaymax() {
    const bubble = document.getElementById('baymaxChatBubble');
    const msgText = document.getElementById('baymaxMessageText');
    const actions = document.getElementById('baymaxActions');

    if (!bubble) return;

    if (window.baymaxTimeout) {
        clearTimeout(window.baymaxTimeout);
    }

    const quaseProntos = alunosData.filter(a => a.dias_acumulados === 119);
    const aptos = alunosData.filter(a => a.dias_acumulados >= 120);

    let mensagem = "";
    let temAlunos = false;

    if (aptos.length > 0) {
        const nomesAptos = aptos.map(a => `${a.nome} (${a.dias_acumulados}d)`).join(', ');
        mensagem += `🔥 <b>Prontos (≥120d):</b> ${nomesAptos}.<br>`;
        temAlunos = true;
    }

    if (quaseProntos.length > 0) {
        const nomesQuase = quaseProntos.map(a => a.nome).join(', ');
        mensagem += `⚠️ <b>Faltando 1 dia (119d):</b> ${nomesQuase}.<br>`;
        temAlunos = true;
    }

    if (temAlunos) {
        mensagem += `<br>Deseja filtrar a lista para ver estes alunos?`;
        actions.style.display = 'flex';
    } else {
        mensagem += `Nenhum aluno está próximo ou apto para graduação no momento.`;
        actions.style.display = 'none';
        
        window.baymaxTimeout = setTimeout(() => {
            bubble.style.display = 'none';
        }, 3000);
    }

    msgText.innerHTML = mensagem;
    bubble.style.display = 'block';
}

function baymaxResponder(queroFiltrar) {
    const bubble = document.getElementById('baymaxChatBubble');
    if (queroFiltrar) {
        const btnScanner = document.querySelector('.menu button');
        switchTab('scanner', btnScanner);
        
        const filtroStatus = document.getElementById('filtroStatusSelect');
        if (filtroStatus) {
            filtroStatus.value = 'proximos_aptos';
            renderizarTabelas();
        }
    }
    if (bubble) {
        bubble.style.display = 'none';
    }
}

// EFEITO SONORO NATIVO
function tocarSomSucesso() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); 
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08); 

        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
        console.log('Áudio não suportado ou bloqueado automaticamente.');
    }
}

// CADASTRO E EDIÇÃO DE ALUNOS
async function salvarAlunoForm(event) {
    event.preventDefault();
    const idEdicao = document.getElementById('editIndexId').value;
    const nome = document.getElementById('nomeInput').value.trim();
    const faixa = document.getElementById('faixaInput').value;
    const graus = parseInt(document.getElementById('grauInput').value) || 0;
    const diasAcumulados = parseInt(document.getElementById('diasInput').value) || 0;
    
    if (!nome) return;

    if (idEdicao) {
        const { error } = await _supabase
            .from('alunos')
            .update({ nome, faixa, graus, dias_acumulados: diasAcumulados })
            .eq('id', idEdicao);

        if (!error) alert('Dados do aluno atualizados com sucesso!');
    } else {
        const { error } = await _supabase
            .from('alunos')
            .insert([{
                localidade: localidadeAtual,
                turma: turmaAtual,
                nome: nome,
                faixa: faixa,
                graus: graus,
                dias_acumulados: diasAcumulados,
                presenca_hoje: false
            }]);

        if (!error) alert('Aluno cadastrado com sucesso!');
    }

    cancelarEdicao();
    switchTab('scanner', document.querySelector('.menu button'));
    carregarDadosDaTurma();
}

function prepararEdicao(id) {
    const aluno = alunosData.find(a => a.id === id);
    if (!aluno) return;

    document.getElementById('editIndexId').value = aluno.id;
    document.getElementById('nomeInput').value = aluno.nome;
    document.getElementById('faixaInput').value = aluno.faixa;
    document.getElementById('grauInput').value = aluno.graus !== undefined ? aluno.graus : 0;
    document.getElementById('diasInput').value = aluno.dias_acumulados;
    
    document.getElementById('formTitle').innerText = 'Editar Aluno';
    document.getElementById('btnSalvarForm').innerText = 'Salvar Alterações';
    document.getElementById('btnCancelarEdicao').style.display = 'block';

    switchTab('cadastro', document.querySelectorAll('.menu button')[1]);
}

function cancelarEdicao() {
    document.getElementById('studentForm').reset();
    document.getElementById('editIndexId').value = '';
    document.getElementById('grauInput').value = '0';
    document.getElementById('diasInput').value = '0';
    document.getElementById('formTitle').innerText = 'Cadastrar Novo Aluno';
    document.getElementById('btnSalvarForm').innerText = 'Salvar Novo Aluno';
    document.getElementById('btnCancelarEdicao').style.display = 'none';
}

// RENDERIZAÇÃO COM FILTROS E ORDENAÇÃO
function renderizarTabelas() {
    const tbodyCheck = document.getElementById('dailyCheckTableBody');
    const tbodyReport = document.getElementById('reportTableBody');
    
    if (!tbodyCheck || !tbodyReport) return;
    
    const termoBusca = document.getElementById('filtroNomeInput') ? document.getElementById('filtroNomeInput').value.toLowerCase() : '';
    const faixaSelecionada = document.getElementById('filtroFaixaSelect') ? document.getElementById('filtroFaixaSelect').value : '';
    const statusSelecionado = document.getElementById('filtroStatusSelect') ? document.getElementById('filtroStatusSelect').value : '';
    const ordemAlfabetica = document.getElementById('filtroOrdemSelect') ? document.getElementById('filtroOrdemSelect').value : 'asc';

    let alunosFiltrados = alunosData.filter(aluno => {
        const correspondeNome = aluno.nome.toLowerCase().includes(termoBusca);
        const correspondeFaixa = faixaSelecionada === '' || aluno.faixa === faixaSelecionada;
        
        let correspondeStatus = true;
        if (statusSelecionado === 'faltando1') {
            correspondeStatus = (aluno.dias_acumulados === 119);
        } else if (statusSelecionado === 'apto') {
            correspondeStatus = (aluno.dias_acumulados >= 120);
        } else if (statusSelecionado === 'proximos_aptos') {
            correspondeStatus = (aluno.dias_acumulados === 119 || aluno.dias_acumulados >= 120);
        }

        return correspondeNome && correspondeFaixa && correspondeStatus;
    });

    alunosFiltrados.sort((a, b) => {
        if (ordemAlfabetica === 'desc') {
            return b.nome.localeCompare(a.nome, 'pt-BR');
        }
        return a.nome.localeCompare(b.nome, 'pt-BR');
    });

    tbodyCheck.innerHTML = '';
    tbodyReport.innerHTML = '';
    
    if (alunosFiltrados.length === 0) {
        tbodyCheck.innerHTML = `<tr><td colspan="2" style="text-align: center; color: var(--text-muted);">Nenhum aluno encontrado.</td></tr>`;
        tbodyReport.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Nenhum registro para exibir.</td></tr>`;
        return;
    }

    alunosFiltrados.forEach(aluno => {
        const fLower = (aluno.faixa || '').toLowerCase();
        let indicadorClasse = 'ind-branca';
        if (fLower.includes('cinza')) indicadorClasse = 'ind-cinza';
        else if (fLower.includes('amarela')) indicadorClasse = 'ind-amarela';
        else if (fLower.includes('laranja')) indicadorClasse = 'ind-laranja';
        else if (fLower.includes('verde')) indicadorClasse = 'ind-verde';
        else if (fLower.includes('azul')) indicadorClasse = 'ind-azul';
        else if (fLower.includes('roxa')) indicadorClasse = 'ind-roxa';
        else if (fLower.includes('marrom')) indicadorClasse = 'ind-marrom';
        else if (fLower.includes('preta')) indicadorClasse = 'ind-preta';

        const diasNecessarios = 120;
        const progressoPercentual = Math.min(100, Math.round((aluno.dias_acumulados / diasNecessarios) * 100));
        
        let faixaClasse = 'bar-faixa-branca';
        if (fLower.includes('cinza')) faixaClasse = 'bar-faixa-cinza';
        else if (fLower.includes('amarela')) faixaClasse = 'bar-faixa-amarela';
        else if (fLower.includes('laranja')) faixaClasse = 'bar-faixa-laranja';
        else if (fLower.includes('verde')) faixaClasse = 'bar-faixa-verde';
        else if (fLower.includes('azul')) faixaClasse = 'bar-faixa-azul';
        else if (fLower.includes('roxa')) faixaClasse = 'bar-faixa-roxa';
        else if (fLower.includes('marrom')) faixaClasse = 'bar-faixa-marrom';
        else if (fLower.includes('preta')) faixaClasse = 'bar-faixa-preta';

        if (aluno.dias_acumulados >= diasNecessarios) {
            faixaClasse = 'bar-apto';
        }

        const trCheck = document.createElement('tr');
        trCheck.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <span class="faixa-indicador ${indicadorClasse}" title="${aluno.faixa}"></span>
                    <b>${aluno.nome}</b>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">(${aluno.dias_acumulados}/${diasNecessarios}d)</span>
                </div>
                <div class="progress-container" style="height: 8px; max-width: 220px;" title="${aluno.dias_acumulados} de ${diasNecessarios} dias (${progressoPercentual}%)">
                    <div class="progress-bar-fill ${faixaClasse}" style="width: ${progressoPercentual}%;"></div>
                </div>
            </td>
            <td style="text-align: right; vertical-align: middle;">
                <button class="btn btn-sm ${aluno.presenca_hoje ? 'btn-danger' : ''}" style="${aluno.presenca_hoje ? '' : 'background-color: var(--success);'}" onclick="alternarPresenca(${aluno.id}, event)">
                    ${aluno.presenca_hoje ? 'Presença Confirmada (Remover)' : 'Dar Check'}
                </button>
            </td>
        `;
        tbodyCheck.appendChild(trCheck);

        const trReport = document.createElement('tr');
        trReport.innerHTML = `
            <td>
                <span class="faixa-indicador ${indicadorClasse}" title="${aluno.faixa}"></span>
                <b>${aluno.nome}</b>
            </td>
            <td>${aluno.faixa} (${aluno.graus ?? 0}º Grau)</td>
            <td><b>${aluno.dias_acumulados}</b> / ${diasNecessarios} dias</td>
            <td>
                <div class="progress-container" title="${aluno.dias_acumulados} de ${diasNecessarios} dias (${progressoPercentual}%)">
                    <div class="progress-bar-fill ${faixaClasse}" style="width: ${progressoPercentual}%;"></div>
                    <div class="progress-text">${aluno.dias_acumulados >= diasNecessarios ? 'APTO!' : `${progressoPercentual}%`}</div>
                </div>
            </td>
            <td style="text-align: right;">
                <button class="btn btn-sm btn-secondary" onclick="prepararEdicao(${aluno.id})">Editar</button>
                <button class="btn btn-sm btn-secondary" onclick="adicionarGrau(${aluno.id})">+ Grau</button>
                <button class="btn btn-sm btn-danger" onclick="excluirAluno(${aluno.id})">Excluir</button>
            </td>
        `;
        tbodyReport.appendChild(trReport);
    });
}

// CHECK OTIMIZADO COM BLOQUEIO DE TOQUE FANTASMA (EVENT.STOPPROPAGATION + DESABILITAÇÃO TEMPORÁRIA)
async function alternarPresenca(id, event) {
    if (event) {
        event.stopPropagation();
        const btn = event.currentTarget;
        if (btn.disabled) return; // Evita cliques duplicados em sequência rápida
        btn.disabled = true;
        setTimeout(() => { btn.disabled = false; }, 400);
    }

    const aluno = alunosData.find(a => a.id === id);
    if (!aluno) return;

    const statusAntigo = aluno.presenca_hoje;
    const diasAntigos = aluno.dias_acumulados;

    aluno.presenca_hoje = !statusAntigo;
    aluno.dias_acumulados = aluno.presenca_hoje ? diasAntigos + 1 : Math.max(0, diasAntigos - 1);
    
    renderizarTabelas();

    const { error } = await _supabase
        .from('alunos')
        .update({ 
            presenca_hoje: aluno.presenca_hoje, 
            dias_acumulados: aluno.dias_acumulados 
        })
        .eq('id', id);

    if (error) {
        console.error('Erro ao sincronizar presença:', error.message);
        aluno.presenca_hoje = statusAntigo;
        aluno.dias_acumulados = diasAntigos;
        renderizarTabelas();
        alert('Erro de conexão ao salvar a presença. Tente novamente.');
    }
}

async function marcarTodosHoje(status) {
    for (let aluno of alunosData) {
        if (status && !aluno.presenca_hoje) {
            await _supabase.from('alunos').update({ presenca_hoje: true, dias_acumulados: aluno.dias_acumulados + 1 }).eq('id', aluno.id);
        } else if (!status && aluno.presenca_hoje) {
            await _supabase.from('alunos').update({ presenca_hoje: false, dias_acumulados: Math.max(0, aluno.dias_acumulados - 1) }).eq('id', aluno.id);
        }
    }
    carregarDadosDaTurma();
}

async function fecharDiaAula() {
    if (confirm('Deseja finalizar o dia de treino? As presenças de hoje serão limpas para o próximo dia.')) {
        for (let aluno of alunosData) {
            await _supabase.from('alunos').update({ presenca_hoje: false }).eq('id', aluno.id);
        }
        carregarDadosDaTurma();
        tocarSomSucesso();
        alert('Dia de treino finalizado com sucesso!');
    }
}

async function adicionarGrau(id) {
    const aluno = alunosData.find(a => a.id === id);
    if (!aluno) return;

    const grausAtuais = aluno.graus ?? 0;

    if (grausAtuais >= 4) {
        const faixasPermitidas = obterFaixasPermitidasPorTurma(turmaAtual);
        const indexFaixaAtual = faixasPermitidas.indexOf(aluno.faixa);

        if (indexFaixaAtual !== -1 && indexFaixaAtual < faixasPermitidas.length - 1) {
            const proximaFaixa = faixasPermitidas[indexFaixaAtual + 1];
            const { error } = await _supabase
                .from('alunos')
                .update({ 
                    faixa: proximaFaixa, 
                    graus: 0, 
                    dias_acumulados: 0 
                })
                .eq('id', id);

            if (!error) {
                tocarSomSucesso();
                alert(`🎉 Parabéns! ${aluno.nome} conquistou a troca para a ${proximaFaixa}!`);
                carregarDadosDaTurma();
            }
        } else {
            alert(`O aluno já está na última faixa desta turma e no 4º grau!`);
        }
    } else {
        const novoGrau = grausAtuais + 1;
        const { error } = await _supabase
            .from('alunos')
            .update({ 
                graus: novoGrau, 
                    dias_acumulados: 0 
            })
            .eq('id', id);

        if (!error) {
            alert(`Parabéns! ${aluno.nome} evoluiu para o ${novoGrau}º grau.`);
            carregarDadosDaTurma();
        }
    }
}

async function excluirAluno(id) {
    if (confirm('Tem certeza que deseja remover este aluno?')) {
        const { error } = await _supabase
            .from('alunos')
            .delete()
            .eq('id', id);

        if (!error) {
            carregarDadosDaTurma();
        }
    }
}