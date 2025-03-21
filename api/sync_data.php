<?php
/**
 * api/sync_data.php
 * Sincroniza dados entre o armazenamento local e o banco de dados
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

// Obtém os dados enviados
$raw_input = file_get_contents('php://input');
$dados = json_decode($raw_input, true);

if (!$dados || !isset($dados['action'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Dados inválidos ou ação não especificada',
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

// Processar a ação solicitada
$action = $dados['action'];

switch ($action) {
    case 'sync_saques':
        syncSaques($pdo, $dados);
        break;
    
    case 'set_saques':
        setSaques($pdo, $dados);
        break;
    
    default:
        echo json_encode([
            'success' => false,
            'message' => 'Ação desconhecida: ' . $action
        ]);
}

/**
 * Sincroniza saques do cliente com o servidor
 */
function syncSaques($pdo, $dados) {
    if (!isset($dados['saques']) || !is_array($dados['saques'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Dados de saques não fornecidos ou inválidos'
        ]);
        return;
    }
    
    $saques = $dados['saques'];
    $processados = 0;
    $erros = 0;
    
    try {
        // Inicia uma transação para garantir a integridade
        $pdo->beginTransaction();
        
        foreach ($saques as $saque) {
            // Verifica se o saque já existe no banco
            $stmt = $pdo->prepare("SELECT id FROM saques WHERE id_interno = ?");
            $stmt->execute([$saque['id_interno']]);
            $existente = $stmt->fetch();
            
            if ($existente) {
                // Saque já existe, atualiza
                $stmt = $pdo->prepare("UPDATE saques SET 
                    nome = ?,
                    cpf = ?,
                    id_externo = ?,
                    banco = ?,
                    agencia = ?,
                    conta = ?,
                    pix = ?,
                    valorUSD = ?,
                    cotacao = ?,
                    valorTotal = ?,
                    taxaSaque = ?
                WHERE id_interno = ?");
                
                $stmt->execute([
                    $saque['nome'] ?? '',
                    $saque['cpf'] ?? '',
                    $saque['id'] ?? '',
                    $saque['banco'] ?? '',
                    $saque['agencia'] ?? '',
                    $saque['conta'] ?? '',
                    $saque['pix'] ?? '',
                    $saque['valorUSD'] ?? 0,
                    $saque['cotacao'] ?? 0,
                    $saque['valorTotal'] ?? 0,
                    $saque['taxaSaque'] ?? 0,
                    $saque['id_interno']
                ]);
            } else {
                // Insere novo saque
                $stmt = $pdo->prepare("INSERT INTO saques (
                    id_interno,
                    timestamp,
                    nome,
                    cpf,
                    id_externo,
                    banco,
                    agencia,
                    conta,
                    pix,
                    valorUSD,
                    cotacao,
                    valorTotal,
                    taxaSaque
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                
                $timestamp = isset($saque['timestamp']) ? $saque['timestamp'] : date('Y-m-d H:i:s');
                
                $stmt->execute([
                    $saque['id_interno'],
                    $timestamp,
                    $saque['nome'] ?? '',
                    $saque['cpf'] ?? '',
                    $saque['id'] ?? '',
                    $saque['banco'] ?? '',
                    $saque['agencia'] ?? '',
                    $saque['conta'] ?? '',
                    $saque['pix'] ?? '',
                    $saque['valorUSD'] ?? 0,
                    $saque['cotacao'] ?? 0,
                    $saque['valorTotal'] ?? 0,
                    $saque['taxaSaque'] ?? 0
                ]);
            }
            
            $processados++;
        }
        
        // Comita a transação
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Sincronização concluída com sucesso',
            'stats' => [
                'processados' => $processados,
                'erros' => $erros
            ]
        ]);
    } catch (PDOException $e) {
        // Reverte a transação em caso de erro
        $pdo->rollBack();
        
        echo json_encode([
            'success' => false,
            'message' => 'Erro durante a sincronização: ' . $e->getMessage(),
            'stats' => [
                'processados' => $processados,
                'erros' => $erros + 1
            ]
        ]);
    }
}

/**
 * Define a lista completa de saques (substitui a atual)
 */
function setSaques($pdo, $dados) {
    if (!isset($dados['saques']) || !is_array($dados['saques'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Dados de saques não fornecidos ou inválidos'
        ]);
        return;
    }
    
    $saques = $dados['saques'];
    try {
        // Inicia uma transação para garantir a integridade
        $pdo->beginTransaction();
        
        // Limpa a tabela atual (opcional, pode ser comentado se preferir manter histórico)
        // $pdo->exec("TRUNCATE TABLE saques");
        
        $processados = 0;
        
        foreach ($saques as $saque) {
            // Verifica se o saque já existe pelo id_interno
            $stmt = $pdo->prepare("SELECT id FROM saques WHERE id_interno = ?");
            $stmt->execute([$saque['id_interno']]);
            $existente = $stmt->fetch();
            
            if ($existente) {
                // Atualiza o saque existente
                $stmt = $pdo->prepare("UPDATE saques SET 
                    timestamp = ?,
                    nome = ?,
                    cpf = ?,
                    id_externo = ?,
                    banco = ?,
                    agencia = ?,
                    conta = ?,
                    pix = ?,
                    valorUSD = ?,
                    cotacao = ?,
                    valorTotal = ?,
                    taxaSaque = ?
                WHERE id_interno = ?");
                
                $timestamp = isset($saque['timestamp']) ? $saque['timestamp'] : date('Y-m-d H:i:s');
                
                $stmt->execute([
                    $timestamp,
                    $saque['nome'] ?? '',
                    $saque['cpf'] ?? '',
                    $saque['id'] ?? $saque['id_externo'] ?? '',
                    $saque['banco'] ?? '',
                    $saque['agencia'] ?? '',
                    $saque['conta'] ?? '',
                    $saque['pix'] ?? '',
                    $saque['valorUSD'] ?? 0,
                    $saque['cotacao'] ?? 0,
                    $saque['valorTotal'] ?? 0,
                    $saque['taxaSaque'] ?? 0,
                    $saque['id_interno']
                ]);
            } else {
                // Insere novo saque
                $stmt = $pdo->prepare("INSERT INTO saques (
                    id_interno,
                    timestamp,
                    nome,
                    cpf,
                    id_externo,
                    banco,
                    agencia,
                    conta,
                    pix,
                    valorUSD,
                    cotacao,
                    valorTotal,
                    taxaSaque
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                
                $timestamp = isset($saque['timestamp']) ? $saque['timestamp'] : date('Y-m-d H:i:s');
                
                $stmt->execute([
                    $saque['id_interno'],
                    $timestamp,
                    $saque['nome'] ?? '',
                    $saque['cpf'] ?? '',
                    $saque['id'] ?? $saque['id_externo'] ?? '',
                    $saque['banco'] ?? '',
                    $saque['agencia'] ?? '',
                    $saque['conta'] ?? '',
                    $saque['pix'] ?? '',
                    $saque['valorUSD'] ?? 0,
                    $saque['cotacao'] ?? 0,
                    $saque['valorTotal'] ?? 0,
                    $saque['taxaSaque'] ?? 0
                ]);
            }
            
            $processados++;
        }
        
        // Comita a transação
        $pdo->commit();
        
        // Obtém a lista completa atualizada para retornar ao cliente
        $stmt = $pdo->query("SELECT * FROM saques ORDER BY timestamp DESC");
        $saquesAtualizados = $stmt->fetchAll();
        
        echo json_encode([
            'success' => true,
            'message' => 'Saques atualizados com sucesso',
            'stats' => [
                'processados' => $processados
            ],
            'saques' => $saquesAtualizados
        ]);
    } catch (PDOException $e) {
        // Reverte a transação em caso de erro
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        
        echo json_encode([
            'success' => false,
            'message' => 'Erro ao atualizar saques: ' . $e->getMessage()
        ]);
    }
}
?>