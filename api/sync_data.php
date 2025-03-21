<?php
/**
 * api/sync_data.php
 * Sincroniza dados locais com o servidor
 */

// Inclui o arquivo de configuração
require_once '../db_config.php';

// Configura cabeçalhos para resposta JSON
header('Content-Type: application/json');

// Permite requisições de origens diferentes (CORS)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Responder preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Verifica se a requisição é POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'success' => false,
        'message' => 'Método não permitido'
    ]);
    exit;
}

// Obtém os dados enviados
$dados = json_decode(file_get_contents('php://input'), true);

if (!$dados) {
    echo json_encode([
        'success' => false,
        'message' => 'Dados inválidos'
    ]);
    exit;
}

// Tenta conectar ao banco de dados
$pdo = conectarBD();

if (!$pdo) {
    echo json_encode([
        'success' => false,
        'message' => 'Não foi possível conectar ao banco de dados.'
    ]);
    exit;
}

try {
    // Inicia uma transação
    $pdo->beginTransaction();
    
    // 1. Sincroniza configurações
    if (isset($dados['config'])) {
        foreach ($dados['config'] as $chave => $valor) {
            // Verifica se a configuração já existe
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM config WHERE chave = ?");
            $stmt->execute([$chave]);
            $exists = $stmt->fetchColumn() > 0;
            
            if ($exists) {
                // Atualiza
                $stmt = $pdo->prepare("UPDATE config SET valor = ? WHERE chave = ?");
                $stmt->execute([$valor, $chave]);
            } else {
                // Insere
                $stmt = $pdo->prepare("INSERT INTO config (chave, valor) VALUES (?, ?)");
                $stmt->execute([$chave, $valor]);
            }
        }
    }
    
    // 2. Sincroniza cotação
    if (isset($dados['cotacao'])) {
        $cotacao = $dados['cotacao'];
        
        // Verifica se já existe uma cotação com o mesmo timestamp
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM cotacao WHERE timestamp = ?");
        $stmt->execute([$cotacao['timestamp']]);
        $exists = $stmt->fetchColumn() > 0;
        
        if (!$exists) {
            // Insere a nova cotação
            $manual = isset($cotacao['manual']) ? (int)$cotacao['manual'] : 0;
            $stmt = $pdo->prepare("INSERT INTO cotacao (valor, timestamp, manual) VALUES (?, ?, ?)");
            $stmt->execute([$cotacao['valor'], $cotacao['timestamp'], $manual]);
        }
    }
    
    // 3. Sincroniza saques
    if (isset($dados['saques']) && is_array($dados['saques'])) {
        foreach ($dados['saques'] as $saque) {
            // Verifica se o saque já existe (pelo id_interno)
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM saques WHERE id_interno = ?");
            $stmt->execute([$saque['id_interno']]);
            $exists = $stmt->fetchColumn() > 0;
            
            if (!$exists) {
                // Prepara o timestamp
                $timestamp = isset($saque['timestamp']) ? $saque['timestamp'] : date('Y-m-d H:i:s');
                
                // Insere o novo saque
                $stmt = $pdo->prepare("INSERT INTO saques (
                    id_interno, timestamp, nome, cpf, id_externo, banco, agencia, conta, pix,
                    valorUSD, cotacao, valorTotal, taxaSaque
                ) VALUES (
                    :id_interno, :timestamp, :nome, :cpf, :id_externo, :banco, :agencia, :conta, :pix,
                    :valorUSD, :cotacao, :valorTotal, :taxaSaque
                )");
                
                $stmt->execute([
                    'id_interno' => $saque['id_interno'],
                    'timestamp' => $timestamp,
                    'nome' => $saque['nome'] ?? '',
                    'cpf' => $saque['cpf'] ?? '',
                    'id_externo' => $saque['id'] ?? '',
                    'banco' => $saque['banco'] ?? '',
                    'agencia' => $saque['agencia'] ?? '',
                    'conta' => $saque['conta'] ?? '',
                    'pix' => $saque['pix'] ?? '',
                    'valorUSD' => $saque['valorUSD'] ?? 0,
                    'cotacao' => $saque['cotacao'] ?? 0,
                    'valorTotal' => $saque['valorTotal'] ?? 0,
                    'taxaSaque' => $saque['taxaSaque'] ?? 0,
                ]);
            }
        }
    }
    
    // Confirma a transação
    $pdo->commit();
    
    // Retorna todos os saques após a sincronização
    $stmt = $pdo->query("SELECT * FROM saques ORDER BY timestamp DESC");
    $saques = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'message' => 'Dados sincronizados com sucesso!',
        'saques' => $saques
    ]);
} catch (PDOException $e) {
    // Reverte a transação em caso de erro
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao sincronizar dados: ' . $e->getMessage()
    ]);
}