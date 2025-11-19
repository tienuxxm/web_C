import { memo, useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';

function Modal(props) {
  const { detailOrder, note, onChangeNote, handeModalUpdateStatus, handeModalCancel } = props;  
  const [globalFilter, setGlobalFilter] = useState(null);
  
  const renderHeader = () => {
      return (<div className="p-input-icon-left d-flex justify-content-start">
                <i className="pi pi-search" style={styles.margin_left} />
                <InputText style={styles.InputText} type="search" onInput={(e) => setGlobalFilter(e.target.value)} placeholder="Search..." />
              </div>)
    };

  const renderActionButtons = () => {
    if (detailOrder.length === 0) return null;
    switch (detailOrder[0].Status) {
      case '2':
        return (<> 
                  <button type="button" className="btn btn-outline-dark" style = {styles.text} data-bs-dismiss={ note.note ? "modal" : "" } onClick = {handeModalCancel}>Hủy</button>
                  {/* <button type="button" className="btn btn-outline-info" style = {styles.text} data-bs-dismiss={ note.note ? "modal" : "" } onClick = {handeModalAdjust}>Điều Chỉnh</button> */}
                  <button type="button" className="btn btn-outline-success" style = {styles.text} data-bs-dismiss={ note.note ? "modal" : "" } onClick = {handeModalUpdateStatus}>Duyệt</button>
                </>);
      case '3':
        return (<button type="button" className="btn btn-outline-danger" style = {styles.text} data-bs-dismiss={ note.note ? "modal" : "" } onClick = {handeModalCancel}>Hủy</button>);
      default:
        return null;
    }
  };
  
  const footer = () => {
    const total = detailOrder ? 
                  detailOrder.reduce((sum, item) => sum + Number(item.Amount), 0) : 0;
    return (
      <div style={styles.totals}>  
       <span>Tổng giá trị: {new Intl.NumberFormat('en-US').format(total)}</span>
      </div>
    );
  };

  const quantityEditor = (options) => {
      return <InputNumber value={options.value} maxLength = "7" min = "0" style={styles.inputNumber} onValueChange={(e) => options.editorCallback(e.value)} />;
  };

  return (
    <div className="modal fade" id="detail" data-bs-backdrop="static" data-bs-keyboard="false" tabIndex={-1} aria-labelledby="staticBackdropLabel" aria-hidden="true">
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" style={styles.text} id="staticBackdropLabel">Chi tiết đơn {detailOrder[0] ? detailOrder[0].DocumentNo : ''} </h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
              </div>
              <div className="modal-body">
                <div className="card flex justify-content-center" style={styles.bodyModal}>
                  <div className="row g-3">
                    <div className="col-md-6 col-sm-6">
                      <label className="form-label" style = {styles.text}>Ngành hàng: {detailOrder[0] ? detailOrder[0].Description : ''}</label><br/>
                      <label className="form-label" style = {styles.text}>Ngày dự kiến hàng về: {detailOrder[0] ? detailOrder[0].ShipmentDate : ''}</label>
                    </div>
                    <div className="col-md-6 col-sm-6">
                      <label className="form-label" style = {styles.text}>Người tạo: {detailOrder[0] ? detailOrder[0].User : ''}</label><br/>
                      <label className="form-label" style = {styles.text}>Ngày tạo: {detailOrder[0] ? detailOrder[0].PostingDate : ''}</label>
                    </div>
                    <div className="col-md-12 col-sm-15">
                      <label className="form-label" style={styles.InputText}>Ghi chú</label>
                      <textarea className="form-control" name="note" rows="2" value={note.note || ''} onChange={(event)=>onChangeNote(event)}/>
                    </div>
                  </div>
                  <br/>
                  <DataTable value={detailOrder} paginator showGridlines rows={5} scrollable scrollHeight="400px" footer={footer}
                             globalFilter={globalFilter} header={renderHeader()}
                             emptyMessage="Không có dữ liệu" style={styles.dataTable}>
                    <Column field="ItemCode" header="Mã hàng"  style={{ width: '10%' }}></Column>
                    <Column field="Variant" header="Mã màu" style={{ width: '10%' }}></Column>
                    <Column field="ItemName" header="Tên hàng" style={{ width: '45%' }}></Column>
                    <Column field="Unit" header="Đvt" style={{ width: '10%' }}></Column>
                    <Column field="Quantity" header="Số lượng" style={{ width: '15%' }} editor={(options) => quantityEditor(options)}></Column>
                    <Column field="Amount" header="Giá trị" style={{ width: '5%' }}></Column>
                  </DataTable>
                </div>
              </div>
              <div className="modal-footer">
                { renderActionButtons() }
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
   totals : {
    fontFamily:"Times New Roman",
    color: "red",
    fontSize: '1em',
  },
  inputNumber:{ fontFamily:"Times New Roman" },
}
