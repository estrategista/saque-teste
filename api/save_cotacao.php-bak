<?php
/**
 * api/save_cotacao.php
 * Salva uma nova cotação
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

if (!$dados || !isset($dados['valor'])) {
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
    // Prepara a inserção
    $stmt = $pdo->prepare("INSERT INTO cotacao (valor, timestamp, manual) VALUES (?, ?, ?)");
    
    // Determina se é manual
    $manual = isset($dados['manual']) ? (int)$dados['manual'] : 0;
    
    // Define o timestamp
    $timestamp = isset($dados['timestamp']) ? $dados['timestamp'] : date('Y-m-d H:i:s');
    
    // Executa a inserção
    $stmt->execute([$dados['valor'], $timestamp, $manual]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Cotação salva com sucesso!',
        'cotacao' => [
            'valor' => (float)$dados['valor'],
            'timestamp' => $timestamp,
            'manual' => (bool)$manual
        ]
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao salvar cotação: ' . $e->getMessage()
    ]);
}