import { memo, useState, useEffect, useRef } from 'react';
import { Panel } from 'primereact/panel';
import { Toast } from 'primereact/toast';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import Form from './form';
import {formDate_toDate} from '../../../hooks';
import { postApiv1 } from '../../../api';
import Spinner from '../../../components/Spinner';

function Statistical() {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [inputs, setInputs] = useState({});
  const [globalFilter, setGlobalFilter] = useState(null);
  
  const dt = useRef(null);
  const toast = useRef(null);

  useEffect(() => {
    setInputs(formDate_toDate);
  }, []);
  
  const onChange = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setInputs(values => ({...values, [name]: value}));
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      let formData = new FormData(); 
      formData.append('fromdate', inputs.formDate);
      formData.append('todate', inputs.toDate);
      const result = await postApiv1("statistical", formData);
      setReports(result.data)
      setLoading(false);
    } catch (error) {
      return toast.current.show({severity:"error", summary: "Error", detail:"Lỗi khi tải dữ liệu", life: 3000});
    }
  }
  
  const exportCSV = () => { dt.current.exportCSV() };

  const header = () => {
    return (<div className="flex justify-content-between">
              <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText style={styles.InputText} type="search" onInput={(e) => setGlobalFilter(e.target.value)} placeholder="Search..." />
              </span>
            </div>);
  };

  return ( 
    <div className="row">
      <Panel style={styles.header} header="Báo cáo thống kê yêu cầu hàng hóa">
        <Form inputs = {inputs} onChange = {onChange}
              handleSubmit = {handleSubmit} exportCSV = {exportCSV}/>
        <br/>
        <DataTable ref={dt} value={reports} 
                   paginator showGridlines rows={25} 
                   globalFilter={globalFilter} header={header}
                   emptyMessage="Không có dữ liệu" style={styles.dataTable}>
          <Column field="ItemCode" header="Mã" style={{ width: '5%' }}></Column>
          <Column field="Variant" header="Mã màu" style={{ width: '5%' }}></Column>
          <Column field="ItemName" header="Tên sản phẩm" style={{ width: '20%' }}></Column>
          <Column field="Unit" header="Đvt (ERP)" style={{ width: '5%' }}></Column>
          <Column field="Quantity" header="Số lượng" style={{ width: '5%' }}></Column>
          <Column field="PriceCost" header="Giá vốn (VAT)" style={{ width: '5%' }}> </Column>
          <Column field="PriceLevel1" header="Giá bán lẻ (VAT)" style={{ width: '5%' }}> </Column>
          <Column field="TotalInventory" header="Tổng tồn kho" style={{ width: '5%' }}> </Column>
          <Column field="InventoryNhapKhau" header="Tồn kho NK" style={{ width: '5%' }}> </Column>
          <Column field="InventoryBan" header="Tồn kho bán" style={{ width: '5%' }}> </Column>
          <Column field="SlMua" header="Số lượng mua (2 năm)" style={{ width: '5%' }}> </Column>
          <Column field="SlBan" header="Số lượng bán (2 năm)" style={{ width: '5%' }}></Column>
          <Column field="SlTra" header="Số lượng trả (2 năm)" style={{ width: '5%' }}></Column>
          <Column field="LKBan" header="Lũy kế bán hàng(năm nay)" style={{ width: '5%' }}></Column>
        </DataTable>
      </Panel>
      {loading && <Spinner />}
      <Toast ref = {toast}/>
    </div>
  );
}

export default memo(Statistical);
const styles = {
  header: {fontFamily:"Times New Roman"},
  InputText: {fontFamily:"Times New Roman"},
  dataTable: {fontFamily:"Times New Roman"},
  title:{
    textAlign:"center",
    color:"red",
    padding:"10px",
    fontFamily:"Times New Roman"
  },
  margin_top:{
    marginTop:"20px",
    fontFamily:"Times New Roman",
    marginBottom:"20px",
  },
}
 