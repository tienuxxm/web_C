<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
Schedule::command('mail:remind-pending')
    ->dailyAt('08:00')
    ->timezone('Asia/Ho_Chi_Minh');
Schedule::command('mail:remind-pending')
    ->dailyAt('16:41')
    ->timezone('Asia/Ho_Chi_Minh');