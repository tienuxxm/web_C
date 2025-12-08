<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Models\Report;
use App\Models\Order;
use App\Policies\OrderPolicy;
use App\Policies\ReportPolicy;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap services.
     */
    protected $policies = [
            Order::class => OrderPolicy::class,
            Report::class => ReportPolicy::class,
            // Thêm các model và policy khác tại đây nếu cần
        ];

    public function boot(): void
    {

    }
}

