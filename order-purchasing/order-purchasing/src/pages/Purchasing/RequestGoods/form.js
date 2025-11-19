import { memo, useState, useCallback } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { postApiv1 } from '../../../api';

function Form( props ) {
    const {industry, order, onChange, inputs, activityBodyTemplate, handleCreatePurchase, handleLoadItem, handleFileChange, fileInputRef} = props;
    const [globalFilter, setGlobalFilter] = useState(null);
    
    const renderHeader = () => {
        return (
            <div className="flex justify-content-between">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText style={styles.InputText} type="search" onInput={(e) => setGlobalFilter(e.target.value)} placeholder="Search..." />
                </span>
            </div>
        );
    };
    
    const header = renderHeader();
    const quantityEditor = useCallback((options) => {
        return (
            <InputNumber
                value={options.value}
                maxLength="7"
                min="1"
                style={styles.inputNumber}
                onValueChange={(e) => { 
                    options.editorCallback(e.value);
                    const formData = new FormData();
                    formData.append('id', options.rowData.id);
                    formData.append('quantity', e.value);
                    postApiv1("cart/update", formData);
                }} />
            );
    }, []);
  
    return (
        <div className="row g-3">
            <div className="col-md-4 col-sm-6">
                <label className="form-label" style={styles.InputText}>Ngày cần hàng</label>
                <input type="date" style={styles.InputText} className="form-control" name="toDate" value={inputs.toDate || ""} onChange={(event)=>onChange(event)} />
            </div>
            <div className="col-md-4 col-sm-6">
                <label className="form-label" style={styles.InputText}>Phòng ban</label>
                <input type="text" style={styles.InputText} className="form-control" name="departments" value = {JSON.parse(localStorage.getItem('department')) || ""} disabled/>
            </div>
            <div className="col-md-4 col-sm-6">
                <label className="form-label" style={styles.InputText}>Nhân viên</label>
                <input type="text" style={styles.InputText} className="form-control" name="staff" value = {JSON.parse(localStorage.getItem('name')) || ""} disabled/>
            </div>
            <div className="col-md-4 col-sm-6">
                <label className="form-label" style = {styles.InputText}>Trạng thái</label>
                <input type="text" style={styles.InputText} className="form-control" name="status" value = "Mới" disabled/>
            </div>
            <div className="col-md-4 col-sm-6">
                <label className="form-label" style={styles.InputText}>Ngành hàng</label>
                <select className="form-select" onChange={onChange} name="industry">
                    <option value=""> === Chọn ngành hàng === </option>
                    { industry.map(item => (
                        <option key={item.Code} value={item.Code}>
                            {item.Description}
                        </option>))
                    }
                </select>
            </div>
             <div className="col-md-4 col-sm-6">
                <label className="form-label" style={styles.InputText}>Nhà cung cấp ưu tiên</label>
                <input type="text" style={styles.InputText} className="form-control" name="supplier" value={inputs.supplier || ""} onChange={(event)=>onChange(event)} />
            </div>
            <div className="col-md-6 col-sm-6">
                <label className="form-label" style={styles.InputText}>Mục đích sử dụng</label>
                <textarea className="form-control" name="purpose" rows="2" value={inputs.purpose || ""} onChange={(event)=>onChange(event)} required/>
            </div>
            <div className="col-md-6 col-sm-6">
                <label className="form-label" style={styles.InputText}>Ghi chú</label>
                <textarea className="form-control" name="note" rows="2" value={inputs.note || ""} onChange={(event)=>onChange(event)}/>
            </div>
            <div className="col-md-12 col-sm-12">
                <b className="form-label" style={styles.InputText}>Chi tiết hàng hóa: </b>
                <DataTable value={order} paginator showGridlines rows={10} 
                           globalFilter={globalFilter} header={header} dataKey="id"
                           emptyMessage="Không có dữ liệu" style={styles.dataTable}>
                    <Column field="id" header="id" hidden></Column>
                    <Column field="STT" header="STT" style={{ width: '5%' }}></Column>
                    <Column field="itemcode" header="Mã hàng" style={{ width: '10%' }}></Column>
                    <Column field="variant" header="Mã màu" style={{ width: '5%' }}></Column>
                    <Column field="description" header="Tên hàng" style={{ width: '45%' }}></Column>
                    <Column field="unit" header="ĐVT" style={{ width: '5%' }}></Column>
                    <Column field="quantity" header="Số lượng" editor={(options) => quantityEditor(options)} style={{ width: '10%' }}/>
                    <Column field="price" header="Giá" style={{ width: '5%' }}></Column>
                    <Column field="inventory" header="Tồn kho" style={{ width: '5%' }}></Column>
                    <Column field="Status" header="Thao tác" body={activityBodyTemplate} style={{ width: '10%' }}></Column>
                </DataTable>
            </div>
            <div className="col-md-3 col-sm-3">
                <button style={styles.InputText} onClick={handleLoadItem} data-bs-toggle="modal" data-bs-target="#addItem" className="btn btn-outline-info">Thêm sản phẩm trong ERP</button>
            </div>
            <div className="col-md-3 col-sm-3">
                <button style={styles.InputText} data-bs-toggle="modal" data-bs-target="#addItemNoERP" className="btn btn-outline-info">Thêm sản phẩm ngoài ERP</button>
            </div>
            <div className="col-md-6 col-sm-6">
            </div>
            <div className="col-md-3 col-sm-6">
                <input type="file" accept=".xlsx,.xls" style={styles.margin_top} name="file" ref={fileInputRef} onChange={handleFileChange} className="btn btn-outline-info form-control"/>
            </div>
            <div className="d-grid gap-3 d-md-flex justify-content-sm-end">
                <button style={styles.InputText} className="btn btn-outline-primary" onClick={handleCreatePurchase}>Đặt Hàng</button>
            </div>
        </div>
    )
}

export default memo(Form);
const styles = {
    title:{
        textAlign:"center",
        color:"red",
        padding:"10px",
        fontFamily:"Times New Roman"
    },
    InputText:{
        fontFamily:"Times New Roman"
    },
    dataTable:{
        fontFamily:"Times New Roman"
    },
    margin_top:{
        marginTop:"20px",
        fontFamily:"Times New Roman",
        marginBottom:"20px",
    },
}
