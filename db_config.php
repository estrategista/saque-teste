<?php
/**
 * db_config.php
 * Configurações de conexão com o banco de dados MySQL na Hostinger
 */

// Configurações do banco de dados
define('DB_HOST', 'localhost'); // Geralmente 'localhost' na Hostinger
define('DB_NAME', 'u763186829_db'); // Nome do seu banco de dados
define('DB_USER', 'u763186829_user'); // Nome de usuário do MySQL
define('DB_PASS', 'a9Tg^nL#'); // Senha do MySQL

// Função para conectar ao banco de dados
function conectarBD() {
    try {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]
        );
        return $pdo;
    } catch (PDOException $e) {
        // Log do erro
        error_log('Erro na conexão com o banco de dados: ' . $e->getMessage());
        return null;
    }
}

/**
 * test_connection.php
 * Testa a conexão com o banco de dados MySQL
 */
<?php
// Inclui o arquivo de configuração
require_once 'db_config.php';

// Configura cabeçalhos para resposta JSON
header('Content-Type: application/json');

// Tenta conectar ao banco de dados
$pdo = conectarBD();

if ($pdo) {
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao salvar configurações: ' . $e->getMessage()
    ]);
}

/**
 * api/get_cotacao.php
 * Obtém a última cotação armazenada
 */
<?php
// Inclui o arquivo de configuração
require_once '../db_config.php';

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

/**
 * api/save_cotacao.php
 * Salva uma nova cotação
 */
<?php
// Inclui o arquivo de configuração
require_once '../db_config.php';

// Configura cabeçalhos para resposta JSON
header('Content-Type: application/json');

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
        'message' => 'Cotação salva com sucesso!'
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao salvar cotação: ' . $e->getMessage()
    ]);
}

/**
 * api/sync_data.php
 * Sincroniza dados locais com o servidor
 */
<?php
// Inclui o arquivo de configuração
require_once '../db_config.php';

// Configura cabeçalhos para resposta JSON
header('Content-Type: application/json');

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
    // Inicia uma transação
    $pdo->beginTransaction();
    
    // 1. Sincroniza configurações
    if (isset($dados['config'])) {
        foreach ($dados['config'] as $chave => $valor) {
            // Verifica se a configuração já existe
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM config WHERE chave = ?");
            $stmt->execute([$chave]);
            $exists = $stmt->fetchColumn() > 0;
            
            if ($exists) {
                // Atualiza
                $stmt = $pdo->prepare("UPDATE config SET valor = ? WHERE chave = ?");
                $stmt->execute([$valor, $chave]);
            } else {
                // Insere
                $stmt = $pdo->prepare("INSERT INTO config (chave, valor) VALUES (?, ?)");
                $stmt->execute([$chave, $valor]);
            }
        }
    }
    
    // 2. Sincroniza cotação
    if (isset($dados['cotacao'])) {
        $cotacao = $dados['cotacao'];
        
        // Verifica se já existe uma cotação com o mesmo timestamp
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM cotacao WHERE timestamp = ?");
        $stmt->execute([$cotacao['timestamp']]);
        $exists = $stmt->fetchColumn() > 0;
        
        if (!$exists) {
            // Insere a nova cotação
            $manual = isset($cotacao['manual']) ? (int)$cotacao['manual'] : 0;
            $stmt = $pdo->prepare("INSERT INTO cotacao (valor, timestamp, manual) VALUES (?, ?, ?)");
            $stmt->execute([$cotacao['valor'], $cotacao['timestamp'], $manual]);
        }
    }
    
    // 3. Sincroniza saques
    if (isset($dados['saques']) && is_array($dados['saques'])) {
        foreach ($dados['saques'] as $saque) {
            // Verifica se o saque já existe (pelo id_interno)
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM saques WHERE id_interno = ?");
            $stmt->execute([$saque['id_interno']]);
            $exists = $stmt->fetchColumn() > 0;
            
            if (!$exists) {
                // Prepara o timestamp
                $timestamp = isset($saque['timestamp']) ? $saque['timestamp'] : date('Y-m-d H:i:s');
                
                // Insere o novo saque
                $stmt = $pdo->prepare("INSERT INTO saques (
                    id_interno, timestamp, nome, cpf, id_externo, banco, agencia, conta, pix,
                    valorUSD, cotacao, valorTotal, taxaSaque
                ) VALUES (
                    :id_interno, :timestamp, :nome, :cpf, :id_externo, :banco, :agencia, :conta, :pix,
                    :valorUSD, :cotacao, :valorTotal, :taxaSaque
                )");
                
                $stmt->execute([
                    'id_interno' => $saque['id_interno'],
                    'timestamp' => $timestamp,
                    'nome' => $saque['nome'] ?? '',
                    'cpf' => $saque['cpf'] ?? '',
                    'id_externo' => $saque['id'] ?? '',
                    'banco' => $saque['banco'] ?? '',
                    'agencia' => $saque['agencia'] ?? '',
                    'conta' => $saque['conta'] ?? '',
                    'pix' => $saque['pix'] ?? '',
                    'valorUSD' => $saque['valorUSD'] ?? 0,
                    'cotacao' => $saque['cotacao'] ?? 0,
                    'valorTotal' => $saque['valorTotal'] ?? 0,
                    'taxaSaque' => $saque['taxaSaque'] ?? 0,
                ]);
            }
        }
    }
    
    // Confirma a transação
    $pdo->commit();
    
    // Retorna todos os saques após a sincronização
    $stmt = $pdo->query("SELECT * FROM saques ORDER BY timestamp DESC");
    $saques = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true,
        'message' => 'Dados sincronizados com sucesso!',
        'saques' => $saques
    ]);
} catch (PDOException $e) {
    // Reverte a transação em caso de erro
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao sincronizar dados: ' . $e->getMessage()
    ]);
} true,
        'message' => 'Conexão com o banco de dados estabelecida com sucesso!'
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Não foi possível conectar ao banco de dados.'
    ]);
}

/**
 * setup_database.php
 * Script para criar as tabelas necessárias no banco de dados
 */
<?php
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
        manual TINYINT(1) DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
    
    $pdo->exec($sql);
    
    // Insere configurações padrão
    $sql = "INSERT IGNORE INTO config (chave, valor) VALUES
        ('taxaSaque', '2.50'),
        ('apiUrl', 'https://economia.awesomeapi.com.br/json/last/USD-BRL');";
    
    $pdo->exec($sql);
    
    // Insere cotação padrão se não existir
    $sql = "INSERT INTO cotacao (valor, timestamp) 
            SELECT 5.37, NOW() 
            FROM dual 
            WHERE NOT EXISTS (SELECT 1 FROM cotacao LIMIT 1);";
    
    $pdo->exec($sql);
    
    echo json_encode([
        'success' => true,
        'message' => 'Banco de dados configurado com sucesso!'
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao configurar banco de dados: ' . $e->getMessage()
    ]);
}

/**
 * api/get_saques.php
 * Obtém todos os saques ou um saque específico
 */
<?php
// Inclui o arquivo de configuração
require_once '../db_config.php';

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
    // Verifica se foi solicitado um ID específico
    if (isset($_GET['id'])) {
        $id = $_GET['id'];
        $stmt = $pdo->prepare("SELECT * FROM saques WHERE id_interno = ?");
        $stmt->execute([$id]);
        $saques = $stmt->fetchAll();
    } else {
        // Obtém todos os saques, ordenados pelo mais recente
        $stmt = $pdo->query("SELECT * FROM saques ORDER BY timestamp DESC");
        $saques = $stmt->fetchAll();
    }
    
    echo json_encode([
        'success' => true,
        'saques' => $saques
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao obter saques: ' . $e->getMessage()
    ]);
}

/**
 * api/add_saque.php
 * Adiciona um novo saque ao banco de dados
 */
<?php
// Inclui o arquivo de configuração
require_once '../db_config.php';

// Configura cabeçalhos para resposta JSON
header('Content-Type: application/json');

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

/**
 * api/delete_saque.php
 * Remove um saque do banco de dados
 */
<?php
// Inclui o arquivo de configuração
require_once '../db_config.php';

// Configura cabeçalhos para resposta JSON
header('Content-Type: application/json');

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

if (!$dados || !isset($dados['id_interno'])) {
    echo json_encode([
        'success' => false,
        'message' => 'ID não fornecido'
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
    // Remove o saque
    $stmt = $pdo->prepare("DELETE FROM saques WHERE id_interno = ?");
    $stmt->execute([$dados['id_interno']]);
    
    if ($stmt->rowCount() > 0) {
        echo json_encode([
            'success' => true,
            'message' => 'Saque removido com sucesso!'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Saque não encontrado'
        ]);
    }
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao remover saque: ' . $e->getMessage()
    ]);
}

/**
 * api/get_config.php
 * Obtém as configurações do sistema
 */
<?php
// Inclui o arquivo de configuração
require_once '../db_config.php';

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

/**
 * api/save_config.php
 * Salva as configurações do sistema
 */
<?php
// Inclui o arquivo de configuração
require_once '../db_config.php';

// Configura cabeçalhos para resposta JSON
header('Content-Type: application/json');

// Verifica se a requisição é POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'success' => false,
        'message' => 'Método não permitido'
    ]);
    exit;
}

// Obtém os dados enviados
$config = json_decode(file_get_contents('php://input'), true);

if (!$config) {
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
    // Inicia uma transação
    $pdo->beginTransaction();
    
    // Para cada configuração
    foreach ($config as $chave => $valor) {
        // Verifica se a configuração já existe
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM config WHERE chave = ?");
        $stmt->execute([$chave]);
        $exists = $stmt->fetchColumn() > 0;
        
        if ($exists) {
            // Atualiza
            $stmt = $pdo->prepare("UPDATE config SET valor = ? WHERE chave = ?");
            $stmt->execute([$valor, $chave]);
        } else {
            // Insere
            $stmt = $pdo->prepare("INSERT INTO config (chave, valor) VALUES (?, ?)");
            $stmt->execute([$chave, $valor]);
        }
    }
    
    // Confirma a transação
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'Configurações salvas com sucesso!'
    ]);
} catch (PDOException $e) {
    // Reverte a transação em caso de erro
    $pdo->rollBack();
    
    echo json_encode([
        'success' =>