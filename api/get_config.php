<?php
/**
 * api/get_config.php
 * Obtém as configurações do sistema
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
    // Obtém todas as configurações
    $stmt = $pdo->query("SELECT chave, valor FROM config");
    $configRows = $stmt->fetchAll();
    
    // Converte para o formato esperado
    $config = [];
    foreach ($configRows as $row) {
        // Converte valores numéricos
        if (is_numeric($row['valor'])) {
            if (strpos($row['valor'], '.') !== false) {
                $config[$row['chave']] = (float)$row['valor'];
            } else {
                $config[$row['chave']] = (int)$row['valor'];
            }
        } else {
            $config[$row['chave']] = $row['valor'];
        }
    }
    
    // Valores padrão se não encontrados
    if (!isset($config['taxaSaque'])) {
        $config['taxaSaque'] = 2.50;
    }
    
    if (!isset($config['apiUrl'])) {
        $config['apiUrl'] = 'https://economia.awesomeapi.com.br/json/last/USD-BRL';
    }
    
    echo json_encode([
        'success' => true,
        'config' => $config
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao obter configurações: ' . $e->getMessage()
    ]);
}