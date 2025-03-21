<?php
/**
 * api/get_saque.php
 * Obtém um saque específico pelo ID
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

// Verifica se o ID foi fornecido
if (!isset($_GET['id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'ID não fornecido'
    ]);
    exit;
}

$id = $_GET['id'];

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
    // Busca o saque pelo ID interno
    $stmt = $pdo->prepare("SELECT * FROM saques WHERE id_interno = ?");
    $stmt->execute([$id]);
    $saque = $stmt->fetch();
    
    if (!$saque) {
        echo json_encode([
            'success' => false,
            'message' => 'Saque não encontrado'
        ]);
        exit;
    }
    
    echo json_encode([
        'success' => true,
        'saque' => $saque
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao buscar saque: ' . $e->getMessage()
    ]);
}
?>