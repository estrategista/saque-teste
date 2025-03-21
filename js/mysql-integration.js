/**
 * mysql-integration.js - Integração do Sistema de Saques com MySQL
 * 
 * Este arquivo substitui o armazenamento local por um banco de dados MySQL
 * hospedado na Hostinger, usando PHP como camada de backend.
 */

const DBServer = {
    // URLs para os endpoints da API PHP
    API_URLS: {
        GET_SAQUES: 'api/get_saques.php',
        ADD_SAQUE: 'api/add_saque.php',
        DELETE_SAQUE: 'api/delete_saque.php',
        GET_CONFIG: 'api/get_config.php',
        SAVE_CONFIG: 'api/save_config.php',
        GET_COTACAO: 'api/get_cotacao.php',
        SAVE_COTACAO: 'api/save_cotacao.php',
        SYNC_DATA: 'api/sync_data.php'
    },
    
    /**
     * Inicializa a integração com o banco de dados MySQL
     */
    init: function() {
        console.log('Iniciando integração com MySQL...');
        
        // Mostra o indicador de status
        const dbStatus = document.getElementById('dbStatus');
        if (dbStatus) {
            dbStatus.style.display = 'block';
            dbStatus.style.backgroundColor = '#FFD700';
            dbStatus.textContent = 'Conectando ao banco de dados...';
        }
        
        // Verifica a conexão com o servidor
        this.testConnection()
            .then(success => {
                if (dbStatus) {
                    if (success) {
                        dbStatus.style.backgroundColor = '#34a853';
                        dbStatus.textContent = 'Conectado ao banco de dados';
                    } else {
                        dbStatus.style.backgroundColor = '#ea4335';
                        dbStatus.textContent = 'Erro de conexão com o banco';
                    }
                    
                    // Esconde o indicador após 5 segundos
                    setTimeout(() => {
                        dbStatus.style.display = 'none';
                    }, 5000);
                }
            });
    },
    
    /**
     * Testa a conexão com o servidor
     */
    testConnection: async function() {
        try {
            const response = await fetch('test_connection.php');
            const data = await response.json();
            
            if (data.success) {
                console.log('Conexão com o banco de dados estabelecida com sucesso!');
                showMessage('Conexão com o banco de dados estabelecida!', 'success');
                return true;
            } else {
                console.error('Erro ao conectar ao banco de dados:', data.message);
                showMessage('Erro ao conectar ao banco de dados: ' + data.message, 'error');
                return false;
            }
        } catch (error) {
            console.error('Erro ao testar conexão:', error);
            showMessage('Erro ao conectar ao servidor. O sistema funcionará em modo local.', 'warning');
            return false;
        }
    },
    
    /**
     * Obtém todos os saques do banco de dados
     * @returns {Promise<Array>} Lista de saques
     */
    getSaques: async function() {
        try {
            const response = await fetch(this.API_URLS.GET_SAQUES);
            const data = await response.json();
            
            if (data.success) {
                return data.saques;
            } else {
                console.error('Erro ao obter saques:', data.message);
                return [];
            }
        } catch (error) {
            console.error('Erro ao obter saques do servidor:', error);
            // Fallback para dados locais em caso de erro
            return DB.getSaques();
        }
    },
    
    /**
     * Adiciona um novo saque
     * @param {Object} saque - Dados do saque
     * @returns {Promise<Object>} Resultado da operação
     */
    adicionarSaque: async function(saque) {
        try {
            const response = await fetch(this.API_URLS.ADD_SAQUE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(saque)
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Armazena também localmente como fallback
                const saqueComId = {
                    ...saque,
                    id_interno: data.id_interno,
                    timestamp: data.timestamp || new Date().toISOString()
                };
                
                // Adiciona à lista local
                const saquesLocais = await originalDB.getSaques();
                saquesLocais.unshift(saqueComId);
                originalDB.setSaques(saquesLocais);
                
                return {
                    success: true,
                    id_interno: data.id_interno,
                    message: 'Saque registrado com sucesso!'
                };
            } else {
                console.error('Erro ao adicionar saque no servidor:', data.message);
                
                // Fallback: adiciona apenas localmente em caso de erro
                const idLocal = originalDB.adicionarSaque(saque);
                
                return {
                    success: true,
                    id_interno: idLocal,
                    message: 'Saque registrado apenas localmente. Sincronize posteriormente.'
                };
            }
        } catch (error) {
            console.error('Erro ao enviar saque para o servidor:', error);
            
            // Fallback: adiciona apenas localmente em caso de erro
            const idLocal = originalDB.adicionarSaque(saque);
            
            return {
                success: true,
                id_interno: idLocal,
                message: 'Saque registrado apenas localmente devido a um erro de conexão.'
            };
        }
    },
    
    /**
     * Remove um saque pelo ID
     * @param {string} id - ID do saque
     * @returns {Promise<boolean>} Sucesso da operação
     */
    removerSaque: async function(id) {
        try {
            const response = await fetch(this.API_URLS.DELETE_SAQUE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id_interno: id })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Remove também localmente
                originalDB.removerSaque(id);
                return true;
            } else {
                console.error('Erro ao remover saque do servidor:', data.message);
                return false;
            }
        } catch (error) {
            console.error('Erro ao enviar solicitação de remoção:', error);
            
            // Tenta remover apenas localmente
            return originalDB.removerSaque(id);
        }
    },
    
    /**
     * Obtém um saque específico pelo ID
     * @param {string} id - ID do saque
     * @returns {Promise<Object|null>} Saque encontrado ou null
     */
    getSaquePorId: async function(id) {
        try {
            const response = await fetch(`${this.API_URLS.GET_SAQUES}?id=${id}`);
            const data = await response.json();
            
            if (data.success && data.saques.length > 0) {
                return data.saques[0];
            } else {
                // Tenta obter localmente
                return originalDB.getSaquePorId(id);
            }
        } catch (error) {
            console.error('Erro ao obter saque por ID:', error);
            // Fallback para dados locais
            return originalDB.getSaquePorId(id);
        }
    },
    
    /**
     * Obtém as configurações do sistema
     * @returns {Promise<Object>} Configurações
     */
    getConfig: async function() {
        try {
            const response = await fetch(this.API_URLS.GET_CONFIG);
            const data = await response.json();
            
            if (data.success) {
                // Também atualiza localmente
                originalDB.setConfig(data.config);
                return data.config;
            } else {
                console.error('Erro ao obter configurações:', data.message);
                return originalDB.getConfig();
            }
        } catch (error) {
            console.error('Erro ao obter configurações do servidor:', error);
            // Fallback para dados locais
            return originalDB.getConfig();
        }
    },
    
    /**
     * Salva as configurações do sistema
     * @param {Object} config - Configurações
     * @returns {Promise<boolean>} Sucesso da operação
     */
    setConfig: async function(config) {
        try {
            const response = await fetch(this.API_URLS.SAVE_CONFIG, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });
            
            const data = await response.json();
            
            // Salva também localmente
            originalDB.setConfig(config);
            
            return data.success;
        } catch (error) {
            console.error('Erro ao salvar configurações no servidor:', error);
            
            // Salva apenas localmente
            originalDB.setConfig(config);
            return true;
        }
    },
    
    /**
     * Obtém a última cotação armazenada
     * @returns {Promise<Object>} Cotação
     */
    getUltimaCotacao: async function() {
        try {
            const response = await fetch(this.API_URLS.GET_COTACAO);
            const data = await response.json();
            
            if (data.success) {
                // Também atualiza localmente
                originalDB.setUltimaCotacao(data.cotacao);
                return data.cotacao;
            } else {
                console.error('Erro ao obter cotação:', data.message);
                return originalDB.getUltimaCotacao();
            }
        } catch (error) {
            console.error('Erro ao obter cotação do servidor:', error);
            // Fallback para dados locais
            return originalDB.getUltimaCotacao();
        }
    },
    
    /**
     * Salva a última cotação
     * @param {Object} cotacao - Objeto com valor e timestamp
     * @returns {Promise<boolean>} Sucesso da operação
     */
    setUltimaCotacao: async function(cotacao) {
        try {
            const response = await fetch(this.API_URLS.SAVE_COTACAO, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(cotacao)
            });
            
            const data = await response.json();
            
            // Salva também localmente
            originalDB.setUltimaCotacao(cotacao);
            
            return data.success;
        } catch (error) {
            console.error('Erro ao salvar cotação no servidor:', error);
            
            // Salva apenas localmente
            originalDB.setUltimaCotacao(cotacao);
            return true;
        }
    },
    
    /**
     * Sincroniza dados locais com o servidor
     * Útil em caso de operações offline
     */
    sincronizarDados: async function() {
        try {
            showMessage('Sincronizando dados com o servidor...', 'info');
            
            // Obtém saques locais
            const saquesLocais = originalDB.getSaques();
            const config = originalDB.getConfig();
            const cotacao = originalDB.getUltimaCotacao();
            
            // Envia para sincronização
            const response = await fetch(this.API_URLS.SYNC_DATA, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    saques: saquesLocais,
                    config: config,
                    cotacao: cotacao
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showMessage('Dados sincronizados com sucesso!', 'success');
                
                // Atualiza dados locais com os do servidor
                if (data.saques) {
                    originalDB.setSaques(data.saques);
                    // Se a função atualizarHistorico existir, chama-a para atualizar a UI
                    if (typeof atualizarHistorico === 'function') {
                        atualizarHistorico();
                    }
                }
                
                return true;
            } else {
                showMessage('Erro ao sincronizar: ' + data.message, 'error');
                return false;
            }
        } catch (error) {
            console.error('Erro durante sincronização:', error);
            showMessage('Erro ao sincronizar dados. Verifique sua conexão.', 'error');
            return false;
        }
    }
};

// Guarda uma cópia das funções originais antes de substituí-las
const originalDB = {
    getSaques: DB.getSaques,
    setSaques: DB.setSaques,
    adicionarSaque: DB.adicionarSaque,
    removerSaque: DB.removerSaque,
    getSaquePorId: DB.getSaquePorId,
    getConfig: DB.getConfig,
    setConfig: DB.setConfig,
    getUltimaCotacao: DB.getUltimaCotacao,
    setUltimaCotacao: DB.setUltimaCotacao
};

// Substitui as funções do DB original pelas funções do DBServer
DB.getSaques = async function() {
    return await DBServer.getSaques();
};

DB.adicionarSaque = async function(saque) {
    const resultado = await DBServer.adicionarSaque(saque);
    return resultado.id_interno;
};

DB.removerSaque = async function(id) {
    return await DBServer.removerSaque(id);
};

DB.getSaquePorId = async function(id) {
    return await DBServer.getSaquePorId(id);
};

DB.getConfig = async function() {
    return await DBServer.getConfig();
};

DB.setConfig = async function(config) {
    return await DBServer.setConfig(config);
};

DB.getUltimaCotacao = async function() {
    return await DBServer.getUltimaCotacao();
};

DB.setUltimaCotacao = async function(cotacao) {
    return await DBServer.setUltimaCotacao(cotacao);
};

// Inicializa a integração quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Inicia a integração com o banco de dados 
    setTimeout(() => {
        DBServer.init();
    }, 1000);
    
    // Adiciona botão de sincronização à interface
    const actionButtons = document.querySelector('.history-header .export-controls');
    if (actionButtons) {
        const syncBtn = document.createElement('button');
        syncBtn.className = 'sync-button';
        syncBtn.id = 'syncBtn';
        syncBtn.textContent = '🔄 Sincronizar';
        syncBtn.style.backgroundColor = '#4285f4';
        syncBtn.style.color = 'white';
        syncBtn.onclick = function() {
            DBServer.sincronizarDados();
        };
        
        actionButtons.prepend(syncBtn);
    }
});