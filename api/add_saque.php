<?php
/**
 * api/add_saque.php
 * Adiciona um novo saque ao banco de dados
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
    // Gera um ID interno único
    $id_interno = 'saque_' . time() . '_' . rand(1000, 9999);
    $timestamp = date('Y-m-d H:i:s');
    
    // Prepara a inserção no banco de dados
    $stmt = $pdo->prepare("INSERT INTO saques (
        id_interno, timestamp, nome, cpf, id_externo, banco, agencia, conta, pix,
        valorUSD, cotacao, valorTotal, taxaSaque
    ) VALUES (
        :id_interno, :timestamp, :nome, :cpf, :id_externo, :banco, :agencia, :conta, :pix,
        :valorUSD, :cotacao, :valorTotal, :taxaSaque
    )");
    
    // Executa a inserção
    $stmt->execute([
        'id_interno' => $id_interno,
        'timestamp' => $timestamp,
        'nome' => $dados['nome'] ?? '',
        'cpf' => $dados['cpf'] ?? '',
        'id_externo' => $dados['id'] ?? '',
        'banco' => $dados['banco'] ?? '',
        'agencia' => $dados['agencia'] ?? '',
        'conta' => $dados['conta'] ?? '',
        'pix' => $dados['pix'] ?? '',
        'valorUSD' => $dados['valorUSD'] ?? 0,
        'cotacao' => $dados['cotacao'] ?? 0,
        'valorTotal' => $dados['valorTotal'] ?? 0,
        'taxaSaque' => $dados['taxaSaque'] ?? 0,
    ]);
    
    echo json_encode([
        'success' => true,
        'id_interno' => $id_interno,
        'timestamp' => $timestamp,
        'message' => 'Saque registrado com sucesso!'
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao registrar saque: ' . $e->getMessage()
    ]);
}