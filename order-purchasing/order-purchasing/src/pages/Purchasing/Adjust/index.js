import { useState, useEffect, useRef, memo } from 'react'; 
import { useSelector, useDispatch } from 'react-redux';
import { Panel } from 'primereact/panel';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import * as ACTIONS from '../../../store/actions/index';
import { deleteApi, getApi, postApiv1 } from '../../../api';
import Modal from './modal';
import Spinner from '../../../components/Spinner';

function Adjust() { 
  const purchase = useSelector((state) => state.changePurchase);
  const purchaseline = useSelector((state) => state.changePurchaseLine);
  const dispatch = useDispatch();
  
  const [loading, setLoading] = useState(false);
  const [item, setItem] = useState([]);
  const [inputs, setInputs] = useState({});
  const [selectedOptionItem, setOptionItem] = useState(null);
  
  const [globalFilter, setGlobalFilter] = useState(null);
  const toast = useRef(null);
  
  /* Lấy dữ liệu từ api */
  useEffect(() => {
    dispatch(ACTIONS.getChangePH())
  }, [dispatch])
  
  /* Lấy dữ liệu từ thẻ input */
  const onChange = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setInputs(values => ({...values, [name]: value}));   
  }
  
  /* lấy dữ liệu sản phẩm */
  function handleChangeItem(selectedOption) {
    setOptionItem(selectedOption?.value);
  }
  
  /* lấy dữ liệu sản phẩm */
  const handleAddPurchaseLine = async () => {
    if(!selectedOptionItem){
      return toast.current.show({severity:"warn", summary: "Warning", detail:"Vui lòng chọn sản phẩm", life: 3000});
    }
    if(!inputs.quantity){
      return toast.current.show({severity:"warn", summary: "Warning", detail:"Vui lòng điền số lượng", life: 3000});
    }

    const parts = selectedOptionItem.split(' - ');
    if (parts.length !== 5) {
      console.log("Invalid format. Expected format: ItemCode - Variant - Unit - Price"); 
    }
    
    const isDuplicate = purchaseline.some(item => 
      item.ItemCode === parts[0] && item.Variant === parts[1]
    );
    if (isDuplicate) {
      return toast.current.show({severity:"warn", summary: "Warning", detail:"Mã hàng này có rồi. Vui lòng chọn lại", life: 3000});
    }
    
    let formData = new FormData(); 
    formData.append('document', purchaseline[0].DocumentNo);
    formData.append('postingDate', purchaseline[0].PostingDate);
    formData.append('itemcode', parts[0]);
    formData.append('variant', parts[1]);
    formData.append('description', parts[4]);
    formData.append('unit', parts[2]);   
    formData.append('quantity', inputs.quantity);    
    formData.append('price', parts[3]);
    const res_ID = await postApiv1("purchase-line/store", formData);
   
    const products = [{
      ItemCode: parts[0],
      Variant: parts[1],
      ItemName: parts[4],
      Unit: parts[2],
      Quantity: inputs.quantity,
      QuantityOld : inputs.quantity,
      Price: parts[3],
      ID: res_ID.id
    }];
    dispatch(ACTIONS.addPurchaseLine(products));
  }
  
    /* Lưu & gửi duyệt */
  const handeModalApproval = async () => {
    setLoading(true);
    if(purchaseline.length > 0){
      const formHeader = new FormData(); 
      formHeader.append('document', purchaseline[0].DocumentNo);
      formHeader.append('status', 1);
      await postApiv1('purchase-header/update-status', formHeader); 
      
      const formLine = new FormData(); 
      purchaseline.forEach((update, index) => {
        formLine.append(`updates[${index}][id]`, update.ID);
        formLine.append(`updates[${index}][quantity]`, update.Quantity);
      });
      await postApiv1('purchase-line/quantity', formLine); 

      dispatch(ACTIONS.updatePurchaseHeader(purchaseline[0].DocumentNo));
      setLoading(false);
      return toast.current.show({severity:"success", summary: "Success", detail:"Gửi duyệt thành công", life: 3000});
    }else{
      return toast.current.show({severity:"error", summary: "Error", detail:"Lỗi duyệt đơn", life: 3000});
    }
  }

  /* Lấy chi tiết đơn đặt hàng */
  const handeChangeDetail = async(document, industry) => {
    try {
      const result = await getApi(`item/${industry}`);
      setItem(result);
      let formData = new FormData(); 
      formData.append('document', document);
      dispatch(ACTIONS.getChangePL(formData));
    } catch (error) {
      return toast.current.show({severity:"error", summary: "Error", detail:"Lỗi khi tải dữ liệu", life: 3000});
    }
  }
  
  /* Xóa sản phẩm ra giỏ hàng */
  const handleChangeDeleteCart = async (id) => {
    try {
      await deleteApi(`purchase-line/${id}`);
      dispatch(ACTIONS.deletePurchaseLine(id));
      toast.current.show({ severity: 'success', summary: 'Thông báo', detail: 'Sản phẩm đã được xóa.', life: 3000 });
    } catch (error) {
      toast.current.show({ severity: 'error', summary: 'Lỗi', detail: 'Xóa sản phẩm thất bại', life: 3000 });
    }
  };

  const actionDelete = (rowData) => {
    return <Button type="button" severity="danger" onClick={() => handleChangeDeleteCart(rowData.ID)} icon="pi pi-trash" rounded/>
  };

  const activityBodyTemplate = (rowData) => {
    return (<button className="btn btn-outline-primary" style={styles.inputText} data-bs-toggle="modal" data-bs-target="#detail" onClick={()=>handeChangeDetail(rowData.document, rowData.industry)}>Xem chi tiết</button>)   
  };
  
  const renderHeader = () => {
    return (<div className="flex justify-content-between">
              <span className="p-input-icon-left">
                <i className="pi pi-search" />
                  <InputText style={styles.inputText} type="search" onInput={(e) => setGlobalFilter(e.target.value)} placeholder="Search..." />
              </span>
            </div>);
  };

  return ( 
    <div className="row">
      <Panel style={styles.header} header="Điều chỉnh đơn hàng">
        <DataTable value={purchase} paginator showGridlines rows={25} 
                   globalFilter={globalFilter} header={renderHeader()}
                   emptyMessage="Không có dữ liệu" style={styles.dataTable}>
          <Column field="document" header="Mã" sortable style={{ width: '10%' }}></Column>
          <Column field="supplier" header="Nhà cung cấp ưu tiên" style={{ width: '20%' }}></Column>
          <Column field="intendeduse" header="Mục đích sử dụng" style={{ width: '30%' }}></Column>
          <Column field="postingdate" header="Ngày cần hàng" sortable style={{ width: '10%' }}></Column>
          <Column field="industry" header="Ngành hàng" sortable style={{ width: '5%' }}></Column>
          <Column field="status" header="Trạng thái" sortable style={{ width: '10%' }} 
              body ={(rowData) => {
                let color;
                switch (rowData.status) {
                  case 'Mới':
                    color = 'blue';
                    break;
                  case 'Chờ duyệt':
                    color = 'darkorange';
                    break;
                  case 'Đã duyệt':
                    color = 'darkgreen';
                    break;
                  case 'Hủy':
                    color = 'crimson';
                    break;
                  default:
                    color = 'gray';
                    break;
                }
                return <span style={{ color }}>{rowData.status}</span> }}>
          </Column>
          <Column field="Status" header="Thao tác" body={activityBodyTemplate} style={{ width: '15%' }}></Column>
        </DataTable>
      </Panel>
      <Modal purchaseline = {purchaseline} actionDelete = {actionDelete}
             item = {item} handleChangeItem = {handleChangeItem}
             onChange = {onChange}
             handleAddPurchaseLine = {handleAddPurchaseLine}
             handeModalApproval = {handeModalApproval}/>
      {loading && <Spinner />}
      <Toast ref = {toast}/>
    </div>
  );
}

export default memo(Adjust);
const styles = {
  header: {fontFamily:"Times New Roman"},
  inputText: {fontFamily:"Times New Roman"},
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
 