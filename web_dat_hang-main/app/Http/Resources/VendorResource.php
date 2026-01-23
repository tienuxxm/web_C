<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class VendorResource extends JsonResource
{
    public function toArray($request)
    {
        // Mapping: Tên cột API mong muốn => Tên cột trong Database/Model
        return [
            'code'    => $this->No_,       // Frontend nhận 'code', DB lấy 'No_'
            'name'    => $this->Name,      // Frontend nhận 'name', DB lấy 'Name'
            'address' => $this->Address,   // Frontend nhận 'address', DB lấy 'Address'
            
            // Nếu muốn thêm logic format, ví dụ:
            // 'full_label' => $this->No_ . ' - ' . $this->Name, 
        ];
    }
}