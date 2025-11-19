import { useState, useEffect, useRef, memo } from 'react';
import { Panel } from 'primereact/panel';
import { Toast } from 'primereact/toast';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { postApiv1 } from '../../../api';
import { formDate_toDate } from '../../../hooks';
import Form from './form';
import Modal from './modal';
import Spinner from '../../../components/Spinner';

function History() { 
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({});
  const [order, setOrder] = useState();
  const [detailOrder, setDetailOrder] = useState([]);
  const [globalFilter, setGlobalFilter] = useState(null);
  const toast = useRef(null);
  
  useEffect(() => {
    setInputs(formDate_toDate);
  }, [])
  
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
        const res = await postApiv1('purchase-header/user', formData);
        setOrder(res)
        setLoading(false);
    } catch (error) {
        return toast.current.show({severity:"error", summary: "Error", detail:"Lỗi khi tải dữ liệu", life: 3000});
    }
  }
  
  const handeChangeDetail = async(document) => {
    try {
      let formData = new FormData(); 
      formData.append('document', document);
      const response = await postApiv1('purchase-line/detail', formData); 
      setDetailOrder(response);
    } catch (error) {
      return toast.current.show({severity:"error", summary: "Error", detail:"Lỗi khi tải dữ liệu", life: 3000});
    }
  }
  
  const activityBodyTemplate = (rowData) => {
    return (<button className="btn btn-outline-primary" style={styles.inputText} data-bs-toggle="modal" data-bs-target="#detail" onClick={()=>handeChangeDetail(rowData.document)}>Xem chi tiết</button>)   
  };

  const renderHeader = () => {
    return (<div className="flex justify-content-between">
                <span className="p-input-icon-left">
                  <i className="pi pi-search" />
                  <InputText style={styles.inputText} type="search" onInput={(e) => setGlobalFilter(e.target.value)} placeholder="Search..." />
                </span>
            </div>);
  };

  const header = renderHeader();
  return ( 
    <div className="row">
      <Panel style={styles.header} header="Lịch sử đặt hàng">
        <Form inputs = {inputs} onChange = {onChange} handleSubmit = {handleSubmit}/>
        <br/>
        <DataTable value={order} paginator showGridlines rows={25} 
                   globalFilter={globalFilter} header={header}
                   emptyMessage="Không có dữ liệu" style={styles.dataTable}> 
            <Column field="document" header="Mã" sortable style={{ width: '10%' }}></Column>
            <Column field="industry" header="Ngành hàng" style={{ width: '5%' }}></Column>
            <Column field="postingdate" header="Ngày cần hàng" sortable style={{ width: '15%' }}></Column>
            <Column field="intendeduse" header="Mục đích sử dụng" style={{ width: '20%' }}></Column>
            <Column field="supplier" header="NCC" style={{ width: '20%' }}></Column>
            <Column field="status" header="Trạng thái" sortable style={{ width: '15%' }} 
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
                      return <span style={{ color }}>{rowData.status}</span>;
                    }}>
            </Column>
            <Column field="Status" header="Thao tác" body={activityBodyTemplate} style={{ width: '15%' }}></Column>
        </DataTable>
      </Panel>
      <Modal detailOrder = {detailOrder} />
      {loading && <Spinner />}
      <Toast ref = {toast}/>
    </div>
  );
}

export default memo(History);
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