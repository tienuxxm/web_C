import { memo } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputNumber } from 'primereact/inputnumber';
import Select from 'react-select';

function Modal(props) {
  const { purchaseline, actionDelete, item, handleChangeItem, onChange, handleAddPurchaseLine, handeModalApproval } = props;  
  
  const options = item?.map(item => ({
    value: `${item.Code} - ${item.Variant} - ${item.Unit} - ${item.Price} - ${item.Name}`,
    label: `${item.Code} - ${item.Name}`
  })) || [];
  
  const quantityEditor = (options) => {
    return <InputNumber value={options.value} maxLength = "7" min = "0" style={styles.font} onValueChange={(e) => options.editorCallback(e.value)} />;
  };

  const renderActionButtons = () => {
    if (purchaseline.length === 0) return null;
    switch (purchaseline[0].Status) {
      case '6':
        return (<button type="button" className="btn btn-outline-success" style = {styles.text} data-bs-dismiss="modal" onClick = {handeModalApproval}>Gửi Duyệt </button>);
      default:
        return null;
    }
  };
  
  const footer = () => {
    const total = purchaseline ? 
                  purchaseline.reduce((sum, item) => sum + Number(item.Amount), 0) : 0;
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
                <h5 className="modal-title" style={styles.text} id="staticBackdropLabel">Chi tiết</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
              </div>
              <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6 col-sm-6">
                        <label className="form-label" style = {styles.text}>Chọn sản phẩm</label>
                        <Select options = {options}
                                onChange = {handleChangeItem}
                                placeholder = "Chọn sản phẩm"
                                styles={{ container: base => ({ ...base, ...styles.text }) }}/>
                    </div>
                    <div className="col-md-6 col-sm-6">
                        <label className="form-label" style = {styles.text} >Số lượng</label>
                        <input className="form-control" type='number' name="quantity" style={styles.font} maxLength = "7" min = "1" onChange={(event)=>onChange(event)} required/>
                    </div>
                    <div className="col-md-12 col-sm-12">
                      <button style={styles.font} className="btn btn-outline-info" onClick={handleAddPurchaseLine}>Thêm</button>
                    </div>
                  </div>
                  <br/>
                  <DataTable value={purchaseline} paginator showGridlines rows={5} footer={footer}
                             emptyMessage="Không có dữ liệu" style={styles.font}>
                    <Column field="ID" header="ID" hidden></Column>
                    <Column field="ItemCode" header="Mã hàng"  style={{ width: '10%' }}></Column>
                    <Column field="Variant" header="Mã màu" style={{ width: '5%' }}></Column>
                    <Column field="ItemName" header="Tên hàng" style={{ width: '50%' }}></Column>
                    <Column field="Unit" header="Đvt" style={{ width: '5%' }}></Column>
                    <Column field="QuantityOld" header="Số lượng cũ" style={{ width: '5%' }}></Column>
                    <Column field="Quantity" header="Số lượng" style={{ width: '10%' }} editor={(options) => quantityEditor(options)}></Column>
                    <Column field="Amount" header="Giá trị" style={{ width: '5%' }}></Column>
                    <Column field="Status" header="Thao tác" body={actionDelete} style={{ width: '10%' }}></Column>
                  </DataTable> 
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
  text : {
    fontFamily:"Times New Roman",
    fontWeight: 500
  },
  font: {fontFamily:"Times New Roman"},
  totals : {
    fontFamily:"Times New Roman",
    color: "red",
    fontSize: '1em',
  },
}
