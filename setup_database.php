<?php
/**
 * setup_database.php
 * Script para criar as tabelas necessárias no banco de dados
 */

// Habilita exibição de erros para depuração
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Inclui o arquivo de configuração
require_once 'db_config.php';

// Configura cabeçalhos para resposta JSON
header('Content-Type: application/json');

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
    // Cria a tabela de saques
    $sql = "CREATE TABLE IF NOT EXISTS saques (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_interno VARCHAR(50) UNIQUE,
        timestamp DATETIME,
        nome VARCHAR(100),
        cpf VARCHAR(20),
        id_externo VARCHAR(50),
        banco VARCHAR(100),
        agencia VARCHAR(20),
        conta VARCHAR(30),
        pix VARCHAR(100),
        valorUSD DECIMAL(10,2),
        cotacao DECIMAL(10,4),
        valorTotal DECIMAL(10,2),
        taxaSaque DECIMAL(10,2)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
    
    $pdo->exec($sql);
    
    // Cria a tabela de configurações
    $sql = "CREATE TABLE IF NOT EXISTS config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chave VARCHAR(50) UNIQUE,
        valor TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
    
    $pdo->exec($sql);
    
    // Cria a tabela de cotação
    $sql = "CREATE TABLE IF NOT EXISTS cotacao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    valor DECIMAL(10,4),
    timestamp DATETIME,
    `manual` TINYINT(1) DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
    
    $pdo->exec($sql);
    
    // Insere configurações padrão
    $sql = "INSERT IGNORE INTO config (chave, valor) VALUES
        ('taxaSaque', '3,90'),
        ('apiUrl', 'https://economia.awesomeapi.com.br/json/last/USD-BRL');";
    
    $pdo->exec($sql);
    
    // Insere cotação padrão se não existir
    $sql = "INSERT INTO cotacao (valor, timestamp) 
            SELECT 5.50, NOW() 
            FROM dual 
            WHERE NOT EXISTS (SELECT 1 FROM cotacao LIMIT 1);";
    
    $pdo->exec($sql);
    
    echo json_encode([
        'success' => true,
        'message' => 'Banco de dados configurado com sucesso!',
        'details' => [
            'tables_created' => ['saques', 'config', 'cotacao'],
            'default_config' => [
                'taxaSaque' => '3.90',
                'apiUrl' => 'https://economia.awesomeapi.com.br/json/last/USD-BRL'
            ],
            'default_cotacao' => 5.50
        ]
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao configurar banco de dados: ' . $e->getMessage(),
        'error_details' => $e->getTraceAsString()
    ]);
}
?>