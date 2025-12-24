<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PendingOrderReminder extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $user;
    public $orders;
    public $mergeOrders;

    public function __construct($user,$orders,$mergeOrders=[])
    {
        $this->user = $user;
        $this->orders = $orders;
        $this->mergeOrders = $mergeOrders;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Pending Order Reminder',
        );
    }

    public function build()
    {
        return $this->subject('🔔 Nhắc nhở: Bạn có đơn hàng chưa xử lý')
                    ->view('emails.reminder_pending');
    }
    public function content(): Content
    {
        return new Content(
            view: 'mail.reminder_pending',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
