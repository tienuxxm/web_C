import { memo, useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';

function Modal(props) {
  const { dataDetail, selectedItem, setSelectedItem, handeInsert } = props;
  const [globalFilter, setGlobalFilter] = useState(null);
    
  const renderHeader = () => {
    return (<div className="p-input-icon-left d-flex justify-content-start">
              <i className="pi pi-search" style={styles.margin_left} />
              <InputText style={styles.InputText} type="search" onInput={(e) => setGlobalFilter(e.target.value)} placeholder="Search..." />
            </div>)
  };

  return (
    <div className="modal fade" id="detail" data-bs-backdrop="static" data-bs-keyboard="false" tabIndex={-1} aria-labelledby="staticBackdropLabel" aria-hidden="true">
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" style={styles.text} id="staticBackdropLabel">Thêm</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
            </div>
            <div className="modal-body">
              <div className="card flex justify-content-center" style={styles.bodyModal}>
                <DataTable value={dataDetail} paginator rows={5} scrollable scrollHeight="400px" 
                           globalFilter={globalFilter} header={renderHeader()}
                           selection={selectedItem} onSelectionChange={(e) => setSelectedItem(e.value)}
                           emptyMessage="Không có dữ liệu" style={styles.dataTable}>
                  <Column field="ID" hidden></Column>
                  <Column selectionMode="multiple" headerStyle={{ width: '3rem' }}></Column>
                  <Column field="ItemCode" header="Mã hàng"  style={{ width: '10%' }}></Column>
                  <Column field="Variant" header="Mã màu" style={{ width: '10%' }}></Column>
                  <Column field="ItemName" header="Tên hàng" style={{ width: '45%' }}></Column>
                  <Column field="Unit" header="Đvt" style={{ width: '15%' }}></Column>
                  <Column field="Quantity" header="Số lượng" style={{ width: '10%' }}></Column>
                </DataTable>
              </div>
            </div>
          <div className="modal-footer"> 
            <button type="button" className="btn btn-outline-success" data-bs-dismiss="modal" onClick={handeInsert} style={styles.text}>Thêm</button>
            <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal" style={styles.text}>Thoát</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(Modal);

const styles = {
  bodyModal: {
    borderRadius: "10px",
    boxShadow: "5px 5px 15px rgba(0, 0, 0, 0.5)",
    padding: "20px"
  },
  text : {
    fontFamily:"Times New Roman",
    fontWeight: 500
  },
  dataTable: {fontFamily:"Times New Roman"},
  inputNumber:{ fontFamily:"Times New Roman" },
  node:{ fontFamily:"Times New Roman", color: "red" },
  totals : {
    fontFamily:"Times New Roman",
    color: "red",
    fontSize: '1em',
  },
}