/**
 * app.js - Lógica principal do Sistema de Saques
 * 
 * Este arquivo contém as funções para gerenciar a interface do usuário
 * e a lógica de negócio do sistema de saques.
 * 
 * Versão adaptada para trabalhar com banco de dados MySQL e funções assíncronas.
 */

// Configurações e variáveis globais
let taxaSaque = 2.50; // Taxa padrão em Reais

// Inicializa o sistema quando a página carrega
document.addEventListener('DOMContentLoaded', async function() {
    // Inicializa o banco de dados local (será sobrescrito pela integração MySQL)
    DB.init();
    
    // Carrega as configurações
    await carregarConfiguracoes();
    
    // Carrega a cotação inicial
    await carregarCotacao();
    
    // Carrega o histórico de saques
    await atualizarHistorico();
    
    // Configura os listeners de eventos
    configurarEventListeners();
    
    console.log('Sistema de Saques inicializado com sucesso!');
});

/**
 * Carrega as configurações do sistema
 */
async function carregarConfiguracoes() {
    const config = await DB.getConfig();
    taxaSaque = config.taxaSaque;
    
    // Atualiza a interface
    document.getElementById('taxaValue').textContent = `R$ ${taxaSaque.toFixed(2)}`;
    document.getElementById('taxaSaqueConfig').value = taxaSaque;
    document.getElementById('apiUrlConfig').value = config.apiUrl;
}

/**
 * Carrega a cotação do dólar
 */
async function carregarCotacao() {
    const ultimaCotacao = await DB.getUltimaCotacao();
    
    // Atualiza a interface
    document.getElementById('dolarValue').textContent = `R$ ${ultimaCotacao.valor.toFixed(4)}`;
    
    // Verifica a data da última atualização
    const dataUltimaAtualizacao = new Date(ultimaCotacao.timestamp);
    const agora = new Date();
    
    // Se a última atualização foi há mais de 1 hora, tenta atualizar automaticamente
    if ((agora - dataUltimaAtualizacao) > (60 * 60 * 1000)) {
        await atualizarCotacao();
    }
}

/**
 * Atualiza a cotação do dólar via API
 */
async function atualizarCotacao() {
    try {
        // Exibe mensagem de carregamento
        showMessage('Atualizando cotação...', 'info');
        
        // Desabilita o botão durante a atualização
        const botao = document.getElementById('updateRateBtn');
        botao.disabled = true;
        
        // Faz a chamada para a API
        const resultado = await API.obterCotacaoDolar();
        
        // Atualiza a interface
        document.getElementById('dolarValue').textContent = `R$ ${resultado.cotacao.toFixed(4)}`;
        
        // Recalcula o valor total se houver um valor processado
        await calcularValorTotal();
        
        // Exibe mensagem de sucesso ou erro
        showMessage(resultado.mensagem, resultado.sucesso ? 'success' : 'warning');
        
        // Habilita o botão novamente
        botao.disabled = false;
    } catch (erro) {
        console.error('Erro ao atualizar cotação:', erro);
        showMessage('Erro ao atualizar cotação. Verifique sua conexão.', 'error');
        
        // Habilita o botão novamente
        document.getElementById('updateRateBtn').disabled = false;
    }
}

/**
 * Abre o modal para definir cotação manual
 */
function abrirModalCotacaoManual() {
    const modal = document.getElementById('rateModal');
    modal.style.display = 'block';
    
    // Preenche o campo com o valor atual
    const cotacaoAtual = parseFloat(document.getElementById('dolarValue').textContent.replace('R$ ', ''));
    document.getElementById('manualRate').value = cotacaoAtual.toFixed(4);
    
    // Foca no campo de entrada
    document.getElementById('manualRate').focus();
}

/**
 * Salva a cotação manual
 */
async function salvarCotacaoManual() {
    const valorInput = document.getElementById('manualRate').value;
    const valor = parseFloat(valorInput);
    
    if (isNaN(valor) || valor <= 0) {
        showMessage('Por favor, insira um valor válido para a cotação.', 'error');
        return;
    }
    
    // Define a cotação manualmente
    const resultado = await API.definirCotacaoManual(valor);
    
    // Atualiza a interface
    document.getElementById('dolarValue').textContent = `R$ ${resultado.cotacao.toFixed(4)}`;
    
    // Recalcula o valor total se houver um valor processado
    await calcularValorTotal();
    
    // Fecha o modal
    document.getElementById('rateModal').style.display = 'none';
    
    // Exibe mensagem
    showMessage(resultado.mensagem, resultado.sucesso ? 'success' : 'error');
}

/**
 * Processa o texto da solicitação de saque
 */
function processarSolicitacao() {
    const texto = document.getElementById('requestText').value.trim();
    
    if (!texto) {
        showMessage('Por favor, cole o texto da solicitação de saque.', 'error');
        return;
    }
    
    try {
        // Extrai os dados usando expressões regulares
        const nomeMatch = texto.match(/Nome:\s*([^\n]+)/i);
        const cpfMatch = texto.match(/CPF:\s*([^\n]+)/i);
        const idMatch = texto.match(/ID:\s*([^\n]+)/i);
        const valorMatch = texto.match(/Valor:\s*USD\s*([0-9,.]+)/i);
        const bancoMatch = texto.match(/Banco:\s*([^\n]+)/i);
        const agenciaMatch = texto.match(/AG:\s*([^\n]+)/i);
        const contaMatch = texto.match(/CC:\s*([^\n]+)/i);
        const pixMatch = texto.match(/PIX:\s*([^\n]+)/i);
        
        // Verifica se os campos obrigatórios foram encontrados
        if (!nomeMatch || !cpfMatch || !idMatch || !valorMatch || !bancoMatch || !agenciaMatch || !contaMatch) {
            showMessage('Não foi possível extrair todos os campos obrigatórios. Verifique o formato da solicitação.', 'error');
            return;
        }
        
        // Preenche o formulário com os dados extraídos
        document.getElementById('nome').value = nomeMatch[1].trim();
        document.getElementById('cpf').value = cpfMatch[1].trim();
        document.getElementById('id').value = idMatch[1].trim();
        document.getElementById('valor').value = valorMatch[1].trim().replace(',', '.');
        document.getElementById('banco').value = bancoMatch[1].trim();
        document.getElementById('agencia').value = agenciaMatch[1].trim();
        document.getElementById('conta').value = contaMatch[1].trim();
        document.getElementById('pix').value = pixMatch ? pixMatch[1].trim() : '';
        
        // Calcular o valor total
        calcularValorTotal();
        
        // Habilitar o botão de confirmar
        document.getElementById('confirmBtn').disabled = false;
        
        showMessage('Solicitação processada com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao processar solicitação:', error);
        showMessage('Erro ao processar a solicitação. Verifique o formato do texto.', 'error');
    }
}

/**
 * Calcula o valor total do saque em reais
 */
async function calcularValorTotal() {
    const valorInput = document.getElementById('valor').value;
    const cotacaoText = document.getElementById('dolarValue').textContent.replace('R$ ', '');
    
    if (valorInput && cotacaoText) {
        const valorUSD = parseFloat(valorInput.replace(',', '.'));
        const cotacaoDolar = parseFloat(cotacaoText);
        
        if (!isNaN(valorUSD) && !isNaN(cotacaoDolar)) {
            // Cálculo: (Valor em USD * Cotação do Dólar) - Taxa de Saque
            const valorTotal = (valorUSD * cotacaoDolar) - taxaSaque;
            
            document.getElementById('totalValue').textContent = `R$ ${valorTotal.toFixed(2)}`;
            return valorTotal;
        }
    }
    
    document.getElementById('totalValue').textContent = '--';
    return null;
}

/**
 * Confirma o saque e registra no banco de dados
 */
async function confirmarSaque() {
    try {
        // Obtém os dados do formulário
        const nome = document.getElementById('nome').value;
        const cpf = document.getElementById('cpf').value;
        const id = document.getElementById('id').value;
        const valorUSDText = document.getElementById('valor').value;
        const banco = document.getElementById('banco').value;
        const agencia = document.getElementById('agencia').value;
        const conta = document.getElementById('conta').value;
        const pix = document.getElementById('pix').value;
        
        // Validação básica
        if (!nome || !cpf || !id || !valorUSDText || !banco || !agencia || !conta) {
            showMessage('Todos os campos obrigatórios devem ser preenchidos.', 'error');
            return;
        }
        
        // Converte o valor para número
        const valorUSD = parseFloat(valorUSDText.replace(',', '.'));
        if (isNaN(valorUSD) || valorUSD <= 0) {
            showMessage('O valor do saque deve ser um número positivo.', 'error');
            return;
        }
        
        // Obtém a cotação atual
        const cotacaoText = document.getElementById('dolarValue').textContent.replace('R$ ', '');
        const cotacao = parseFloat(cotacaoText);
        
        // Calcula o valor total
        const valorTotal = await calcularValorTotal();
        if (valorTotal === null) {
            showMessage('Não foi possível calcular o valor total. Verifique os valores.', 'error');
            return;
        }
        
        // Desabilita o botão de confirmar durante o processamento
        document.getElementById('confirmBtn').disabled = true;
        
        // Cria o objeto com os dados do saque
        const saque = {
            nome,
            cpf,
            id,
            valorUSD,
            banco,
            agencia,
            conta,
            pix,
            cotacao,
            valorTotal,
            taxaSaque
        };
        
        // Registra o saque no banco de dados
        const saqueId = await DB.adicionarSaque(saque);
        
        // Atualiza o histórico
        await atualizarHistorico();
        
        // Data e hora para o recibo
        const hoje = new Date();
        const dataFormatada = `${hoje.getDate().toString().padStart(2, '0')}/${(hoje.getMonth()+1).toString().padStart(2, '0')}/${hoje.getFullYear()}`;
        const horaFormatada = `${hoje.getHours().toString().padStart(2, '0')}:${hoje.getMinutes().toString().padStart(2, '0')}`;
        
        // Gera e exibe o recibo
        gerarRecibo({
            saqueId,
            nome,
            cpf,
            id,
            valorUSD,
            cotacao,
            valorTotal,
            taxa: taxaSaque,
            data: dataFormatada,
            hora: horaFormatada,
            banco,
            agencia,
            conta,
            pix
        });
        
        // Exibe mensagem de sucesso
        showMessage('Saque confirmado com sucesso!', 'success');
        
        // Habilita o botão de confirmar
        document.getElementById('confirmBtn').disabled = false;
    } catch (error) {
        console.error('Erro ao confirmar saque:', error);
        showMessage('Erro ao confirmar o saque: ' + error.message, 'error');
        
        // Habilita o botão de confirmar
        document.getElementById('confirmBtn').disabled = false;
    }
}

/**
 * Gera o recibo de saque e exibe na interface
 * @param {Object} dados - Dados do saque
 */
function gerarRecibo(dados) {
    const valorUSDFormatado = dados.valorUSD.toFixed(2).replace('.', ',');
    const cotacaoFormatada = dados.cotacao.toFixed(4).replace('.', ',');
    const taxaFormatada = dados.taxa.toFixed(2).replace('.', ',');
    const valorTotalFormatado = dados.valorTotal.toFixed(2).replace('.', ',');
    
    // Formato do recibo
    const recibo = `
=======================================================
            COMPROVANTE DE SAQUE - #${dados.id}
=======================================================

DATA: ${dados.data}
HORA: ${dados.hora}

NOME: ${dados.nome}
CPF: ${dados.cpf}
ID: ${dados.id}

VALOR SOLICITADO: USD ${valorUSDFormatado}
COTAÇÃO DO DÓLAR: R$ ${cotacaoFormatada}
TAXA DE SAQUE: R$ ${taxaFormatada}
VALOR TOTAL: R$ ${valorTotalFormatado}

DADOS BANCÁRIOS:
BANCO: ${dados.banco}
AGÊNCIA: ${dados.agencia}
CONTA: ${dados.conta}${dados.pix ? '\nPIX: ' + dados.pix : ''}

=======================================================
          OBRIGADO POR UTILIZAR NOSSO SISTEMA
=======================================================
`.trim();

    // Exibir a seção do recibo
    document.getElementById('reciboSection').style.display = 'block';
    document.getElementById('reciboText').value = recibo;
    
    // Rolar a página para mostrar o recibo
    document.getElementById('reciboSection').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Copia o recibo para a área de transferência
 */
function copiarRecibo() {
    const reciboText = document.getElementById('reciboText');
    reciboText.select();
    document.execCommand('copy');
    
    // Desmarcar a seleção
    window.getSelection().removeAllRanges();
    
    showMessage('Recibo copiado para a área de transferência!', 'success');
}

/**
 * Imprime o recibo
 */
function imprimirRecibo() {
    window.print();
}

/**
 * Limpa o formulário de solicitação
 */
function limparFormulario() {
    // Limpa os campos de entrada
    document.getElementById('requestText').value = '';
    document.getElementById('nome').value = '';
    document.getElementById('cpf').value = '';
    document.getElementById('id').value = '';
    document.getElementById('valor').value = '';
    document.getElementById('banco').value = '';
    document.getElementById('agencia').value = '';
    document.getElementById('conta').value = '';
    document.getElementById('pix').value = '';
    
    // Limpa os valores calculados
    document.getElementById('totalValue').textContent = '--';
    
    // Desabilita o botão de confirmar
    document.getElementById('confirmBtn').disabled = true;
    
    // Esconde a seção do recibo
    document.getElementById('reciboSection').style.display = 'none';
    
    // Limpa mensagens
    document.getElementById('messageArea').innerHTML = '';
}

/**
 * Atualiza a tabela de histórico de saques
 */
async function atualizarHistorico() {
    const historyTable = document.getElementById('historyTable');
    historyTable.innerHTML = '';
    
    // Obtém os saques do banco de dados
    const saques = await DB.getSaques();
    
    if (!saques || saques.length === 0) {
        // Se não houver saques, exibe uma mensagem
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="7" style="text-align: center;">Nenhum saque registrado.</td>';
        historyTable.appendChild(row);
        return;
    }
    
    // Adiciona cada saque à tabela
    saques.forEach(saque => {
        const row = document.createElement('tr');
        
        // Formata a data
        let dataFormatada = 'N/D';
        try {
            const data = new Date(saque.timestamp);
            dataFormatada = `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth()+1).toString().padStart(2, '0')}/${data.getFullYear()}`;
        } catch (error) {
            console.error('Erro ao formatar data:', error);
        }
        
        // Cria a linha da tabela
        row.innerHTML = `
            <td>${dataFormatada}</td>
            <td>${saque.nome}</td>
            <td>${saque.id || saque.id_externo}</td>
            <td>USD ${saque.valorUSD ? saque.valorUSD.toFixed(2) : '0.00'}</td>
            <td>R$ ${saque.cotacao ? saque.cotacao.toFixed(4) : '0.0000'}</td>
            <td>R$ ${saque.valorTotal ? saque.valorTotal.toFixed(2) : '0.00'}</td>
            <td class="action-buttons">
                <button class="view-btn" data-id="${saque.id_interno}">Ver</button>
                <button class="delete-btn" data-id="${saque.id_interno}">Excluir</button>
            </td>
        `;
        
        historyTable.appendChild(row);
    });
    
    // Adiciona event listeners para os botões de ação
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const saqueId = this.getAttribute('data-id');
            await exibirDetalhes(saqueId);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const saqueId = this.getAttribute('data-id');
            await confirmarExclusao(saqueId);
        });
    });
}

/**
 * Exibe os detalhes de um saque e gera o recibo
 * @param {string} saqueId - ID interno do saque
 */
async function exibirDetalhes(saqueId) {
    // Obtém os dados do saque
    const saque = await DB.getSaquePorId(saqueId);
    
    if (!saque) {
        showMessage('Saque não encontrado.', 'error');
        return;
    }
    
    // Formata a data e hora para o recibo
    let dataFormatada = 'N/D';
    let horaFormatada = 'N/D';
    try {
        const data = new Date(saque.timestamp);
        dataFormatada = `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth()+1).toString().padStart(2, '0')}/${data.getFullYear()}`;
        horaFormatada = `${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}`;
    } catch (error) {
        console.error('Erro ao formatar data/hora:', error);
    }
    
    // Gera e exibe o recibo
    gerarRecibo({
        saqueId: saque.id_interno,
        nome: saque.nome,
        cpf: saque.cpf,
        id: saque.id || saque.id_externo,
        valorUSD: parseFloat(saque.valorUSD) || 0,
        cotacao: parseFloat(saque.cotacao) || 0,
        valorTotal: parseFloat(saque.valorTotal) || 0,
        taxa: parseFloat(saque.taxaSaque) || taxaSaque, // Usa o valor armazenado ou o atual
        data: dataFormatada,
        hora: horaFormatada,
        banco: saque.banco,
        agencia: saque.agencia,
        conta: saque.conta,
        pix: saque.pix || ''
    });
    
    // Rola até o recibo
    document.getElementById('reciboSection').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Exibe confirmação para excluir um saque
 * @param {string} saqueId - ID interno do saque
 */
async function confirmarExclusao(saqueId) {
    if (confirm('Tem certeza que deseja excluir este saque?')) {
        // Remove o saque
        const sucesso = await DB.removerSaque(saqueId);
        
        if (sucesso) {
            // Atualiza a tabela
            await atualizarHistorico();
            showMessage('Saque excluído com sucesso.', 'success');
        } else {
            showMessage('Erro ao excluir o saque.', 'error');
        }
    }
}

/**
 * Exporta os saques para um arquivo CSV
 */
async function exportarSaques() {
    const resultado = await API.exportarSaquesParaCSV();
    
    if (resultado) {
        showMessage('Arquivo CSV gerado com sucesso! O download começará em instantes.', 'success');
    } else {
        showMessage('Não há saques para exportar.', 'warning');
    }
}

/**
 * Importa saques de um arquivo CSV
 */
async function importarSaques() {
    const fileInput = document.getElementById('importFile');
    const arquivo = fileInput.files[0];
    
    if (!arquivo) {
        showMessage('Selecione um arquivo CSV para importar.', 'error');
        return;
    }
    
    try {
        // Exibe mensagem de carregamento
        showMessage('Importando saques...', 'info');
        
        // Importa os saques
        const resultado = await API.importarSaquesDeCSV(arquivo);
        
        // Limpa o input de arquivo
        fileInput.value = '';
        
        // Atualiza o histórico
        await atualizarHistorico();
        
        // Exibe mensagem de resultado
        showMessage(resultado.mensagem, resultado.sucesso ? 'success' : 'error');
    } catch (erro) {
        console.error('Erro ao importar saques:', erro);
        showMessage(erro.mensagem || 'Erro ao importar saques.', 'error');
        
        // Limpa o input de arquivo
        fileInput.value = '';
    }
}

/**
 * Abre o modal de configurações
 */
function abrirModalConfiguracoes() {
    const modal = document.getElementById('settingsModal');
    modal.style.display = 'block';
    
    // Carrega os valores atuais
    const loadConfig = async () => {
        const config = await DB.getConfig();
        document.getElementById('taxaSaqueConfig').value = config.taxaSaque;
        document.getElementById('apiUrlConfig').value = config.apiUrl;
    };
    
    loadConfig();
}

/**
 * Salva as configurações
 */
async function salvarConfiguracoes() {
    const taxaSaqueInput = document.getElementById('taxaSaqueConfig').value;
    const apiUrlInput = document.getElementById('apiUrlConfig').value;
    
    // Valida os valores
    const taxaSaqueValor = parseFloat(taxaSaqueInput);
    if (isNaN(taxaSaqueValor) || taxaSaqueValor < 0) {
        showMessage('A taxa de saque deve ser um número positivo.', 'error');
        return;
    }
    
    if (!apiUrlInput) {
        showMessage('A URL da API é obrigatória.', 'error');
        return;
    }
    
    // Atualiza as configurações
    const config = {
        taxaSaque: taxaSaqueValor,
        apiUrl: apiUrlInput
    };
    
    await DB.setConfig(config);
    
    // Atualiza as variáveis globais
    taxaSaque = taxaSaqueValor;
    
    // Atualiza a interface
    document.getElementById('taxaValue').textContent = `R$ ${taxaSaque.toFixed(2)}`;
    
    // Recalcula o valor total se houver um valor processado
    await calcularValorTotal();
    
    // Fecha o modal
    document.getElementById('settingsModal').style.display = 'none';
    
    // Exibe mensagem
    showMessage('Configurações salvas com sucesso!', 'success');
}

/**
 * Exibe uma mensagem de status para o usuário
 * @param {string} message - Texto da mensagem
 * @param {string} type - Tipo da mensagem (success, error, warning, info)
 */
function showMessage(message, type) {
    const messageArea = document.getElementById('messageArea');
    messageArea.innerHTML = `<div class="message ${type}">${message}</div>`;
    
    // Aplica estilos de acordo com o tipo
    const messageElement = messageArea.querySelector('.message');
    if (messageElement) {
        switch (type) {
            case 'success':
                messageElement.style.backgroundColor = '#d4edda';
                messageElement.style.color = '#155724';
                messageElement.style.border = '1px solid #c3e6cb';
                break;
            case 'error':
                messageElement.style.backgroundColor = '#f8d7da';
                messageElement.style.color = '#721c24';
                messageElement.style.border = '1px solid #f5c6cb';
                break;
            case 'warning':
                messageElement.style.backgroundColor = '#fff3cd';
                messageElement.style.color = '#856404';
                messageElement.style.border = '1px solid #ffeeba';
                break;
            case 'info':
                messageElement.style.backgroundColor = '#d1ecf1';
                messageElement.style.color = '#0c5460';
                messageElement.style.border = '1px solid #bee5eb';
                break;
        }
        
        // Adiciona padding
        messageElement.style.padding = '10px 15px';
        messageElement.style.borderRadius = '4px';
        messageElement.style.margin = '10px 0';
    }
    
    // Remove a mensagem após alguns segundos (exceto erros)
    if (type !== 'error') {
        setTimeout(() => {
            // Verifica se a mensagem atual é a mesma que estamos removendo
            const currentMessage = messageArea.querySelector('.message');
            if (currentMessage && currentMessage.textContent === message) {
                messageArea.innerHTML = '';
            }
        }, 5000);
    }
}

/**
 * Configura todos os event listeners da aplicação
 */
function configurarEventListeners() {
    // Botões principais
    document.getElementById('updateRateBtn').addEventListener('click', atualizarCotacao);
    document.getElementById('manualRateBtn').addEventListener('click', abrirModalCotacaoManual);
    document.getElementById('processRequestBtn').addEventListener('click', processarSolicitacao);
    document.getElementById('clearBtn').addEventListener('click', limparFormulario);
    document.getElementById('confirmBtn').addEventListener('click', confirmarSaque);
    document.getElementById('copyReciboBtn').addEventListener('click', copiarRecibo);
    document.getElementById('printReciboBtn').addEventListener('click', imprimirRecibo);
    document.getElementById('exportBtn').addEventListener('click', exportarSaques);
    document.getElementById('importFile').addEventListener('change', importarSaques);
    
    // Modal de cotação manual
    document.getElementById('saveRateBtn').addEventListener('click', salvarCotacaoManual);
    
    // Botões de fechar modais
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Fecha modais ao clicar fora deles
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };
    
    // Tecla Enter para confirmar nos modais
    document.getElementById('manualRate').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            salvarCotacaoManual();
        }
    });
    
    // Configura o botão de configurações
    const configBtn = document.createElement('button');
    configBtn.id = 'configBtn';
    configBtn.className = 'secondary-button';
    configBtn.textContent = '⚙️ Configurações';
    configBtn.style.position = 'absolute';
    configBtn.style.top = '10px';
    configBtn.style.right = '10px';
    configBtn.addEventListener('click', abrirModalConfiguracoes);
    
    document.querySelector('.container').appendChild(configBtn);
    document.getElementById('saveConfigBtn').addEventListener('click', salvarConfiguracoes);
}