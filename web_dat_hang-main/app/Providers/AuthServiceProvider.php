<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Models\Report;
use App\Models\Order;
use App\Models\MergeOrder;
use App\Policies\OrderPolicy;
use App\Policies\ReportPolicy;
use App\Policies\MergeOrderPolicy;

class AuthServiceProvider extends ServiceProvider
{

    public function register(): void
    {
    
    }
    protected $policies = [
            Order::class => OrderPolicy::class,
            Report::class => ReportPolicy::class,
            MergeOrder::class => MergeOrderPolicy::class,
        ];
    public function boot(): void
    {

    }
}

