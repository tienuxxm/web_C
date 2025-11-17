<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\ApiLog;
use Auth;

class LogApiRequest
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);
        // Lấy user_id từ JWT
        $userId = Auth::guard('api')->check() ? Auth::guard('api')->id() : null;
        
        ApiLog::create([
            'user_id' => $userId,
            'method' => $request->method(),
            'url' => $request->fullUrl(),
            'request_body' => json_encode($request->all()),
            'response_body' => $response->getContent(),
            'status_code' => $response->getStatusCode(),
            'ip_address' => $request->ip(),
        ]);

        // ApiLog::create([
        //     'user_id' => $userId,
        //     'method' => $request->method(),
        //     'url' => $request->fullUrl(),
        //     'request_body' => json_encode($request->all()),
        //     'response_body' => $response->getContent(),
        //     'status_code' => $response->getStatusCode(),
        //     'ip_address' => $request->ip(),
        // ]);

        return $response;
    }
}
