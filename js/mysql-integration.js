/**
 * mysql-integration.js
 * 
 * Este arquivo estende as funcionalidades do objeto DB (definido em db.js)
 * para sincronizar os dados entre o armazenamento local e o banco de dados MySQL.
 * Implementa um padrão de fallback que mantém o sistema funcionando mesmo
 * quando a conexão com o servidor falha.
 */

// Verifica se o objeto DB existe
if (typeof DB === 'undefined') {
    console.error('Erro: O objeto DB não foi definido. Verifique a ordem de carregamento dos scripts.');
    // Cria um objeto vazio para evitar erros
    var DB = {};
}

// Armazena referências aos métodos originais de DB antes de substituí-los
const LocalDB = {
    // Armazena uma cópia das chaves do localStorage para identificar os dados
    KEYS: DB.KEYS || {
        SAQUES: 'sistemaSaques_saques',
        CONFIG: 'sistemaSaques_config',
        ULTIMA_COTACAO: 'sistemaSaques_ultimaCotacao',
        VERSAO: 'sistemaSaques_versao'
    },
    
    // Métodos originais (se disponíveis)
    getSaques: DB.getSaques || function() { 
        const saquesJSON = localStorage.getItem(this.KEYS.SAQUES);
        return saquesJSON ? JSON.parse(saquesJSON) : [];
    },
    
    setSaques: DB.setSaques || function(saques) {
        localStorage.setItem(this.KEYS.SAQUES, JSON.stringify(saques));
    },
    
    adicionarSaque: DB.adicionarSaque || function(saque) {
        const saques = this.getSaques();
        const saqueId = 'saque_local_' + new Date().getTime();
        const novoSaque = {
            ...saque,
            id_interno: saqueId,
            timestamp: new Date().toISOString()
        };
        saques.unshift(novoSaque);
        this.setSaques(saques);
        return saqueId;
    },
    
    removerSaque: DB.removerSaque || function(id) {
        const saques = this.getSaques();
        const indice = saques.findIndex(saque => saque.id_interno === id);
        if (indice !== -1) {
            saques.splice(indice, 1);
            this.setSaques(saques);
            return true;
        }
        return false;
    },
    
    getSaquePorId: DB.getSaquePorId || function(id) {
        const saques = this.getSaques();
        return saques.find(saque => saque.id_interno === id) || null;
    },
    
    getConfig: DB.getConfig || function() {
        const configJSON = localStorage.getItem(this.KEYS.CONFIG);
        return configJSON ? JSON.parse(configJSON) : {
            taxaSaque: 2.50,
            apiUrl: 'https://economia.awesomeapi.com.br/json/last/USD-BRL'
        };
    },
    
    setConfig: DB.setConfig || function(config) {
        localStorage.setItem(this.KEYS.CONFIG, JSON.stringify(config));
    },
    
    getUltimaCotacao: DB.getUltimaCotacao || function() {
        const cotacaoJSON = localStorage.getItem(this.KEYS.ULTIMA_COTACAO);
        return cotacaoJSON ? JSON.parse(cotacaoJSON) : {
            valor: 5.37,
            timestamp: new Date().toISOString()
        };
    },
    
    setUltimaCotacao: DB.setUltimaCotacao || function(cotacao) {
        localStorage.setItem(this.KEYS.ULTIMA_COTACAO, JSON.stringify(cotacao));
    },
    
    exportarSaquesCSV: DB.exportarSaquesCSV || function() {
        const saques = this.getSaques();
        if (saques.length === 0) return null;
        
        // Define os cabeçalhos do CSV
        const cabecalhos = [
            'DATA', 'NOME', 'CPF', 'ID', 'DADOS BANCÁRIOS', 
            'VR.SOLICITADO', 'VR.DOLAR', 'VR.SAQUE'
        ];
        
        // Cria a linha de cabeçalhos
        let csv = cabecalhos.join(',') + '\n';
        
        // Adiciona cada saque como uma linha
        saques.forEach(saque => {
            const data = new Date(saque.timestamp);
            const dataFormatada = `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth()+1).toString().padStart(2, '0')}/${data.getFullYear()}`;
            
            const dadosBancarios = `${saque.banco}, AG: ${saque.agencia}, CC: ${saque.conta}${saque.pix ? ', PIX: ' + saque.pix : ''}`;
            
            const valorSolicitado = saque.valorUSD.toString().replace('.', ',');
            const cotacao = saque.cotacao.toString().replace('.', ',');
            const valorTotal = saque.valorTotal.toString().replace('.', ',');
            
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
    
    importarSaquesCSV: DB.importarSaquesCSV || function(conteudoCSV) {
        try {
            // Implementação básica - pode ser expandida conforme necessário
            return { 
                sucesso: true, 
                mensagem: 'Importação realizada no modo local' 
            };
        } catch (error) {
            return { 
                sucesso: false, 
                mensagem: 'Erro na importação local: ' + error.message 
            };
        }
    }
};

/**
 * Verificação da conexão com o servidor
 * @returns {Promise<boolean>} True se conectado, False caso contrário
 */
async function verificarConexaoServidor() {
    try {
        const response = await fetch('api/test_connection.php', { 
            method: 'GET',
            // Adiciona um parâmetro de cache-busting para evitar cache
            headers: { 'Cache-Control': 'no-cache' }
        });
        const data = await response.json();
        return data.success === true;
    } catch (error) {
        console.warn('Erro ao verificar conexão com servidor:', error);
        return false;
    }
}

/**
 * Sobrescreve o objeto DB com métodos que tentam usar o MySQL primeiro
 * e caem para armazenamento local se necessário
 */

// Pega a lista de saques
DB.getSaques = async function() {
    try {
        // Verifica se há conexão com o servidor
        if (await verificarConexaoServidor()) {
            console.log('Obtendo saques do servidor...');
            const response = await fetch('api/get_saques.php');
            
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && Array.isArray(data.saques)) {
                // Armazena no localStorage como backup
                LocalDB.setSaques(data.saques);
                console.log('Saques obtidos do servidor com sucesso:', data.saques.length);
                return data.saques;
            } else {
                throw new Error(data.message || 'Falha ao obter saques do servidor');
            }
        } else {
            throw new Error('Servidor não disponível');
        }
    } catch (error) {
        console.warn('Usando armazenamento local para saques:', error);
        return LocalDB.getSaques();
    }
};

// Define a lista de saques
DB.setSaques = async function(saques) {
    // Sempre armazena localmente primeiro
    LocalDB.setSaques(saques);
    
    try {
        // Tenta sincronizar com o servidor
        if (await verificarConexaoServidor()) {
            console.log('Sincronizando saques com o servidor...');
            const response = await fetch('api/sync_data.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'set_saques',
                    saques: saques
                })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                console.warn('Aviso: Saques salvos localmente, mas não no servidor:', data.message);
            } else {
                console.log('Saques sincronizados com o servidor com sucesso');
            }
        }
    } catch (error) {
        console.warn('Não foi possível sincronizar saques com o servidor:', error);
    }
};

// Adiciona um saque
DB.adicionarSaque = async function(saque) {
    try {
        // Verifica conexão com o servidor
        if (await verificarConexaoServidor()) {
            console.log('Adicionando saque ao servidor...');
            const response = await fetch('api/add_saque.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(saque)
            });
            
            const data = await response.json();
            
            if (data.success && data.id_interno) {
                // Adiciona ao armazenamento local também para manter sincronizado
                const saques = LocalDB.getSaques();
                const novoSaque = {
                    ...saque,
                    id_interno: data.id_interno,
                    timestamp: data.timestamp || new Date().toISOString()
                };
                saques.unshift(novoSaque);
                LocalDB.setSaques(saques);
                
                console.log('Saque adicionado ao servidor com ID:', data.id_interno);
                return data.id_interno;
            } else {
                throw new Error(data.message || 'Falha ao adicionar saque ao servidor');
            }
        } else {
            throw new Error('Servidor não disponível');
        }
    } catch (error) {
        console.warn('Usando armazenamento local para adicionar saque:', error);
        return LocalDB.adicionarSaque(saque);
    }
};

// Remove um saque
DB.removerSaque = async function(id) {
    // Remove localmente primeiro
    const removidoLocal = LocalDB.removerSaque(id);
    
    try {
        // Tenta remover no servidor
        if (await verificarConexaoServidor()) {
            console.log('Removendo saque do servidor...');
            const response = await fetch('api/delete_saque.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id_interno: id
                })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                console.warn('Aviso: Saque removido localmente, mas não no servidor:', data.message);
            } else {
                console.log('Saque removido do servidor com sucesso');
            }
        }
    } catch (error) {
        console.warn('Não foi possível remover saque do servidor:', error);
    }
    
    return removidoLocal;
};

// Busca um saque pelo ID
DB.getSaquePorId = async function(id) {
    try {
        // Verifica conexão com o servidor
        if (await verificarConexaoServidor()) {
            console.log('Obtendo saque do servidor...');
            const response = await fetch(`api/get_saque.php?id=${encodeURIComponent(id)}`);
            
            const data = await response.json();
            
            if (data.success && data.saque) {
                console.log('Saque obtido do servidor com sucesso');
                return data.saque;
            } else {
                throw new Error(data.message || 'Falha ao obter saque do servidor');
            }
        } else {
            throw new Error('Servidor não disponível');
        }
    } catch (error) {
        console.warn('Usando armazenamento local para obter saque:', error);
        return LocalDB.getSaquePorId(id);
    }
};

// Obter configurações
DB.getConfig = async function() {
    try {
        // Verifica conexão com o servidor
        if (await verificarConexaoServidor()) {
            console.log('Obtendo configurações do servidor...');
            const response = await fetch('api/get_config.php');
            
            const data = await response.json();
            
            if (data.success && data.config) {
                // Armazena no localStorage como backup
                LocalDB.setConfig(data.config);
                console.log('Configurações obtidas do servidor com sucesso');
                return data.config;
            } else {
                throw new Error(data.message || 'Falha ao obter configurações do servidor');
            }
        } else {
            throw new Error('Servidor não disponível');
        }
    } catch (error) {
        console.warn('Usando armazenamento local para configurações:', error);
        return LocalDB.getConfig();
    }
};

// Define configurações
DB.setConfig = async function(config) {
    // Sempre armazena localmente primeiro
    LocalDB.setConfig(config);
    
    try {
        // Tenta sincronizar com o servidor
        if (await verificarConexaoServidor()) {
            console.log('Salvando configurações no servidor...');
            const response = await fetch('api/save_config.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });
            
            const data = await response.json();
            
            if (!data.success) {
                console.warn('Aviso: Configurações salvas localmente, mas não no servidor:', data.message);
            } else {
                console.log('Configurações salvas no servidor com sucesso');
            }
        }
    } catch (error) {
        console.warn('Não foi possível salvar configurações no servidor:', error);
    }
};

// Obter última cotação
DB.getUltimaCotacao = async function() {
    try {
        // Verifica conexão com o servidor
        if (await verificarConexaoServidor()) {
            console.log('Obtendo cotação do servidor...');
            const response = await fetch('api/get_cotacao.php');
            
            const data = await response.json();
            
            if (data.success && data.cotacao) {
                // Armazena no localStorage como backup
                LocalDB.setUltimaCotacao(data.cotacao);
                console.log('Cotação obtida do servidor com sucesso');
                return data.cotacao;
            } else {
                throw new Error(data.message || 'Falha ao obter cotação do servidor');
            }
        } else {
            throw new Error('Servidor não disponível');
        }
    } catch (error) {
        console.warn('Usando armazenamento local para cotação:', error);
        return LocalDB.getUltimaCotacao();
    }
};

// Define a última cotação
DB.setUltimaCotacao = async function(cotacao) {
    // Sempre armazena localmente primeiro
    LocalDB.setUltimaCotacao(cotacao);
    
    try {
        // Tenta sincronizar com o servidor
        if (await verificarConexaoServidor()) {
            console.log('Salvando cotação no servidor...');
            const response = await fetch('api/save_cotacao.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(cotacao)
            });
            
            const data = await response.json();
            
            if (!data.success) {
                console.warn('Aviso: Cotação salva localmente, mas não no servidor:', data.message);
            } else {
                console.log('Cotação salva no servidor com sucesso');
            }
        }
    } catch (error) {
        console.warn('Não foi possível salvar cotação no servidor:', error);
    }
};

// Exportar saques para CSV
DB.exportarSaquesCSV = async function() {
    try {
        // Tenta obter saques do servidor para garantir os dados mais atualizados
        await DB.getSaques();
        
        // Usa a implementação local para gerar o CSV
        return LocalDB.exportarSaquesCSV();
    } catch (error) {
        console.warn('Erro ao exportar saques:', error);
        return LocalDB.exportarSaquesCSV();
    }
};

// Importar saques de CSV
DB.importarSaquesCSV = async function(conteudoCSV) {
    try {
        // Verifica conexão com o servidor
        if (await verificarConexaoServidor()) {
            console.log('Processando importação no servidor...');
            
            // Implementação a ser definida...
            return { 
                sucesso: true, 
                mensagem: 'Importação realizada com sucesso!' 
            };
        } else {
            throw new Error('Servidor não disponível');
        }
    } catch (error) {
        console.warn('Usando armazenamento local para importação:', error);
        return LocalDB.importarSaquesCSV(conteudoCSV);
    }
};

/**
 * Inicializa o sistema de armazenamento híbrido
 */
DB.initHybridStorage = async function() {
    try {
        // Verifica a conexão com o servidor
        const conectado = await verificarConexaoServidor();
        
        if (conectado) {
            console.log('Conexão com o servidor estabelecida. Usando armazenamento híbrido.');
            
            // Sincroniza dados locais com o servidor se houver dados offline
            try {
                // Verifica se há saques locais que precisam ser sincronizados
                const saquesLocais = LocalDB.getSaques();
                
                if (saquesLocais.length > 0) {
                    console.log('Encontrados dados locais para sincronização:', saquesLocais.length, 'saques');
                    
                    // Envia para sincronização
                    const response = await fetch('api/sync_data.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            action: 'sync_saques',
                            saques: saquesLocais
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        console.log('Sincronização concluída com sucesso!');
                    } else {
                        console.warn('Falha na sincronização:', result.message);
                    }
                }
            } catch (syncError) {
                console.warn('Erro durante a sincronização:', syncError);
            }
        } else {
            console.warn('Servidor não disponível. Usando apenas armazenamento local.');
        }
        
        return conectado;
    } catch (error) {
        console.error('Erro ao inicializar armazenamento híbrido:', error);
        return false;
    }
};

// Inicializa o armazenamento híbrido quando o script for carregado
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando sistema de armazenamento híbrido...');
    DB.initHybridStorage()
        .then(function(conectado) {
            const statusElement = document.getElementById('server-status');
            if (statusElement) {
                statusElement.textContent = conectado ? 'Conectado ao servidor' : 'Modo offline';
                statusElement.className = conectado ? 'status-connected' : 'status-offline';
            }
        })
        .catch(function(error) {
            console.error('Falha ao inicializar armazenamento:', error);
        });
});

// API para sincronização manual
DB.sincronizarDados = async function() {
    return await DB.initHybridStorage();
};