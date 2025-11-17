import { memo } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { color } from 'chart.js/helpers';

function Modal(props) {
  const { detailOrder } = props;  
  
  const footer = () => {
    const total = detailOrder ? 
                  detailOrder.reduce((sum, item) => sum + Number(item.Amount), 0) : 0;
    return (
      <div style={styles.totals}>  
       <span>Tổng giá trị: {new Intl.NumberFormat('en-US').format(total)}</span>
      </div>
    );
  };

  return (
    <div className="modal fade" id="detail" data-bs-backdrop="static" data-bs-keyboard="false" tabIndex={-1} aria-labelledby="staticBackdropLabel" aria-hidden="true">
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" style={styles.text} id="staticBackdropLabel">{detailOrder[0] ? detailOrder[0].DocumentNo : ''}</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
              </div>
              <div className="modal-body">
                <div className="card flex justify-content-center" style={styles.bodyModal}>
                  <div className="row g-3">
                    <div className="col-md-6 col-sm-6">
                      <label className="form-label" style = {styles.text}>Ngày cần hàng: {detailOrder[0] ? detailOrder[0].PostingDate : ''}</label><br/>
                      <label className="form-label" style = {styles.text}>Ngành hàng: {detailOrder[0] ? detailOrder[0].Industry : ''}</label><br/>
                      <label className="form-label" style = {styles.text}>Mục đích sử dụng: {detailOrder[0] ? detailOrder[0].IntendedUse : ''}</label><br/>
                      <label className="form-label" style = {styles.text}>Nhà cung cấp: {detailOrder[0] ? detailOrder[0].Supplier : ''}</label>
                    </div>
                    <div className="col-md-6 col-sm-6">
                      <label className="form-label" style = {styles.text}>Người tạo: {detailOrder[0] ? detailOrder[0].User : ''}</label><br/>
                      <label className="form-label" style = {styles.text}>Phòng ban: {detailOrder[0] ? detailOrder[0].Department : ''}</label><br/>
                      <label className="form-label" style = {styles.text}>Ngày tạo: {detailOrder[0] ? detailOrder[0].CreatedDate : ''}</label><br/>
                      <label className="form-label" style = {styles.text}>Ghi chú đặt hàng: {detailOrder[0] ? detailOrder[0].Note : ''}</label>
                    </div>
                  </div>
                  <br/>
                  <DataTable value={detailOrder} paginator showGridlines rows={5} scrollable scrollHeight="400px" footer={footer}
                             emptyMessage="Không có dữ liệu" style={styles.dataTable}>
                    <Column field="ItemCode" header="Mã hàng"  style={{ width: '10%' }}></Column>
                    <Column field="Variant" header="Mã màu" style={{ width: '10%' }}></Column>
                    <Column field="ItemName" header="Tên hàng" style={{ width: '50%' }}></Column>
                    <Column field="Unit" header="Đvt" style={{ width: '10%' }}></Column>
                    <Column field="Quantity" header="Số lượng" style={{ width: '10%' }}></Column>
                    <Column field="Amount" header="Giá trị" style={{ width: '10%' }}></Column>
                    <Column field="Name" header="Trạng thái" style={{ width: '10%' }}></Column>
                  </DataTable>
                </div>
              </div>
              <div className="modal-footer">
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
    color: color('rgba(201, 9, 9, 0.87)').alpha(1).rgbString(),
    fontSize: '1em',
  },
}
