<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\MergeOrderController;


Route::post('register', [AuthController::class, 'register']);
Route::get('roles',      [RoleController::class,     'role']);
Route::get('departments', [DepartmentController::class, 'department']);
Route::post('login',    [AuthController::class, 'login']);

// 1. Route xử lý khi bấm link (Phải đặt tên name chính xác)
Route::get('auth/email-login', [AuthController::class, 'loginViaEmail'])
    ->name('auth.email-login'); // Tên này dùng trong Service để tạo link



Route::middleware('auth:api')->group(function () {
    Route::post('logout', [AuthController::class, 'logout']);
    /* Categories */
    Route::apiResource('categories', CategoryController::class)->only(['index', 'store']);
    Route::put('/categories/{category}', [CategoryController::class, 'update']);
    Route::get('/categories/{id}', [CategoryController::class, 'show']);
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);
    Route::put('/categories/{category}/status', [CategoryController::class, 'updateStatus']);
    /* Products */
    Route::get('/products/search', [ProductController::class, 'search']);
    Route::get('products/stats', [ProductController::class, 'stats']);
    Route::get('products',  [ProductController::class, 'index']);
    Route::get('products/{id}', [ProductController::class, 'show']);
    Route::post('products', [ProductController::class, 'store']);
    Route::put('products/{id}',          [ProductController::class, 'update']);
    Route::put('products/{id}/status',   [ProductController::class, 'updateStatus']);
    /* Orders */
    Route::get('/suppliers', [SupplierController::class, 'index']);
    Route::get('order-statuses', [OrderController::class, 'getStatuses']);
    Route::prefix('orders')->controller(OrderController::class)->group(function () {
        Route::get('history', 'history');
        Route::get('search', 'search');
        Route::post('merge',         'merge');
        Route::delete('merge/{id}', 'unMerge');
        Route::get('stats', 'stats');
        Route::get('/',        'index');
        Route::post('/',       'store');
        Route::match(['put', 'patch'], '{order}', 'update');
        Route::delete('{order}', 'destroy');
        Route::post('check-merge', 'checkMergeAvailability');
        Route::get('ids',  'getAllIds');
        Route::get('{order}',  'show');
        Route::post('split', 'split');
        Route::post('import', 'importMultipleOrders');
    });
    Route::get('/merge-orders/{id}/export-pdf', [ExportController::class, 'exportMergeOrderPdf']);
    Route::post('/orders/export-zip', [ExportController::class, 'exportBatchZip']);
    Route::get('merge-orders/stats', [MergeOrderController::class, 'stats']);
    Route::get('/merge-orders/{id}', [MergeOrderController::class, 'show']);
    Route::put('merge-orders/{id}', [MergeOrderController::class, 'update']);
    Route::get('/merge-orders/items/{id}/distribution', [MergeOrderController::class, 'getDistribution']);
    Route::post('merge-orders/{id}/revert', [MergeOrderController::class, 'revert']);
    Route::get('merge-orders', [MergeOrderController::class, 'index']);
    Route::post('/export-merged-orders-multi-months', [ExportController::class, 'exportMergedOrdersMultipleMonths']);
    Route::post('/export-merged-orders-multi-years', [ExportController::class, 'exportMergedOrdersMultipleYears']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/mark-read', [NotificationController::class, 'markRead']);
    Route::post('/admin/send-reminders', [OrderController::class, 'sendReminders']);
});
