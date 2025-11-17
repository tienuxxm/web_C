import { memo, useState, useEffect, useRef } from 'react';
import { Panel } from 'primereact/panel';
import { Toast } from 'primereact/toast';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Chart } from 'primereact/chart';
import { postApiv1, getApi } from '../../../api';
import {formDate_toDate} from '../../../hooks';
import Form from './form';
import Spinner from '../../../components/Spinner';

function Report() {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [inputs, setInputs] = useState({});
  const [selectedDepartment, setSelectedDepartment] = useState([]);
  const [selectedStatus, setselectedStatus] = useState();
  const [globalFilter, setGlobalFilter] = useState(null);
  const [chartData, setChartData] = useState({});
  const [chartOptions, setChartOptions] = useState({});
  const dt = useRef(null);
  const toast = useRef(null);

  useEffect(() => {
    setInputs(formDate_toDate);
    Promise.all([
      getApi("status"),
      getApi("departments")
    ]).then(([statusRes, departmentsRes]) => {
      const allowedCodes = ["2", "3", "5"];
      const filteredStatus = statusRes.filter(item =>
        allowedCodes.includes(item.Code)
      );
      setStatus(filteredStatus);
      setDepartments(departmentsRes);
    }).catch(error => {
      console.error("Lỗi khi gọi API:", error);
    });
  }, []);
  
  const onChange = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setInputs(values => ({...values, [name]: value}));
  }

  const handleChangeStatus = (event)  => {
    setselectedStatus(event.target.value)
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    const department = selectedDepartment.join(',');
    if(!department){
      return toast.current.show({severity:"warn", summary: "Warning", detail:"Vui lòng chọn phòng ban", life: 3000});
    }
    
    try {
      setLoading(true);
      let formData = new FormData(); 
      formData.append('fromdate', inputs.formDate);
      formData.append('todate', inputs.toDate);
      formData.append('department', department);
      formData.append('status', selectedStatus ? selectedStatus : 2);
      
      const result = await postApiv1("orderpurchasing/report", formData);
      setReports(result)
      
      const top10 = await postApiv1("orderpurchasing/top10", formData);
      let nameProduct = [];
      let quantityProduct = [];
      for (let i = 0; i < top10.length; i++) {
        nameProduct.push(top10[i].ItemName);
        quantityProduct.push(top10[i].Quantity); 
      }

      const data = {
      labels: nameProduct,
      datasets: [{
          label: 'Số lượng',
          data: quantityProduct,
          backgroundColor: [
            'rgba(255, 159, 64, 0.2)',
            'rgba(75, 192, 192, 0.2)',
            'rgba(54, 162, 235, 0.2)',
            'rgba(153, 102, 255, 0.2)'
          ],
          borderColor: [
            'rgb(255, 159, 64)',
            'rgb(75, 192, 192)',
            'rgb(54, 162, 235)',
            'rgb(153, 102, 255)'
          ],
          borderWidth: 1
        }]
    };

    const options = {
      scales: {
        y: { beginAtZero: true }
      }
    };

    setChartData(data);
    setChartOptions(options);
    setLoading(false);
    } catch (error) {
      return toast.current.show({severity:"error", summary: "Error", detail:"Lỗi khi tải dữ liệu", life: 3000});
    }
  }
  
  const exportCSV = () => {
        dt.current.exportCSV();
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
      <Panel style={styles.header} header="Báo cáo thống kê nhu cầu đặt hàng">
        <Form departments = {departments} status = {status} inputs = {inputs} onChange = {onChange}
              handleChangeStatus = {handleChangeStatus}
              selectedDepartment = {selectedDepartment}
              setSelectedDepartment = {setSelectedDepartment}
              handleSubmit = {handleSubmit}
              exportCSV = {exportCSV}/>
        <br/>
        <div className="card">
            <Chart type="bar" data={chartData} options={chartOptions} />
        </div>
        <DataTable ref={dt} value={reports} 
                   paginator showGridlines rows={25} 
                   globalFilter={globalFilter} header={header}
                   emptyMessage="Không có dữ liệu" style={styles.dataTable}>
          <Column field="DocumentNo" header="Mã" sortable style={{ width: '5%' }}></Column>
          <Column field="Department" header="Phòng ban" sortable style={{ width: '10%' }}></Column>
          <Column field="ItemCode" header="Mã sản phẩm" sortable style={{ width: '5%' }}></Column>
          <Column field="Variant" header="Mã màu" sortable style={{ width: '5%' }}></Column>
          <Column field="ItemName" header="Tên sản phẩm" sortable style={{ width: '20%' }}></Column>
          <Column field="Unit" header="Đvt" sortable style={{ width: '3%' }}> </Column>
          <Column field="Quantity" header="Số lượng" sortable style={{ width: '2%' }}> </Column>
          <Column field="Due" header="Quá hạn" sortable style={{ width: '2%' }}> </Column>
          <Column field="Supplier" header="NCC" sortable style={{ width: '10%' }}> </Column>
          <Column field="PostingDate" header="Ngày cần hàng" sortable style={{ width: '5%' }}> </Column>
          <Column field="CreatedDate" header="Ngày tạo" sortable style={{ width: '5%' }}> </Column>
          <Column field="StatusName" header="Trạng thái" sortable style={{ width: '5%' }}
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
          <Column field="Note" header="Ghi chú" sortable style={{ width: '7%' }}></Column>
        </DataTable>
      </Panel>
      {loading && <Spinner />}
      <Toast ref = {toast}/>
    </div>
  );
}

export default memo(Report);
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
 