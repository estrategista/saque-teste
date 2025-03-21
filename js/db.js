/**
 * db.js - Gerenciamento de dados local usando localStorage
 * 
 * Este arquivo contém as funções para armazenar e recuperar dados localmente,
 * simulando um banco de dados para o sistema de saques.
 * 
 * Versão adaptada para suportar chamadas assíncronas, com compatibilidade
 * para integração com o banco de dados MySQL.
 */

const DB = {
    // Chaves para armazenamento no localStorage
    KEYS: {
        SAQUES: 'sistemaSaques_saques',
        CONFIG: 'sistemaSaques_config',
        ULTIMA_COTACAO: 'sistemaSaques_ultimaCotacao',
        VERSAO: 'sistemaSaques_versao'
    },
    
    // Versão atual do banco de dados
    VERSAO_ATUAL: '1.0',
    
    /**
     * Inicializa o banco de dados local
     */
    init: function() {
        // Verifica se é a primeira execução
        if (!localStorage.getItem(this.KEYS.VERSAO)) {
            // Configura valores iniciais
            this.setConfig({
                taxaSaque: 2.50,
                apiUrl: 'https://economia.awesomeapi.com.br/json/last/USD-BRL'
            });
            
            this.setSaques([]);
            this.setUltimaCotacao({
                valor: 5.37,
                timestamp: new Date().toISOString()
            });
            
            // Define a versão
            localStorage.setItem(this.KEYS.VERSAO, this.VERSAO_ATUAL);
            
            console.log('Banco de dados local inicializado com sucesso!');
        } else {
            // Verifica se é necessário migrar dados de versões anteriores
            const versaoArmazenada = localStorage.getItem(this.KEYS.VERSAO);
            if (versaoArmazenada !== this.VERSAO_ATUAL) {
                this._migrarDados(versaoArmazenada);
            }
        }
    },
    
    /**
     * Obtém a lista de saques
     * @returns {Array} Lista de saques
     */
    getSaques: function() {
        const saquesJSON = localStorage.getItem(this.KEYS.SAQUES);
        return saquesJSON ? JSON.parse(saquesJSON) : [];
    },
    
    /**
     * Armazena a lista de saques
     * @param {Array} saques - Lista de saques
     */
    setSaques: function(saques) {
        localStorage.setItem(this.KEYS.SAQUES, JSON.stringify(saques));
    },
    
    /**
     * Adiciona um novo saque à lista
     * @param {Object} saque - Objeto contendo dados do saque
     * @returns {string} ID do saque adicionado
     */
    adicionarSaque: function(saque) {
        const saques = this.getSaques();
        
        // Gera um ID único para o saque
        const saqueId = 'saque_' + new Date().getTime();
        
        // Adiciona o ID e timestamp ao saque
        const novoSaque = {
            ...saque,
            id_interno: saqueId,
            timestamp: new Date().toISOString()
        };
        
        // Adiciona ao início da lista
        saques.unshift(novoSaque);
        
        // Salva a lista atualizada
        this.setSaques(saques);
        
        return saqueId;
    },
    
    /**
     * Remove um saque da lista pelo ID interno
     * @param {string} id - ID interno do saque
     * @returns {boolean} True se removido com sucesso
     */
    removerSaque: function(id) {
        const saques = this.getSaques();
        const indice = saques.findIndex(saque => saque.id_interno === id);
        
        if (indice !== -1) {
            saques.splice(indice, 1);
            this.setSaques(saques);
            return true;
        }
        
        return false;
    },
    
    /**
     * Obtém um saque específico pelo ID interno
     * @param {string} id - ID interno do saque
     * @returns {Object|null} Objeto do saque ou null se não encontrado
     */
    getSaquePorId: function(id) {
        const saques = this.getSaques();
        return saques.find(saque => saque.id_interno === id) || null;
    },
    
    /**
     * Obtém as configurações do sistema
     * @returns {Object} Configurações
     */
    getConfig: function() {
        const configJSON = localStorage.getItem(this.KEYS.CONFIG);
        return configJSON ? JSON.parse(configJSON) : {
            taxaSaque: 2.50,
            apiUrl: 'https://economia.awesomeapi.com.br/json/last/USD-BRL'
        };
    },
    
    /**
     * Armazena as configurações do sistema
     * @param {Object} config - Objeto de configurações
     */
    setConfig: function(config) {
        localStorage.setItem(this.KEYS.CONFIG, JSON.stringify(config));
    },
    
    /**
     * Obtém a última cotação armazenada
     * @returns {Object} Objeto com valor e timestamp da última cotação
     */
    getUltimaCotacao: function() {
        const cotacaoJSON = localStorage.getItem(this.KEYS.ULTIMA_COTACAO);
        return cotacaoJSON ? JSON.parse(cotacaoJSON) : {
            valor: 5.37,
            timestamp: new Date().toISOString()
        };
    },
    
    /**
     * Armazena a última cotação
     * @param {Object} cotacao - Objeto com valor e timestamp
     */
    setUltimaCotacao: function(cotacao) {
        localStorage.setItem(this.KEYS.ULTIMA_COTACAO, JSON.stringify(cotacao));
    },
    
    /**
     * Limpa todos os dados do sistema (função de emergência)
     */
    limparTudo: function() {
        localStorage.removeItem(this.KEYS.SAQUES);
        localStorage.removeItem(this.KEYS.CONFIG);
        localStorage.removeItem(this.KEYS.ULTIMA_COTACAO);
        localStorage.removeItem(this.KEYS.VERSAO);
        console.log('Todos os dados locais foram apagados!');
    },
    
    /**
     * Exporta todos os saques como CSV
     * @returns {string} Conteúdo CSV
     */
    exportarSaquesCSV: function() {
        const saques = this.getSaques();
        
        if (saques.length === 0) {
            return null;
        }
        
        // Define os cabeçalhos do CSV
        const cabecalhos = [
            'DATA', 'NOME', 'CPF', 'ID', 'DADOS BANCÁRIOS', 
            'VR.SOLICITADO', 'VR.DOLAR', 'VR.SAQUE'
        ];
        
        // Cria a linha de cabeçalhos
        let csv = cabecalhos.join(',') + '\n';
        
        // Adiciona cada saque como uma linha
        saques.forEach(saque => {
            // Formata a data
            const data = new Date(saque.timestamp);
            const dataFormatada = `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth()+1).toString().padStart(2, '0')}/${data.getFullYear()}`;
            
            // Formata os dados bancários
            const dadosBancarios = `${saque.banco}, AG: ${saque.agencia}, CC: ${saque.conta}${saque.pix ? ', PIX: ' + saque.pix : ''}`;
            
            // Formata os valores
            const valorSolicitado = saque.valorUSD.toString().replace('.', ',');
            const cotacao = saque.cotacao.toString().replace('.', ',');
            const valorTotal = saque.valorTotal.toString().replace('.', ',');
            
            // Ajusta os valores para evitar problemas com vírgulas
            const linha = [
                dataFormatada,
                `"${saque.nome}"`,
                `"${saque.cpf}"`,
                `"${saque.id}"`,
                `"${dadosBancarios}"`,
                valorSolicitado,
                cotacao,
                valorTotal
            ].join(',');
            
            csv += linha + '\n';
        });
        
        return csv;
    },
    
    /**
     * Importa saques de um arquivo CSV
     * @param {string} conteudoCSV - Conteúdo do arquivo CSV
     * @returns {Object} Resultado da importação (sucesso e mensagem)
     */
    importarSaquesCSV: function(conteudoCSV) {
        try {
            // Divide o conteúdo por linhas
            const linhas = conteudoCSV.split('\n');
            
            // Verifica se há pelo menos duas linhas (cabeçalho + dados)
            if (linhas.length < 2) {
                return { sucesso: false, mensagem: 'Arquivo CSV inválido ou vazio' };
            }
            
            // Obtém os cabeçalhos
            const cabecalhos = linhas[0].split(',');
            
            // Verifica se os cabeçalhos esperados estão presentes
            const cabecalhosEsperados = ['DATA', 'NOME', 'CPF', 'ID', 'DADOS BANCÁRIOS', 'VR.SOLICITADO', 'VR.DOLAR', 'VR.SAQUE'];
            const cabecalhosPresentes = cabecalhosEsperados.every(cabecalho => {
                // Encontra o índice do cabeçalho (ignorando espaços e case)
                return cabecalhos.findIndex(c => c.trim().toUpperCase() === cabecalho) !== -1;
            });
            
            if (!cabecalhosPresentes) {
                return { 
                    sucesso: false, 
                    mensagem: 'Arquivo CSV não contém todos os cabeçalhos necessários' 
                };
            }
            
            // Índices dos campos
            const indiceData = cabecalhos.findIndex(c => c.trim().toUpperCase() === 'DATA');
            const indiceNome = cabecalhos.findIndex(c => c.trim().toUpperCase() === 'NOME');
            const indiceCPF = cabecalhos.findIndex(c => c.trim().toUpperCase() === 'CPF');
            const indiceID = cabecalhos.findIndex(c => c.trim().toUpperCase() === 'ID');
            const indiceDadosBancarios = cabecalhos.findIndex(c => c.trim().toUpperCase() === 'DADOS BANCÁRIOS');
            const indiceSolicitado = cabecalhos.findIndex(c => c.trim().toUpperCase() === 'VR.SOLICITADO');
            const indiceDolar = cabecalhos.findIndex(c => c.trim().toUpperCase() === 'VR.DOLAR');
            const indiceSaque = cabecalhos.findIndex(c => c.trim().toUpperCase() === 'VR.SAQUE');
            
            // Processa cada linha de dados
            const saquesImportados = [];
            const saquesBD = this.getSaques();
            
            for (let i = 1; i < linhas.length; i++) {
                // Ignora linhas vazias
                if (!linhas[i].trim()) {
                    continue;
                }
                
                // Divide a linha em campos
                // Usando regex para lidar com campos entre aspas
                const regex = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g;
                const campos = [];
                let match;
                
                while (match = regex.exec(linhas[i])) {
                    // Remove aspas se existirem
                    let valor = match[1];
                    if (valor.startsWith('"') && valor.endsWith('"')) {
                        valor = valor.substring(1, valor.length - 1);
                    }
                    campos.push(valor);
                }
                
                // Verifica se todos os campos esperados estão presentes
                if (campos.length < cabecalhos.length) {
                    continue; // Pula linhas com dados incompletos
                }
                
                // Extrai os dados bancários
                const dadosBancarios = campos[indiceDadosBancarios];
                let banco = '', agencia = '', conta = '', pix = '';
                
                // Tenta extrair os dados bancários
                const bancoMatch = dadosBancarios.match(/^([^,]+)/);
                if (bancoMatch) banco = bancoMatch[1].trim();
                
                const agenciaMatch = dadosBancarios.match(/AG:\s*([^,]+)/);
                if (agenciaMatch) agencia = agenciaMatch[1].trim();
                
                const contaMatch = dadosBancarios.match(/CC:\s*([^,]+)/);
                if (contaMatch) conta = contaMatch[1].trim();
                
                const pixMatch = dadosBancarios.match(/PIX:\s*([^,]+)/);
                if (pixMatch) pix = pixMatch[1].trim();
                
                // Converte valores para número
                const valorUSD = parseFloat(campos[indiceSolicitado].replace(',', '.'));
                const cotacao = parseFloat(campos[indiceDolar].replace(',', '.'));
                const valorTotal = parseFloat(campos[indiceSaque].replace(',', '.'));
                
                // Cria o objeto de saque
                const saque = {
                    id_interno: 'saque_importado_' + new Date().getTime() + '_' + i,
                    timestamp: new Date().toISOString(), // Data atual pois não temos o timestamp original
                    nome: campos[indiceNome],
                    cpf: campos[indiceCPF],
                    id: campos[indiceID],
                    banco: banco,
                    agencia: agencia,
                    conta: conta,
                    pix: pix,
                    valorUSD: valorUSD,
                    cotacao: cotacao,
                    valorTotal: valorTotal,
                    taxaSaque: cotacao * valorUSD - valorTotal // Calcula a taxa baseada nos valores
                };
                
                saquesImportados.push(saque);
            }
            
            // Adiciona os saques importados ao banco
            const novosSaques = [...saquesImportados, ...saquesBD];
            this.setSaques(novosSaques);
            
            return { 
                sucesso: true, 
                mensagem: `${saquesImportados.length} saques importados com sucesso!` 
            };
        } catch (error) {
            console.error('Erro ao importar CSV:', error);
            return { 
                sucesso: false, 
                mensagem: 'Erro ao processar o arquivo CSV: ' + error.message 
            };
        }
    },
    
    /**
     * Função privada para migrar dados entre versões
     * @param {string} versaoAntiga - Versão do banco de dados armazenada
     * @private
     */
    _migrarDados: function(versaoAntiga) {
        console.log(`Migrando dados da versão ${versaoAntiga} para ${this.VERSAO_ATUAL}`);
        
        // Implementar lógica de migração conforme necessário
        // Por enquanto, apenas atualiza a versão
        localStorage.setItem(this.KEYS.VERSAO, this.VERSAO_ATUAL);
    }
};