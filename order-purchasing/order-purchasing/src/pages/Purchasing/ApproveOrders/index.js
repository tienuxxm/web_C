import { memo, useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Panel } from 'primereact/panel';
import { Toast } from 'primereact/toast';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import * as ACTIONS from '../../../store/actions/index';
import { postApiv1, getApi } from '../../../api';
import {formDate_toDate} from '../../../hooks';
import Form from './form';
import Modal from './modal';
import Spinner from '../../../components/Spinner';

function Detail() {
  const orderapproval = useSelector((state) => state.orderapproval);
  const dispatch = useDispatch();
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState([]);
  const [detailOrder, setDetailOrder] = useState([]);
  const [inputs, setInputs] = useState({});
  const [selectedStatus, setselectedStatus] = useState();
  const [globalFilter, setGlobalFilter] = useState(null);
  const [note, setNote] = useState({});
  const toast = useRef(null);

  useEffect(() => {
    setInputs(formDate_toDate);
    const fetchStatus = async () => {
      try {
        const result = await getApi("status");
        const allowedCodes = ["2", "3", "5", "10"];
        const filteredStatus = result.filter(item =>
          allowedCodes.includes(item.Code)
        );
        setStatus(filteredStatus);
      } catch (error) {
        console.error("Lỗi khi gọi API Status:", error);
      }
    };
    fetchStatus();
  }, []);
  
  const onChange = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setInputs(values => ({...values, [name]: value}));
  }

  /* Lấy dữ liệu từ model thể textarea */
  const onChangeNote = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setNote(values => ({...values, [name]: value}));
  }
  
  /* Lấy dữ liệu thẻ select */
  const handleChangeStatus = (event)  => {
    setselectedStatus(event.target.value)
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      let formData = new FormData(); 
      formData.append('status', selectedStatus ? selectedStatus : 2);
      formData.append('fromdate', inputs.formDate);
      formData.append('todate', inputs.toDate);
      dispatch(ACTIONS.mergeHeader(formData));
      setLoading(false);
    } catch (error) {
      return toast.current.show({severity:"error", summary: "Error", detail:"Lỗi khi tải dữ liệu", life: 3000});
    }
  }
  
  /* lấy chi tiết đơn đặt hàng */
  const handeChangeDetail = async(document) => {
    try {
      const response = await getApi(`merge-line/${document}`); 
      setDetailOrder(response);
      setNote(values => ({ ...values, note: "" }));
    } catch (error) {
      return toast.current.show({severity:"error", summary: "Error", detail:"Lỗi khi tải dữ liệu", life: 3000});
    }
  }
  
  /* cập nhập trạng thái */
  const handeModalUpdateStatus = async () => {
    if(!note.note){
      return toast.current.show({severity:"warn", summary: "Warning", detail:"Vui lòng điền ghi chú", life: 3000});
    }
    setLoading(true);
    if(detailOrder.length > 0){
      
      let formData = new FormData(); 
      formData.append('document', detailOrder[0].DocumentNo);
      formData.append('status', 3);
      formData.append('note', note.note);
      detailOrder.forEach((update, index) => {
        formData.append(`updates[${index}][id]`, update.ID);
        formData.append(`updates[${index}][quantity]`, update.Quantity);
      });
      await postApiv1('merge-line/update', formData); 
      dispatch(ACTIONS.updateStatus(detailOrder[0].DocumentNo));
      setLoading(false);
      return toast.current.show({severity:"success", summary: "Success", detail:"Duyệt đơn hàng thành công", life: 3000});
    }else{
      return toast.current.show({severity:"error", summary: "Error", detail:"Lỗi duyệt đơn", life: 3000});
    }
  }

  const handeModalCancel = async () => {
    if(!note.note){
      return toast.current.show({severity:"warn", summary: "Warning", detail:"Vui lòng điền ghi chú", life: 3000});
    }

    if(detailOrder.length > 0){
      let formData = new FormData(); 
      formData.append('document', detailOrder[0].DocumentNo);
      formData.append('status', '5');
      formData.append('note', note.note);
      await postApiv1('merge-header/update-status', formData); 
      dispatch(ACTIONS.updateStatusCancel(detailOrder[0].DocumentNo));
      
      return toast.current.show({severity:"success", summary: "Success", detail:"Hủy đơn hàng thành công", life: 3000});
    }else{
      return toast.current.show({severity:"error", summary: "Error", detail:"Lỗi duyệt đơn", life: 3000});
    }
  }

  const getLineInformation = (document) => {
    return (<button className="btn btn-outline-primary" style={styles.InputText} data-bs-toggle="modal" data-bs-target="#detail" onClick={()=>handeChangeDetail(document)}>Xem chi tiết</button>)   
  };

  const activityBodyTemplate = (rowData) => {
    return getLineInformation(rowData.DocumentNo)
  };

  const renderHeader = () => {
    return (<div className="flex justify-content-between">
              <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText style={styles.InputText} type="search" onInput={(e) => setGlobalFilter(e.target.value)} placeholder="Search..." />
              </span>
            </div>);
  };
  const header = renderHeader();

  return ( 
    <div className="row">
      <Panel style={styles.header} header="Phê duyệt đơn đặt mua hàng">
        <Form status = {status} 
              inputs = {inputs} 
              onChange = {onChange}
              handleChangeStatus = {handleChangeStatus}
              handleSubmit = {handleSubmit}/>
        <br/>
        <DataTable value={orderapproval} paginator showGridlines rows={25} 
                   globalFilter={globalFilter} header={header} 
                   emptyMessage="Không có dữ liệu" style={styles.dataTable}>
          <Column field="DocumentNo" header="Mã" sortable style={{ width: '15%' }}></Column>
          <Column field="Industry" header="Ngành hàng" sortable style={{ width: '15%' }}></Column>
          <Column field="PostingDate" header="Ngày tạo" sortable style={{ width: '20%' }}></Column>
          <Column field="ShipmentDate" header="Ngày dự kiến hàng về" sortable style={{ width: '20%' }}></Column>
          <Column field="StatusName" header="Trạng thái" sortable style={{ width: '15%' }} 
            body={(rowData) => {
              let color;
              switch (rowData.StatusName) {
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
              return <span style={{ color }}>{rowData.StatusName}</span>;
            }}>
          </Column>
          <Column field="Status" header="Thao tác" body={activityBodyTemplate} style={{ width: '15%' }}></Column>
        </DataTable>
        <Modal detailOrder = {detailOrder} note = {note} onChangeNote = {onChangeNote}
               handeModalUpdateStatus = {handeModalUpdateStatus} 
               handeModalCancel = {handeModalCancel}/>
      </Panel>
      {loading && <Spinner />}
      <Toast ref = {toast}/>
    </div>
  );
}

export default memo(Detail);
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
 