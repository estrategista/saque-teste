<?php
/**
 * api/save_config.php
 * Salva as configurações do sistema
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
$config = json_decode(file_get_contents('php://input'), true);

if (!$config) {
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
    
    // Para cada configuração
    foreach ($config as $chave => $valor) {
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
    
    // Confirma a transação
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'Configurações salvas com sucesso!'
    ]);
} catch (PDOException $e) {
    // Reverte a transação em caso de erro
    $pdo->rollBack();
    
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao salvar configurações: ' . $e->getMessage()
    ]);
}