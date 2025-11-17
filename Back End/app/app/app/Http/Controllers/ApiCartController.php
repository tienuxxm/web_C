<?php

namespace App\Http\Controllers;
use Illuminate\Http\Request;
use App\Models\ApiCart;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use App\Imports\ApiCartImport;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Validation\ValidationException;

class ApiCartController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'itemcode'  => 'required|string|max:15',
            'variant'   => 'required|string|max:25',
            'quantity'  => 'required|numeric|min:0',
        ]);

        $cart = new ApiCart();
        $cart->ItemCode     = $validated['itemcode'];
        $cart->Variant      = $validated['variant'];
        $cart->Quantity     = $validated['quantity'];
        $cart->Status       = 1;
        $cart->CreatedBy    = auth()->user()->code;
        $cart->CreatedDate  = Carbon::now();
        $cart->save();

        return response()->json(['success' => true, 'id' => $cart->ID], 200);
    }

    public function insertItemNoERP(Request $request)
    {
        $validated = $request->validate([
            'description'  => 'required|string|max:250',
            'quantity'  => 'required|numeric|min:0',
        ]);

        $cart = new ApiCart();
        $cart->ItemCode     = 'NA';
        $cart->Variant      = 'NA';
        $cart->ItemName     = $validated['description'];
        $cart->Unit         = 'NA';
        $cart->Quantity     = $validated['quantity'];
        $cart->Price        = 0;
        $cart->Status       = 1;
        $cart->CreatedBy    = auth()->user()->code;
        $cart->CreatedDate  = Carbon::now();
        $cart->save();

        return response()->json(['success' => true, 'id' => $cart->ID], 200);
    }

    public function updateCart(Request $request)
    {
        $validated = $request->validate([
            'id' => 'required|numeric|min:0',
            'quantity' => 'required|numeric|min:0',
        ]);

        $cart = ApiCart::findOrFail($validated['id']);

        $cart->Quantity = $validated['quantity'];
        $cart->Status += 1; // tăng giá trị Status
        $cart->ModifiedBy = auth()->user()->code;
        $cart->ModifiedDate = Carbon::now();
        $cart->save();

        return response()->json(['success' => true], 200);
    }

    public function destroy($id)
    {
        $cart = ApiCart::findOrFail($id);
        $cart->delete();
        return response()->json(['success' => true], 200);
    }

    public function deleteByUser()
    {
        try {
            $deleted = ApiCart::where('CreatedBy', auth()->user()->code)->delete();
            if ($deleted === 0) {
                return response()->json(['error' => 'Không tìm thấy giỏ hàng'], 404);
            }
            return response()->json(['success' => true], 200);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function getCartList()
    {
        $userCode = auth()->user()->code;

        $cartList = DB::table('API$Cart')
            ->selectRaw('ROW_NUMBER() OVER (ORDER BY [ID]) AS STT,
                        [ItemCode] AS itemcode,
                        [Variant] AS variant,
                        [ItemName] AS description,
                        [Unit] AS unit,
                        CAST([Quantity] AS INT) AS quantity,
                        [Price] AS price,
                        CAST([Inventory] AS FLOAT) AS inventory, 
                        [ID] AS id')
            ->where('CreatedBy', $userCode)
            ->where('Status', '<>', 0)
            ->get();

        return response()->json($cartList, 200);
    }

    public function import(Request $request)
    {
        $request->validate([
            'industry' => 'required|integer', 
            'file' => 'required|file|mimes:xlsx,csv,xls', 
        ]);
       
        try {
            DB::transaction(function () use ($request) {
                Excel::import(new ApiCartImport($request->input('industry')), $request->file('file'));
            });
            return response()->json(['message' => 'Import thành công!', 'code' => '200'], 200);
        } catch (ValidationException $e) {
            $failures = $e->errors();

            return response()->json([
                'message' => 'Import thất bại',
                'details' => $failures,
                'code' => '422'
            ], 422);
            //return response()->json(['error' => 'Import thất bại: ' . $e->getMessage()], 422);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => '500'], 500);
        }
    }
}
