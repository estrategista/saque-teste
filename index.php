<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sistema de Saques</title>
    <style>
        /* Estilos básicos */
        :root {
            --primary-color: #1a73e8;
            --secondary-color: #f1f3f4;
            --accent-color: #4285f4;
            --text-color: #202124;
            --error-color: #ea4335;
            --success-color: #34a853;
            --border-radius: 4px;
        }
        
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f8f9fa;
            color: var(--text-color);
        }
        
        .container {
            max-width: 1100px;
            margin: 20px auto;
            padding: 20px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
        }
        
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #ddd;
        }
        
        h1, h2, h3 {
            color: var(--primary-color);
            margin: 0;
        }
        
        .content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        @media (max-width: 768px) {
            .content {
                grid-template-columns: 1fr;
            }
        }
        
        button {
            cursor: pointer;
            padding: 8px 16px;
            border: none;
            border-radius: var(--border-radius);
        }
        
        .primary-button {
            background-color: var(--primary-color);
            color: white;
        }
        
        .secondary-button {
            background-color: var(--secondary-color);
            color: var(--text-color);
        }
        
        .success-button {
            background-color: var(--success-color);
            color: white;
        }
        
        input, textarea {
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: var(--border-radius);
            width: 100%;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        th {
            background-color: var(--secondary-color);
        }
        
        .modal {
            display: none;
            position: fixed;
            z-index: 1;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: rgba(0,0,0,0.4);
        }
        
        .modal-content {
            background-color: #fefefe;
            margin: 10% auto;
            padding: 20px;
            border: 1px solid #888;
            width: 50%;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .close {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }
        
        .close:hover {
            color: #000;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Sistema de Saques</h1>
            <div class="exchange-rate">
                <span>Cotação atual do dólar:</span>
                <span class="rate-value" id="dolarValue">R$ 5,37</span>
                <button class="update-button" id="updateRateBtn">Atualizar</button>
                <button class="manual-button" id="manualRateBtn">Cotação Manual</button>
            </div>
        </header>
        
        <div class="content">
            <div class="input-section">
                <h2>Solicitação de Saque</h2>
                <p>Cole abaixo o texto da solicitação de saque:</p>
                <textarea id="requestText" placeholder="Cole aqui a solicitação de saque..." style="width: 100%; height: 200px;"></textarea>
                <button class="primary-button" id="processRequestBtn">Processar Solicitação</button>
            </div>
            
            <div class="output-section">
                <h2>Resultado do Processamento</h2>
                <div id="messageArea"></div>
                
                <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="form-group">
                        <label for="nome">Nome:</label>
                        <input type="text" id="nome" readonly>
                    </div>
                    
                    <div class="form-group">
                        <label for="cpf">CPF:</label>
                        <input type="text" id="cpf" readonly>
                    </div>
                    
                    <div class="form-group">
                        <label for="id">ID:</label>
                        <input type="text" id="id" readonly>
                    </div>
                    
                    <div class="form-group">
                        <label for="valor">Valor (USD):</label>
                        <input type="text" id="valor" readonly>
                    </div>
                    
                    <div class="form-group">
                        <label for="banco">Banco:</label>
                        <input type="text" id="banco" readonly>
                    </div>
                    
                    <div class="form-group">
                        <label for="agencia">Agência:</label>
                        <input type="text" id="agencia" readonly>
                    </div>
                    
                    <div class="form-group">
                        <label for="conta">Conta:</label>
                        <input type="text" id="conta" readonly>
                    </div>
                    
                    <div class="form-group">
                        <label for="pix">PIX:</label>
                        <input type="text" id="pix" readonly>
                    </div>
                </div>
                
                <div class="info-box" style="background-color: #f1f3f4; padding: 15px; border-radius: 4px; margin: 15px 0;">
                    <div class="info-title" style="font-weight: bold;">Taxa de Saque:</div>
                    <div id="taxaValue">R$ 2,50</div>
                </div>
                
                <div class="info-box" style="background-color: #f1f3f4; padding: 15px; border-radius: 4px; margin: 15px 0;">
                    <div class="info-title" style="font-weight: bold;">Valor Total a Sacar (R$):</div>
                    <div class="calculated-value" style="font-size: 1.3em; font-weight: bold; color: var(--primary-color);" id="totalValue">--</div>
                </div>
                
                <div class="actions" style="display: flex; justify-content: space-between; margin-top: 20px;">
                    <button class="secondary-button" id="clearBtn">Limpar</button>
                    <button class="success-button" id="confirmBtn" disabled>Confirmar Saque</button>
                </div>
            </div>
        </div>
        
        <!-- Seção do Recibo -->
        <div id="reciboSection" style="display: none; margin-top: 30px;">
            <h3>Recibo de Saque</h3>
            <div class="info-box" style="background-color: #f9f9f9; border: 1px dashed #aaa; padding: 15px; border-radius: 4px;">
                <textarea id="reciboText" style="width: 100%; height: 200px; border: none; background: transparent; resize: none; font-family: 'Courier New', monospace;" readonly></textarea>
                <div style="text-align: center; margin-top: 10px;">
                    <button class="primary-button" id="copyReciboBtn">Copiar Recibo</button>
                    <button class="secondary-button" id="printReciboBtn">Imprimir</button>
                </div>
            </div>
        </div>
        
        <div class="history-section" style="margin-top: 30px;">
            <div class="history-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3>Histórico de Saques</h3>
                <div class="export-controls" style="display: flex; gap: 10px;">
                    <button class="export-button" id="exportBtn" style="background-color: #4285f4; color: white;">Exportar CSV</button>
                    <label for="importFile" class="import-button" style="background-color: #757575; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Importar CSV</label>
                    <input type="file" id="importFile" accept=".csv" style="display: none;">
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Nome</th>
                        <th>ID</th>
                        <th>Valor (USD)</th>
                        <th>Cotação</th>
                        <th>Valor Total (R$)</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody id="historyTable">
                    <!-- Os dados serão preenchidos via JavaScript -->
                </tbody>
            </table>
        </div>
        
        <!-- Modal para cotação manual -->
        <div id="rateModal" class="modal">
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Inserir Cotação Manualmente</h2>
                <div class="form-group">
                    <label for="manualRate">Cotação do Dólar (R$):</label>
                    <input type="number" id="manualRate" step="0.0001" min="0" placeholder="0.0000">
                </div>
                <button class="primary-button" id="saveRateBtn">Salvar</button>
            </div>
        </div>
        
        <!-- Modal para editar configurações -->
        <div id="settingsModal" class="modal">
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Configurações do Sistema</h2>
                <div class="form-group">
                    <label for="taxaSaqueConfig">Taxa de Saque (R$):</label>
                    <input type="number" id="taxaSaqueConfig" step="0.01" min="0" placeholder="0.00">
                </div>
                <div class="form-group">
                    <label for="apiUrlConfig">URL da API de Cotação:</label>
                    <input type="text" id="apiUrlConfig" placeholder="URL da API">
                </div>
                <button class="primary-button" id="saveConfigBtn">Salvar Configurações</button>
            </div>
        </div>
        
        <!-- Indicador de status de conexão com o banco de dados -->
        <div id="dbStatus" style="position: fixed; bottom: 10px; right: 10px; padding: 5px 10px; border-radius: 4px; font-size: 12px; display: none;">
            Conectando ao banco de dados...
        </div>
    </div>

    <!-- Scripts -->
    <script src="js/db.js"></script>
    <script src="js/api.js"></script>
    <script src="js/app.js"></script>
    <script src="js/mysql-integration.js"></script>
</body>
</html>