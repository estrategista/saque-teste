<?php
/**
 * api/get_cotacao.php
 * Obtém a última cotação armazenada
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
    // Obtém a última cotação
    $stmt = $pdo->query("SELECT * FROM cotacao ORDER BY id DESC LIMIT 1");
    $cotacao = $stmt->fetch();
    
    if ($cotacao) {
        echo json_encode([
            'success' => true,
            'cotacao' => [
                'valor' => (float)$cotacao['valor'],
                'timestamp' => $cotacao['timestamp'],
                'manual' => (bool)$cotacao['manual']
            ]
        ]);
    } else {
        // Cotação padrão se não existir
        echo json_encode([
            'success' => true,
            'cotacao' => [
                'valor' => 5.37,
                'timestamp' => date('Y-m-d H:i:s'),
                'manual' => false
            ]
        ]);
    }
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao obter cotação: ' . $e->getMessage()
    ]);
}