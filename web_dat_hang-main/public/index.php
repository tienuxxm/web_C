<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));
$folderName = '/web_dat_hang-main'; // Tên thư mục dự án của bạn (có dấu / ở đầu)

if (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], $folderName) === 0) {
    // Cắt bỏ tên thư mục khỏi REQUEST_URI
    $_SERVER['REQUEST_URI'] = substr($_SERVER['REQUEST_URI'], strlen($folderName));
    
    // Nếu cắt xong mà rỗng, thì gán về '/'
    if ($_SERVER['REQUEST_URI'] === '') {
        $_SERVER['REQUEST_URI'] = '/';
    }
}

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->handleRequest(Request::capture());
