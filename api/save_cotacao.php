<?php
/**
 * api/save_cotacao.php
 * Salva uma nova cotação
 */

// Habilita exibição de erros para depuração
error_reporting(E_ALL);
ini_set('display_errors', 1);

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

// Log para depuração
error_log('Iniciando save_cotacao.php');

// Obtém os dados enviados
$raw_input = file_get_contents('php://input');
error_log('Dados recebidos: ' . $raw_input);

$dados = json_decode($raw_input, true);

if (!$dados || !isset($dados['valor'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Dados inválidos',
        'received' => $raw_input
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
    $stmt = $pdo->prepare("INSERT INTO cotacao (valor, timestamp, `is_manual`) VALUES (?, ?, ?)");
    
    // Determina se é manual
    $is_manual = isset($dados['manual']) ? (int)$dados['manual'] : 0;
    
    // Define o timestamp
    $timestamp = isset($dados['timestamp']) ? $dados['timestamp'] : date('Y-m-d H:i:s');
    
    // Executa a inserção
    $result = $stmt->execute([$dados['valor'], $timestamp, $is_manual]);
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'message' => 'Cotação salva com sucesso!',
            'cotacao' => [
                'valor' => (float)$dados['valor'],
                'timestamp' => $timestamp,
                'manual' => (bool)$is_manual
            ]
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Falha ao salvar a cotação no banco de dados'
        ]);
    }
} catch (PDOException $e) {
    error_log('Erro PDO: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao salvar cotação: ' . $e->getMessage()
    ]);
}