import { memo, useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import { Toast } from 'primereact/toast';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { getApi, postApiv1, deleteApi, postApiv2 } from '../../../api';
import { InputText } from 'primereact/inputtext';
import Form from './form';
import Modal from './modal';
import Spinner from '../../../components/Spinner';

function MergeOrder() {
  const [loading, setLoading] = useState(false);
  const {document} = useParams(); 
  const [item, setItem] = useState([]);
  const [inputs, setInputs] = useState({});
  const [selectedItem, setSelectedItem] = useState(null); // lấy sản phẩm khi check box
  const [dataDetail, setDataDetail] = useState([]);
  const [globalFilter, setGlobalFilter] = useState(null);
  const navigate = useNavigate();
  const toast = useRef(null);
  
  useEffect(() => {
    const fetchItem = async () => {
      try {
        const result = await getApi(`merge-header/detail/${document}`);
        setItem(result);
        if (result.length > 0) {
          setInputs({
            shipment: result[0].ShipmentDate,
          });
        } else {
          navigate(`/supply/merge`);
        }
      } catch (error) {
        console.error("Lỗi khi gọi API Item:", error);
      }
    };
    fetchItem();
  }, [document, navigate]);

  /* Lấy dữ liệu từ input */
  const onChange = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setInputs(values => ({...values, [name]: value}));
  }

  /* Lưu & gửi duyệt */
  const handeModalApproval = async () => {
    if (!inputs.shipment) {
      return toast.current.show({severity: "error", summary: "Error", detail: "Vui lòng chọn ngày dự kiến", life: 3000});
    }
    if (item.length === 0) {
      return toast.current.show({severity: "error", summary: "Error", detail: "Không có dữ liệu để gửi duyệt", life: 3000});
    }
    try {
      setLoading(true);
      let formData = new FormData(); 
      formData.append('document', document);
      formData.append('shipment', inputs.shipment);
      await postApiv1("merge-header/approval", formData);
      setLoading(false);
      toast.current.show({severity:"success", summary: "Success", detail:"Gửi duyệt thành công", life: 3000});
    } catch (error) {
      toast.current.show({severity: "error", summary: "Error", detail: "Lỗi duyệt đơn", life: 3000});
    }
    setTimeout(alertFunc, 1000);
    function alertFunc() { 
      navigate(`/supply/merge`);
    }
  }
  
  /* xóa sản phẩm ra giỏ hàng */
  const handleChangeDelete = async (id) => {
    try {
      setLoading(true);
      const notification = await deleteApi(`merge-line/${id}`);
      const result = await getApi(`merge-header/detail/${document}`);
      setItem(result);
      setLoading(false);
      let mess = notification?.notification;
      toast.current.show({ severity: 'success', summary: 'Thông báo', detail: `${mess}`, life: 3000 });
    } catch (error) {
      toast.current.show({ severity: 'error', summary: 'Lỗi', detail: 'Xóa sản phẩm thất bại', life: 3000 });
    }
  };

  const handeLoadingDetail = async () => {
    const result = await getApi(`purchase-line/merge/${item[0]?.Industry}`);
    setDataDetail(result)
  }  

  const handeInsert = async () => {
    if(!selectedItem || selectedItem.length === 0){
      return toast.current.show({severity:"warn", summary: "Warning", detail:"Vui lòng chọn sản phẩm", life: 3000});
    }
     
    const formData = new FormData();
    formData.append('document', document);
    selectedItem.forEach((line, index) => {
      formData.append(`lines[${index}][itemcode]`, line.ItemCode);
      formData.append(`lines[${index}][variant]`, line.Variant);
      formData.append(`lines[${index}][description]`, line.ItemName);
      formData.append(`lines[${index}][unit]`, line.Unit);
      formData.append(`lines[${index}][quantity]`, line.Quantity);
      formData.append(`lines[${index}][id]`, line.ID);
    });
    try {
      const result = await postApiv2('merge-line/store', formData);
      let mess = result?.notification;
      setSelectedItem(null);
      const res = await getApi(`merge-header/detail/${document}`);
      setItem(res);
      return toast.current.show({ severity: 'success', summary: 'Thông báo', detail: `${mess}`, life: 3000 });
    } catch (error) {
      return toast.current.show({severity: "error", summary: "Error", detail: "Gộp đơn hàng thất bại", life: 3000});
    }
  }  
  
  const activityBodyTemplate = (rowData) => {
    return <Button type="button" severity="danger" onClick={() => handleChangeDelete(rowData.ID)} icon="pi pi-trash" rounded/>
  };
  
  const renderHeader = () => {
    return (<div className="row">
              <div className="col p-input-icon-left d-flex justify-content-start">
                <i className="pi pi-search" style={styles.margin_left} />
                <InputText style={styles.InputText} type="search" onInput={(e) => setGlobalFilter(e.target.value)} placeholder="Search..." />
              </div>
               <div className="col d-flex justify-content-end">
                    <Button icon="pi pi-plus-circle" severity="success" onClick={handeLoadingDetail} data-bs-toggle="modal" data-bs-target="#detail" rounded/>
                </div>
            </div>)
  };

  return ( 
    <div className="row">
      <Panel style={styles.header} header="Chi tiết gộp đơn hàng">
        <Form item = {item} 
              document = {document} 
              inputs = {inputs} 
              onChange = {onChange} 
              handeModalApproval = {handeModalApproval}/>
        <br/>
        <DataTable value={item} paginator showGridlines rows={25} 
                   globalFilter={globalFilter} header={renderHeader()}
                   emptyMessage="Không có dữ liệu" style={styles.dataTable}>
          <Column field="ID" hidden></Column>
          <Column field="ItemCode" header="Mã sản phẩm" sortable style={{ width: '10%' }}></Column>
          <Column field="Variant" header="Mã màu" sortable style={{ width: '5%' }}></Column>
          <Column field="ItemName" header="Tên sản phẩm" sortable style={{ width: '65%' }}></Column>
          <Column field="Unit" header="ĐVT" sortable style={{ width: '10%' }}></Column>
          <Column field="Quantity" header="Số lượng" sortable style={{ width: '20%' }}></Column>
          <Column field="Action" header="Thao tác" body={activityBodyTemplate} style={{ width: '10%' }}></Column>
        </DataTable>
      </Panel>
      <Modal dataDetail = {dataDetail} 
             selectedItem = {selectedItem} 
             setSelectedItem = {setSelectedItem}
             handeInsert = {handeInsert}/>
      {loading && <Spinner />}
      <Toast ref = {toast}/>
    </div>
  );
}

export default memo(MergeOrder);
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
  
  margin_left:{
    paddingLeft:"10px",
  },

}
 