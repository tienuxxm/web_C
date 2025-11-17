import { memo, useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Panel } from 'primereact/panel';
import { Toast } from 'primereact/toast';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import * as ACTIONS from '../../../store/actions/index';
import { postApiv1, getApi } from '../../../api';
import { formDate_toDate } from '../../../hooks';
import Form from './form';
import Modal from './modal';
import ModalItem from './modalItem';
import Spinner from '../../../components/Spinner';

function ChangeOrder() {
  const purchasingorder = useSelector((state) => state.purchasingorder);
  const dispatch = useDispatch();
  
  const [loading, setLoading] = useState(false);
  const [item, setItem] = useState([]);
  const [optionItem, setOptionItem] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [detailOrder, setDetailOrder] = useState([]);
  const [inputs, setInputs] = useState({});
  const [selectedDepartment, setSelectedDepartment] = useState([]);
  const [id, setId] = useState(null);
  const [globalFilter, setGlobalFilter] = useState(null);
  const toast = useRef(null);

  useEffect(() => {
    setLoading(true);
    setInputs(formDate_toDate)
    const fetchDepartments = async () => {
      try {
        const result = await getApi("departments");
        setDepartments(result);
      } catch (error) {
        console.error("Lỗi khi gọi API Item:", error);
      }
    };
    fetchDepartments();
    setLoading(false);
  }, []);
  
  /* Lấy dữ liệu từ input */
  const onChange = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setInputs(values => ({...values, [name]: value}));
  }

  /* loading Item */
  const handleLoadItem = async (id) => {
    const validItems = detailOrder.filter(item => item.ItemCode !== 'NA');
    let industry = validItems[0].ItemCode.substring(0, 2); 
    const result = await getApi(`item/${industry}`);
    setItem(result);
    setId(id);
  }

  /* lấy dữ liệu sản phẩm */
  function handleChangeItem(selectedOption) {
    setOptionItem(selectedOption?.value);
  }
  
  /* update sản phẩm */
  const handeModalUpdateItem = async () => {
      if(!optionItem){
        return toast.current.show({severity:"warn", summary: "Warning", detail:"Vui lòng chọn sản phẩm", life: 3000});
      }
      
      if(!id){
        return toast.current.show({severity:"warn", summary: "Warning", detail:"Vui lòng dòng cần chỉnh sửa", life: 3000});
      }

      const parts = optionItem.split(' - ');
      const isDuplicate = detailOrder.some(item => 
        item.ItemCode === parts[0] && item.Variant === parts[1]
      );
      if (isDuplicate) {
        return toast.current.show({severity:"warn", summary: "Warning", detail:"Mã hàng này có rồi. Vui lòng chọn lại", life: 3000});
      }

      let formData = new FormData(); 
      formData.append('id', id);
      formData.append('document', detailOrder[0].DocumentNo);
      formData.append('itemcode', parts[0]);
      formData.append('variant', parts[1]);  
      
      await postApiv1("purchase-line/update-item", formData);
      handeChangeDetail(detailOrder[0].DocumentNo);
  }
  
  const handleSubmit = (event) => {
    event.preventDefault();
    const department = selectedDepartment.join(',');
    if(!department){
      return toast.current.show({severity:"warn", summary: "Warning", detail:"Vui lòng chọn phòng ban", life: 3000});
    }
    
    try {
      let formData = new FormData(); 
      formData.append('fromdate', inputs.formDate);
      formData.append('todate', inputs.toDate);
      formData.append('department', department);
      dispatch(ACTIONS.getChangeOrderPurchasing(formData));
    } catch (error) {
      return toast.current.show({severity:"error", summary: "Error", detail:"Lỗi khi tải dữ liệu", life: 3000});
    }
  }
  
  /* lấy chi tiết đơn đặt hàng */
  const handeChangeDetail = async(document) => {
    try {
      let formData = new FormData(); 
      formData.append('document', document);
      const response = await postApiv1('purchase-line/detailall', formData); 
      setDetailOrder(response);
    } catch (error) {
      return toast.current.show({severity:"error", summary: "Error", detail:"Lỗi khi tải dữ liệu", life: 3000});
    }
  }
  
  /* Cung ứng điều chỉnh */
  const handeModalAdjustedSupply = async () => {
    setLoading(true);
    if(detailOrder.length > 0){
      const formHeader = new FormData(); 
      formHeader.append('document', detailOrder[0].DocumentNo);
      formHeader.append('status', 6);
      await postApiv1('purchase-header/status-supply', formHeader); 
    
      let formLine = new FormData(); 
      detailOrder.forEach((update, index) => {
        formLine.append(`updates[${index}][id]`, update.ID);
        formLine.append(`updates[${index}][quantity]`, update.Quantity);
      });
      await postApiv1('purchase-line/quantity', formLine); 
      dispatch(ACTIONS.updateStatusPO(detailOrder[0].DocumentNo));
      setLoading(false);
      return toast.current.show({severity:"success", summary: "Success", detail:"Chỉnh lại đơn hàng thành công", life: 3000});
    }else{
      return toast.current.show({severity:"error", summary: "Error", detail:"Lỗi duyệt đơn", life: 3000});
    }
  }
  
  /* CHỐT ĐƠN */
  const handeModalCloseOrder = async () => {
    setLoading(true);
    if(detailOrder.length > 0){
      const hasInvalidItem = detailOrder.some(item => item.ItemCode === 'NA');
      if (hasInvalidItem) {
        return toast.current.show({severity: "error",summary: "Error", detail: "Vui lòng chọn lại sản phẩm", life: 3000});
      }
      let formData = new FormData(); 
      formData.append('document', detailOrder[0].DocumentNo);
      formData.append('status', 7);
      await postApiv1('purchase-header/status-supply', formData); 
      dispatch(ACTIONS.updateStatusPH(detailOrder[0].DocumentNo));
      setLoading(false);
      return toast.current.show({severity:"success", summary: "Success", detail:"Chốt thành công", life: 3000});
    }else{
      return toast.current.show({severity:"error", summary: "Error", detail:"Lỗi chốt đơn", life: 3000});
    }
  }

  const activityBodyTemplate = (rowData) => {
     return (<button className="btn btn-outline-primary" style={styles.InputText} data-bs-toggle="modal" data-bs-target="#detail" onClick={()=>handeChangeDetail(rowData.document)}>Xem chi tiết</button>) 
  };

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
      <Panel style={styles.header} header="Xác nhận cung ứng hàng hóa">
        <Form departments = {departments} 
              inputs = {inputs} onChange = {onChange}
              selectedDepartment = {selectedDepartment}
              setSelectedDepartment = {setSelectedDepartment}
              handleSubmit = {handleSubmit}/>
        <br/>
        <DataTable value={purchasingorder} paginator showGridlines rows={25} 
                   globalFilter={globalFilter} header={renderHeader()}
                   emptyMessage="Không có dữ liệu" style={styles.dataTable}>
          <Column field="document" header="Mã" sortable style={{ width: '10%' }}></Column>
          <Column field="department" header="Phòng ban" sortable style={{ width: '20%' }}></Column>
          <Column field="postingdate" header="Ngày cần hàng" sortable style={{ width: '15%' }}></Column>
          <Column field="industry" header="Ngành hàng" sortable style={{ width: '5%' }}></Column>
          <Column field="intendeduse" header="Mục đích sử dụng" sortable style={{ width: '10%' }}></Column>
          <Column field="supplier" header="NCC" sortable style={{ width: '10%' }}></Column>
          <Column field="status" header="Trạng thái" sortable style={{ width: '15%' }} 
            body={(rowData) => {
              let color;
              switch (rowData.status) {
                case 'Mới':
                  color = 'blue';
                  break;
                case 'Chốt':
                  color = 'Olive';
                  break;
                default:
                  color = 'gray';
                  break;
              }
              return <span style={{ color }}>{rowData.status}</span>;
            }}>
          </Column>
          <Column field="Action" header="Thao tác" body={activityBodyTemplate} style={{ width: '15%' }}></Column>
        </DataTable>
        <Modal detailOrder = {detailOrder} 
               handeModalAdjustedSupply = {handeModalAdjustedSupply}
               handeModalCloseOrder = {handeModalCloseOrder} 
               handleLoadItem = {handleLoadItem}
               item = {item}
               handleChangeItem = {handleChangeItem}/>
         <ModalItem item = {item} 
                    handleChangeItem = {handleChangeItem}
                    optionItem = {optionItem}
                    handeModalUpdateItem = {handeModalUpdateItem}/>
      </Panel>
      {loading && <Spinner />}
      <Toast ref = {toast}/>
    </div>
  );
}

export default memo(ChangeOrder);
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
 