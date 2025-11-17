<?php

namespace App\Imports;

use App\Models\ApiCart;
use App\Models\ItemVariant;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Illuminate\Validation\ValidationException;
use Exception;
use Illuminate\Support\Carbon;

class ApiCartImport implements ToModel, WithHeadingRow, WithValidation
{
    protected $industry;

    public function __construct($industry)
    {
        $this->industry = $industry;
    }
    
    public function model(array $row)
    {
        try {
            // Skip rows that fail validation (they'll be handled in the withValidation)
            // if (!isset($row['itemcode']) || !isset($row['variant']) || !isset($row['quantity'])) {
            //     return null;
            // }
            $itemCode = strval($row['itemcode']);
            $variant = strval($row['variant']);
            $createdBy = auth()->user()->code;

            if (!preg_match("/^" . $this->industry . "\d{".(10 - strlen($this->industry))."}$/", $itemCode)) {
                throw ValidationException::withMessages([
                    'itemcode' => "Mã sản phẩm `$itemCode` không hợp lệ. Phải bắt đầu bằng '{$this->industry}' và có đúng 10 ký tự.",
                ]);
            }
            
            $item = ItemVariant::where('Code', $itemCode)->where('Variant', $variant)->first();
            if (!$item) {
                throw new \Exception("Không tìm thấy sản phẩm [$itemCode - $variant] trong danh mục.");
            }

            $exists = ApiCart::where('ItemCode', $itemCode)->where('Variant', $variant)->where('CreatedBy', $createdBy)->exists();
            if ($exists) {
                throw new \Exception("Dòng bị trùng: ItemCode [$itemCode], Variant [$variant], CreatedBy [$createdBy]");
            }

            return new ApiCart([
                'ItemCode'     => $itemCode, 
                'Variant'      => $variant, 
                'Quantity'     => $row['quantity'],
                'Status'       => 1,
                'CreatedBy'    => $createdBy,
                'CreatedDate'  => Carbon::now(),
            ]);
        } catch (Exception $e) {
            throw ValidationException::withMessages([
                'file' => 'Error at item: ' . json_encode($row). ' - ' . $e->getMessage(),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            '*.itemcode' => 'required|size:10',
            '*.variant'  => 'required|max:25',
            '*.quantity' => 'required|numeric|min:1'
        ];
    }

    public function customValidationMessages()
    {
        return [
            '*.itemcode.required' => 'Mã sản phẩm không được để trống.',
            '*.itemcode.size'     => 'Mã sản phẩm phải là chuỗi có 10 kí tự.',
            '*.variant.required'  => 'Mã màu không được để trống.',
            '*.quantity.required' => 'Số lượng không được để trống.',
            '*.quantity.numeric'  => 'Số lượng phải là số.',
            '*.quantity.min'      => 'Số lượng phải lớn hơn hoặc bằng 1.',
        ];
    }
}