<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ApiPurchaseController;
use App\Http\Controllers\ApiPurchaseHeaderController;
use App\Http\Controllers\ApiPurchaseLineController;
use App\Http\Controllers\ApiCartController;
use App\Http\Controllers\ApiItemController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\OrderPurchasingController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\StatisticalController;
use App\Http\Controllers\ApiMergeHeaderController;
use App\Http\Controllers\ApiMergeLineController;
/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::group(['middleware' => 'api', 'prefix' => 'auth'], function($router){
    Route::get('/profile', [AuthController::class, 'profile'])->middleware('role:ADMINISTRATOR,LEADER,SALES');
    Route::post('/register', [AuthController::class, 'register'])->middleware('role:ADMINISTRATOR');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:25,1');
    Route::post('/logout', [AuthController::class, 'logout']);
});

Route::middleware(['auth:api', 'role:ADMINISTRATOR,SUPPLY'])->group(function () {
    Route::post('/statistical', [StatisticalController::class, 'getStatistical']);
    
    Route::post('/purchase-header/status-supply', [ApiPurchaseHeaderController::class, 'updateStatusBySupply']);
    Route::post('/purchase-header/supply', [OrderPurchasingController::class, 'purchaseHeaderBySupply']);
    
    Route::post('/purchase-line/detailall', [OrderPurchasingController::class, 'detailPurchaseSupply']);
    Route::post('/purchase-line/update-item', [ApiPurchaseLineController::class, 'editItem']);   
    Route::get('/purchase-line/merge/{id}', [ApiPurchaseLineController::class, 'getMerge']); 

    Route::post('/merge-line/insert', [ApiMergeLineController::class, 'insertlines']);  
    Route::delete('/merge-line/{id}', [ApiMergeLineController::class, 'destroy']);   

    Route::get('/merge-header/detail/{document}', [ApiMergeHeaderController::class, 'getDetailMerge']); 
    Route::post('/merge-header/approval', [ApiMergeHeaderController::class, 'approval']); 
});

Route::middleware(['auth:api', 'role:ADMINISTRATOR,LEADER,SUPPLY,SALES'])->group(function () {
    Route::get('/item/{id}', [ItemController::class, 'getItem']);
    Route::get('/industry', [ItemController::class, 'getIndustry']);
    
    Route::get('/status', [HomeController::class, 'getStatus']);
    Route::get('/departments', [HomeController::class, 'getDepartment']);
    Route::get('/getMenuByUser', [HomeController::class, 'getMenuByUser']);

    Route::post('/orderpurchasing/report', [OrderPurchasingController::class, 'reportStatisticsDetail']);
    Route::post('/orderpurchasing/top10', [OrderPurchasingController::class, 'reportStatisticsTop10']);

    Route::post('/purchase-header/update-status', [ApiPurchaseHeaderController::class, 'updateStatus']);
    Route::post('/purchase-line/update-quantity', [ApiPurchaseLineController::class, 'updateQuantity']);
    Route::post('/purchase-line/quantity', [ApiPurchaseLineController::class, 'updateMultipleQuantities']);
});

Route::middleware(['auth:api', 'role:ADMINISTRATOR,SALES'])->group(function () {
    Route::get('/orderpurchasing/maxdocument', [OrderPurchasingController::class, 'getMaxCode']);
    Route::post('/purchase-header/user', [OrderPurchasingController::class, 'getPurchaseByUser']);
    
    Route::post('/cart/import', [ApiCartController::class, 'import']);
    Route::post('/cart/store', [ApiCartController::class, 'store']);
    Route::post('/cart/insert', [ApiCartController::class, 'insertItemNoERP']);
    Route::post('/cart/update', [ApiCartController::class, 'updateCart']);
    Route::delete('/cart/{id}', [ApiCartController::class, 'destroy']);
    Route::get('/cart/list', [ApiCartController::class, 'getCartList']);
    
    // đặt hàng
    Route::post('/purchase-line/insertlines', [ApiPurchaseLineController::class, 'insertlines']);
    Route::post('/purchase-line/store', [ApiPurchaseLineController::class, 'store']);
    Route::delete('/purchase-line/{id}', [ApiPurchaseLineController::class, 'destroy']);
    Route::get('/purchase-header/change-purchase-header', [OrderPurchasingController::class, 'changePurchaseHeader']);
    
    Route::post('/item/store', [ApiItemController::class, 'store']);
    Route::get('/item/getall', [ApiItemController::class, 'getItems']);
    Route::post('/item/update', [ApiItemController::class, 'update']);
    Route::get('/item/bypo', [ApiItemController::class, 'getItemByPO']);

    Route::post('/purchase-line/detail', [OrderPurchasingController::class, 'detailPurchase']);
});

Route::middleware(['auth:api', 'role:ADMINISTRATOR,LEADER'])->group(function () {
    Route::post('/merge-header', [ApiMergeHeaderController::class, 'getMergeHeader']); 
    Route::post('/merge-header/update-status', [ApiMergeHeaderController::class, 'updateStatus']);

    Route::get('/merge-line/{document}', [ApiMergeLineController::class, 'detailMergeLine']);
});

Route::middleware(['auth:api', 'role:ADMINISTRATOR,LEADER,SUPPLY'])->group(function () {
    Route::post('/purchase-header/edit', [ApiPurchaseHeaderController::class, 'updateStatusNote']);
});

/* public chỉ cần đăng nhập là đc */
Route::middleware(['auth:api'])->group(function () {
    Route::get('/sendMail', [StatisticalController::class, 'sendMail']); 
});

Route::fallback(function(){
    return response()->json(['message' => 'Route not found.'], 404);
});