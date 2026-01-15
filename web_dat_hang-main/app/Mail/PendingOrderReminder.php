<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PendingOrderReminder extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

   public $user;
    public $pendingOrders;
    public $pendingMergeOrders;
    public $token; 

    public function __construct($user, $pendingOrders, $pendingMergeOrders, $token)
    {
        $this->user = $user;
        $this->pendingOrders = $pendingOrders ?? collect([]);
        $this->pendingMergeOrders = $pendingMergeOrders ?? collect([]);
        $this->token = $token; 
    }
   
    public function build()
    {
        return $this->subject('🔔 Nhắc nhở: Bạn có đơn hàng chưa xử lý')
                    ->view('mail.reminder_pending');
    }

    public function attachments(): array
    {
        return [];
    }
}
