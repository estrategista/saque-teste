<?php
/**
 * db_config.php - Configurações de conexão com o banco de dados MySQL
 */

// Configurações do banco de dados
define('DB_HOST', 'localhost'); 
define('DB_NAME', 'sistema_saques'); 
define('DB_USER', 'dev_user'); // ou o usuário que você criou
define('DB_PASS', '3721Arthur6425*'); // sua senha

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
?>