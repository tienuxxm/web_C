<?php

use Illuminate\Support\Facades\Route;

Route::any('/{any}', function () {
    return file_get_contents(public_path('index.html'));
})->where('any', '.*');
