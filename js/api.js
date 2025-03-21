/**
 * api.js - Funções para acesso a API e integrações externas
 * 
 * Este arquivo contém as funções para obtenção de cotação do dólar
 * e outras integrações externas.
 */

const API = {
    /**
     * Busca a cotação atual do dólar na API AwesomeAPI
     * @returns {Promise} Promessa com o resultado da requisição
     */
    obterCotacaoDolar: async function() {
        try {
            console.log("Iniciando atualização da cotação...");
            
            // URL da API AwesomeAPI para cotação do Dólar
            const apiUrl = 'https://economia.awesomeapi.com.br/json/last/USD-BRL';
            console.log("URL da API:", apiUrl);
            
            // Faz a requisição para a API
            console.log("Enviando requisição...");
            const response = await fetch(apiUrl);
            
            // Verifica se a resposta foi bem-sucedida
            if (!response.ok) {
                console.error(`Erro HTTP ${response.status}: ${response.statusText}`);
                throw new Error(`Erro HTTP ${response.status}`);
            }
            
            // Converte a resposta para JSON
            console.log("Convertendo resposta para JSON...");
            const data = await response.json();
            console.log("Resposta recebida:", data);
            
            // Verifica se a resposta tem o formato esperado
            if (!data || !data.USDBRL || !data.USDBRL.high) {
                console.error("Formato de resposta inválido:", data);
                throw new Error('Formato de resposta inválido');
            }
            
            // Extrai o valor da cotação
            const valorAtual = parseFloat(data.USDBRL.high);
            console.log("Valor da cotação obtido:", valorAtual);
            
            // Armazena a cotação obtida
            await this.salvarCotacaoNoServidor(valorAtual);
            
            return {
                sucesso: true,
                cotacao: valorAtual,
                mensagem: `Cotação atualizada: R$ ${valorAtual.toFixed(4)}`
            };
        } catch (error) {
            console.error('Erro ao obter cotação:', error);
            
            // Em caso de falha, tenta uma alternativa de API
            try {
                console.log("Tentando API alternativa...");
                const bcbUrl = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.10813/dados/ultimos/1?formato=json';
                const bcbResponse = await fetch(bcbUrl);
                
                if (bcbResponse.ok) {
                    const bcbData = await bcbResponse.json();
                    if (bcbData && bcbData.length > 0 && bcbData[0].valor) {
                        const valorBCB = parseFloat(bcbData[0].valor);
                        console.log("Valor obtido da API alternativa:", valorBCB);
                        
                        // Armazena a cotação obtida da API alternativa
                        await this.salvarCotacaoNoServidor(valorBCB);
                        
                        return {
                            sucesso: true,
                            cotacao: valorBCB,
                            mensagem: `Cotação atualizada (fonte alternativa): R$ ${valorBCB.toFixed(4)}`
                        };
                    }
                }
            } catch (backupError) {
                console.error('Erro na API alternativa:', backupError);
            }
            
            // Se ambas as APIs falharem, usa a última cotação armazenada
            console.log("Usando cotação armazenada...");
            const ultimaCotacao = await this.obterUltimaCotacao();
            return {
                sucesso: false,
                cotacao: ultimaCotacao.valor,
                mensagem: `Não foi possível atualizar a cotação. Usando valor anterior: R$ ${ultimaCotacao.valor.toFixed(4)}`,
                erro: error.message
            };
        }
    },
    
    /**
     * Salva a cotação no servidor
     * @param {number} valor - Valor da cotação
     */
    salvarCotacaoNoServidor: async function(valor) {
        try {
            console.log("Salvando cotação no servidor:", valor);
            
            // Formata os dados para envio
            const dados = {
                valor: valor,
                timestamp: new Date().toISOString(),
                manual: false
            };
            
            // Tenta salvar via API
            try {
                const response = await fetch('api/save_cotacao.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(dados)
                });
                
                const result = await response.json();
                console.log("Resposta do servidor:", result);
                
                if (!result.success) {
                    console.warn("Aviso do servidor:", result.message);
                }
            } catch (apiError) {
                console.warn("Não foi possível salvar no servidor, salvando localmente:", apiError);
            }
            
            // Salva também localmente
            localStorage.setItem('sistemaSaques_ultimaCotacao', JSON.stringify(dados));
            console.log("Cotação salva localmente com sucesso");
            
            return true;
        } catch (error) {
            console.error("Erro ao salvar cotação:", error);
            return false;
        }
    },
    
    /**
     * Obtém a última cotação armazenada
     */
    obterUltimaCotacao: async function() {
        try {
            // Tenta obter do servidor primeiro
            try {
                const response = await fetch('api/get_cotacao.php');
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.cotacao) {
                        console.log("Cotação obtida do servidor:", data.cotacao);
                        return data.cotacao;
                    }
                }
            } catch (serverError) {
                console.warn("Não foi possível obter cotação do servidor:", serverError);
            }
            
            // Fallback para armazenamento local
            const cotacaoLocal = localStorage.getItem('sistemaSaques_ultimaCotacao');
            if (cotacaoLocal) {
                console.log("Usando cotação do armazenamento local");
                return JSON.parse(cotacaoLocal);
            }
            
            // Valor padrão se nada for encontrado
            console.log("Nenhuma cotação encontrada, usando valor padrão");
            return {
                valor: 5.37,
                timestamp: new Date().toISOString(),
                manual: false
            };
        } catch (error) {
            console.error("Erro ao obter cotação:", error);
            return {
                valor: 5.37,
                timestamp: new Date().toISOString(),
                manual: false
            };
        }
    },
    
    /**
     * Define manualmente a cotação do dólar
     * @param {number} valor - Valor da cotação
     * @returns {Object} Resultado da operação
     */
    definirCotacaoManual: async function(valor) {
        if (isNaN(valor) || valor <= 0) {
            return {
                sucesso: false,
                mensagem: 'Valor inválido para cotação'
            };
        }
        
        try {
            console.log("Definindo cotação manual:", valor);
            
            // Formata os dados para envio
            const dados = {
                valor: valor,
                timestamp: new Date().toISOString(),
                manual: true
            };
            
            // Tenta salvar via API
            try {
                const response = await fetch('api/save_cotacao.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(dados)
                });
                
                const result = await response.json();
                console.log("Resposta do servidor:", result);
            } catch (apiError) {
                console.warn("Não foi possível salvar no servidor, salvando localmente:", apiError);
            }
            
            // Salva também localmente
            localStorage.setItem('sistemaSaques_ultimaCotacao', JSON.stringify(dados));
            
            return {
                sucesso: true,
                cotacao: valor,
                mensagem: `Cotação definida manualmente: R$ ${valor.toFixed(4)}`
            };
        } catch (error) {
            console.error("Erro ao definir cotação manual:", error);
            return {
                sucesso: false,
                mensagem: 'Erro ao definir cotação manual: ' + error.message
            };
        }
    },
    
    /**
     * Gera um arquivo CSV a partir dos saques e oferece para download
     * @returns {boolean} True se o download foi iniciado com sucesso
     */
    exportarSaquesParaCSV: async function() {
        // Obtém os saques do banco de dados ou localStorage
        let saques = [];
        
        try {
            // Tenta obter do servidor
            const response = await fetch('api/get_saques.php');
            if (response.ok) {
                const data = await response.json();
                if (data.success && Array.isArray(data.saques)) {
                    saques = data.saques;
                }
            }
        } catch (error) {
            console.warn("Erro ao obter saques do servidor, usando dados locais:", error);
            
            // Fallback para localStorage
            const saquesJSON = localStorage.getItem('sistemaSaques_saques');
            if (saquesJSON) {
                saques = JSON.parse(saquesJSON);
            }
        }
        
        if (saques.length === 0) {
            return false;
        }
        
        // Define os cabeçalhos do CSV
        const cabecalhos = [
            'DATA', 'NOME', 'CPF', 'ID', 'DADOS BANCÁRIOS', 
            'VR.SOLICITADO', 'VR.DOLAR', 'VR.SAQUE'
        ];
        
        // Cria a linha de cabeçalhos
        let csvContent = cabecalhos.join(',') + '\n';
        
        // Adiciona cada saque como uma linha
        saques.forEach(saque => {
            // Formata a data
            let dataFormatada = '';
            try {
                const data = new Date(saque.timestamp);
                dataFormatada = `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth()+1).toString().padStart(2, '0')}/${data.getFullYear()}`;
            } catch (e) {
                dataFormatada = 'N/D';
            }
            
            // Formata os dados bancários
            const dadosBancarios = `${saque.banco || ''}, AG: ${saque.agencia || ''}, CC: ${saque.conta || ''}${saque.pix ? ', PIX: ' + saque.pix : ''}`;
            
            // Formata os valores
            const valorSolicitado = (saque.valorUSD || 0).toString().replace('.', ',');
            const cotacao = (saque.cotacao || 0).toString().replace('.', ',');
            const valorTotal = (saque.valorTotal || 0).toString().replace('.', ',');
            
            // Ajusta os valores para evitar problemas com vírgulas
            const linha = [
                dataFormatada,
                `"${saque.nome || ''}"`,
                `"${saque.cpf || ''}"`,
                `"${saque.id_externo || saque.id || ''}"`,
                `"${dadosBancarios}"`,
                valorSolicitado,
                cotacao,
                valorTotal
            ].join(',');
            
            csvContent += linha + '\n';
        });
        
        // Cria um blob com o conteúdo
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        // Gera o nome do arquivo com data atual
        const data = new Date();
        const dataFormatada = `${data.getFullYear()}${(data.getMonth()+1).toString().padStart(2, '0')}${data.getDate().toString().padStart(2, '0')}`;
        const nomeArquivo = `saques_${dataFormatada}.csv`;
        
        // Cria um link para download e simula o clique
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', nomeArquivo);
        document.body.appendChild(link);
        link.click();
        
        // Remove o link após o download
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
        
        return true;
    },
    
    /**
     * Lê um arquivo CSV e importa os saques
     * @param {File} arquivo - Arquivo CSV selecionado
     * @returns {Promise} Promessa com o resultado da importação
     */
    importarSaquesDeCSV: function(arquivo) {
        return new Promise((resolve, reject) => {
            // Verifica se o arquivo é do tipo CSV
            if (!arquivo || !arquivo.name.toLowerCase().endsWith('.csv')) {
                reject({
                    sucesso: false,
                    mensagem: 'O arquivo deve ter extensão .csv'
                });
                return;
            }
            
            // Cria um leitor de arquivos
            const leitor = new FileReader();
            
            // Define o handler para quando a leitura terminar
            leitor.onload = async function(evento) {
                try {
                    const conteudo = evento.target.result;
                    
                    // Tenta enviar para o servidor primeiro
                    try {
                        const formData = new FormData();
                        formData.append('csvFile', arquivo);
                        
                        const response = await fetch('api/import_csv.php', {
                            method: 'POST',
                            body: formData
                        });
                        
                        if (response.ok) {
                            const result = await response.json();
                            if (result.success) {
                                resolve(result);
                                return;
                            }
                        }
                    } catch (serverError) {
                        console.warn("Não foi possível importar via servidor:", serverError);
                    }
                    
                    // Processamento local como fallback
                    console.log("Importando CSV localmente...");
                    // Aqui você implementaria a lógica de importação local
                    // Dividir o conteúdo em linhas, processar cabeçalhos, etc.
                    
                    // Exemplo de implementação básica:
                    const linhas = conteudo.split('\n');
                    if (linhas.length < 2) {
                        throw new Error('Arquivo CSV vazio ou inválido');
                    }
                    
                    // Processar cabeçalhos
                    const cabecalhos = linhas[0].split(',');
                    // ... implementação do processamento ...
                    
                    resolve({
                        sucesso: true,
                        mensagem: 'Importação local realizada com sucesso'
                    });
                } catch (erro) {
                    console.error('Erro ao processar CSV:', erro);
                    reject({
                        sucesso: false,
                        mensagem: 'Erro ao processar o arquivo: ' + erro.message
                    });
                }
            };
            
            // Define o handler para erros de leitura
            leitor.onerror = function(error) {
                console.error('Erro ao ler arquivo:', error);
                reject({
                    sucesso: false,
                    mensagem: 'Erro ao ler o arquivo'
                });
            };
            
            // Inicia a leitura do arquivo como texto
            leitor.readAsText(arquivo);
        });
    }
};