<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class CategoryResource extends JsonResource
{
    /**
     * "Dịch" dữ liệu từ CSDL (APIDB) sang định dạng JSON mà FE (React) mong muốn.
     */
    public function toArray($request)
    {
        // $this->resource là đối tượng lấy từ DB::table('view_Industry')
        $db_code = $this->Code;
        $db_description = $this->Description;
        $db_status = $this->Status;
        // Tên cột FE MONG MUỐN <--- Tên cột CSDL APIDB CUNG CẤP
        return [
            'id'          => $db_code,
            'name'        => $db_description,
            'description' => $db_description, 

            // === PHẦN SỬA LỖI 'toUpperCase' ===
            // Dịch 1 -> 'active', các trường hợp khác -> 'inactive'
            'status'      => $db_status == 1 ? 'active' : 'inactive', 

            // === Thêm các trường "giả" khác mà FE cần ===
            'prefix'      => 'CAT', // FE cần 'prefix'
            'user_emails' => $this->user_emails_list ?? [],    // FE cần 'user_emails'

            'parent_id'   => null,
            'created_at'  => null,
            'updated_at'  => null,
        ];
    }
}