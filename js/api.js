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
            // Obtém a URL da API das configurações
            const config = await DB.getConfig();
            const apiUrl = config.apiUrl || 'https://economia.awesomeapi.com.br/json/last/USD-BRL';
            
            // Faz a requisição para a API
            const response = await fetch(apiUrl);
            
            // Verifica se a resposta foi bem-sucedida
            if (!response.ok) {
                throw new Error(`Erro HTTP ${response.status}`);
            }
            
            // Converte a resposta para JSON
            const data = await response.json();
            
            // Verifica se a resposta tem o formato esperado
            if (!data || !data.USDBRL || !data.USDBRL.high) {
                throw new Error('Formato de resposta inválido');
            }
            
            // Extrai o valor da cotação
            const valorAtual = parseFloat(data.USDBRL.high);
            
            // Armazena a cotação obtida
            await DB.setUltimaCotacao({
                valor: valorAtual,
                timestamp: new Date().toISOString()
            });
            
            return {
                sucesso: true,
                cotacao: valorAtual,
                mensagem: `Cotação atualizada: R$ ${valorAtual.toFixed(4)}`
            };
        } catch (error) {
            console.error('Erro ao obter cotação:', error);
            
            // Em caso de falha, retorna a última cotação armazenada
            const ultimaCotacao = await DB.getUltimaCotacao();
            return {
                sucesso: false,
                cotacao: ultimaCotacao.valor,
                mensagem: `Não foi possível atualizar a cotação. Usando valor anterior: R$ ${ultimaCotacao.valor.toFixed(4)}`,
                erro: error.message
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
        
        // Armazena a cotação manual
        await DB.setUltimaCotacao({
            valor: valor,
            timestamp: new Date().toISOString(),
            manual: true
        });
        
        return {
            sucesso: true,
            cotacao: valor,
            mensagem: `Cotação definida manualmente: R$ ${valor.toFixed(4)}`
        };
    },
    
    /**
     * Gera um arquivo CSV a partir dos saques e oferece para download
     * @returns {boolean} True se o download foi iniciado com sucesso
     */
    exportarSaquesParaCSV: async function() {
        // Obtém os saques do banco de dados
        const saques = await DB.getSaques();
        
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
                    const resultado = await DB.importarSaquesCSV(conteudo);
                    resolve(resultado);
                } catch (erro) {
                    reject({
                        sucesso: false,
                        mensagem: 'Erro ao processar o arquivo: ' + erro.message
                    });
                }
            };
            
            // Define o handler para erros de leitura
            leitor.onerror = function() {
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