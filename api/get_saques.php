<?php
/**
 * api/get_saques.php
 * Obtém todos os saques ou um saque específico
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
    // Verifica se foi solicitado um ID específico
    if (isset($_GET['id'])) {
        $id = $_GET['id'];
        $stmt = $pdo->prepare("SELECT * FROM saques WHERE id_interno = ?");
        $stmt->execute([$id]);
        $saques = $stmt->fetch();
        
        if (!$saques) {
            echo json_encode([
                'success' => false,
                'message' => 'Saque não encontrado'
            ]);
            exit;
        }
        
        echo json_encode([
            'success' => true,
            'saques' => [$saques] // Retorna como array para manter consistência
        ]);
    } else {
        // Obtém todos os saques, ordenados pelo mais recente
        $stmt = $pdo->query("SELECT * FROM saques ORDER BY timestamp DESC");
        $saques = $stmt->fetchAll();
        
        echo json_encode([
            'success' => true,
            'saques' => $saques
        ]);
    }
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao obter saques: ' . $e->getMessage()
    ]);
}