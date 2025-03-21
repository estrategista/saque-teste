<?php
/**
 * api/test_connection.php
 * Testa a conexão com o banco de dados MySQL
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

// Tenta conectar ao banco de dados
$pdo = conectarBD();

if (!$pdo) {
    echo json_encode([
        'success' => false,
        'message' => 'Não foi possível conectar ao banco de dados.'
    ]);
    exit;
}

// Se chegou até aqui, a conexão foi bem-sucedida
echo json_encode([
    'success' => true,
    'message' => 'Conexão com o banco de dados estabelecida com sucesso!',
    'timestamp' => date('Y-m-d H:i:s')
]);
?>