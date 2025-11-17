import { memo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import { Toast } from 'primereact/toast';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { getApi, postApiv2 } from '../../../api';
import Form from './form';
import Spinner from '../../../components/Spinner';

function Merge() {
  const [loading, setLoading] = useState(false);
  const [industry, setIndustry] = useState([]); // ngành hàng
  const [inputs, setInputs] = useState(null); // select lấy mã ngành
  const [item, setItem] = useState([]); // lấy sản phẩm
  const [detail, setDetail] = useState([]); // lay chi tiet
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); // lấy sản phẩm khi check box
  const [globalFilter, setGlobalFilter] = useState(null);
  const navigate = useNavigate();
  const toast = useRef(null);

  useEffect(() => {
    const fetchIndustry = async () => {
      try {
        const result = await getApi("industry");
        setIndustry(result);
      } catch (error) {
        console.error("Lỗi khi gọi API Item:", error);
      }
    };
    fetchIndustry();
  }, []);

  const onChange = async (event) => {
    setLoading(true);
    const value = event.target.value;
    setInputs(value);
    if(value){
      const result = await getApi(`purchase-line/merge/${value}`);
      setItem(result)
    }
    setLoading(false);
  }

  const handlMerge = async () => {
    if(!selectedItem || selectedItem.length === 0){
      return toast.current.show({severity:"warn", summary: "Warning", detail:"Vui lòng chọn sản phẩm", life: 3000});
    }
     if(!inputs){
      return toast.current.show({severity:"warn", summary: "Warning", detail:"Vui lòng chọn ngành hàng", life: 3000});
    }

    const formData = new FormData();
    formData.append('industry', inputs);
    selectedItem.forEach((line, index) => {
      formData.append(`lines[${index}][itemcode]`, line.ItemCode);
      formData.append(`lines[${index}][variant]`, line.Variant);
      formData.append(`lines[${index}][description]`, line.ItemName);
      formData.append(`lines[${index}][unit]`, line.Unit);
      formData.append(`lines[${index}][quantity]`, line.Quantity);
      formData.append(`lines[${index}][id]`, line.ID);
    });
    try {
      const result = await postApiv2('merge-line/insert', formData);
      setItem([]);
      navigate(`/supply/merge/${result.document}`);
    } catch (error) {
      return toast.current.show({severity: "error", summary: "Error", detail: "Gộp đơn hàng thất bại", life: 3000});
    }
  }

  const activityBodyTemplate = (rowData) => {
      return <Button type="button" severity="info" onClick={() => handleDetail(rowData.ID)} icon="pi pi-eye" rounded/>
  };

  const handleDetail = async (id) => {
    setLoading(true);
    const result = await getApi(`purchase-line/detail/${id}`);
    setDetail(result);
    setDialogVisible(true)
    setLoading(false);
  }

  const renderHeader = () => {
    return (<div className="flex justify-content-between">
              <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText style={styles.InputText} type="search" onInput={(e) => setGlobalFilter(e.target.value)} placeholder="Search..." />
              </span>
            </div>);
  };

  return ( 
    <div className="row">
      <Panel style={styles.header} header="Gộp đơn hàng">
        <Form industry = {industry} inputs = {inputs}
              onChange = {onChange}
              handlMerge = {handlMerge}/>
        <br/>
        <DataTable value={item} paginator showGridlines rows={25} 
                   globalFilter={globalFilter} header={renderHeader()}
                   emptyMessage="Không có dữ liệu" style={styles.dataTable}
                   selection={selectedItem} onSelectionChange={(e) => setSelectedItem(e.value)}>
          <Column field="ID" hidden></Column>
          <Column selectionMode="multiple" headerStyle={{ width: '3rem' }}></Column>
          <Column field="ItemCode" header="Mã sản phẩm" sortable style={{ width: '10%' }}></Column>
          <Column field="Variant" header="Mã màu" sortable style={{ width: '5%' }}></Column>
          <Column field="ItemName" header="Tên sản phẩm" sortable style={{ width: '60%' }}></Column>
          <Column field="Unit" header="ĐVT" sortable style={{ width: '5%' }}></Column>
          <Column field="MOQ" header="MOQ" sortable style={{ width: '5%' }}></Column>
          <Column field="Quantity" header="Số lượng" sortable style={{ width: '15%' }}></Column>
          <Column field="Action" header="Thao tác" body={activityBodyTemplate} style={{ width: '10%' }}></Column>
        </DataTable>
        <Dialog header="Chi tiết" style={styles.header} visible={dialogVisible} maximizable
                modal contentStyle={{ height: '300px' }} onHide={() => setDialogVisible(false)}>
            <DataTable value={detail} scrollable scrollHeight="flex" style={styles.dataTable} tableStyle={{ minWidth: '50rem' }}>
                <Column field="DocumentNo" header="Mã" style={{ width: '10%' }}></Column>
                <Column field="PostingDate" header="Ngày cần hàng" style={{ width: '10%' }}></Column>
                <Column field="ItemCode" header="Mã sản phẩm" style={{ width: '10%' }}></Column>
                <Column field="Variant" header="Mã màu" style={{ width: '5%' }}></Column>
                <Column field="ItemName" header="Tên sản phẩm" style={{ width: '50%' }}></Column>
                <Column field="Unit" header="ĐVT" style={{ width: '5%' }}></Column>
                <Column field="Quantity" header="Số lượng" style={{ width: '10%' }}></Column>
            </DataTable>
        </Dialog>
      </Panel>
      {loading && <Spinner />}
      <Toast ref = {toast}/>
    </div>
  );
}

export default memo(Merge);
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
 