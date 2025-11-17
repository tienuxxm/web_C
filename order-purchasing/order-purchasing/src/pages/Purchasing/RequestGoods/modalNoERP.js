import { memo } from 'react';

function ModalNoERP (props) {
    const { inputs, onChange, handeModalAddCartNoERP } = props;
    
    return (
    <div className="modal fade" id="addItemNoERP" data-bs-backdrop="static" data-bs-keyboard="false" tabIndex={-1} aria-labelledby="staticBackdropLabel" aria-hidden="true">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" style={styles.text} id="staticBackdropLabel">Thêm sản phẩm ngoài hệ thống ERP</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
              </div>
              <div className="modal-body">
                <div className="card flex justify-content-center" style={styles.bodyModal}>
                    <div className="col-md-12 col-sm-12">
                        <label className="form-label" style = {styles.text} >Tên sản phẩm</label>
                        <input className="form-control" type='text' name="description" style={styles.font} value={inputs?.description ? inputs.description : ""} onChange={(event)=>onChange(event)} required/>
                    </div>
                    <div className="col-md-12 col-sm-12">
                        <label className="form-label" style = {styles.text} >Số lượng</label>
                        <input className="form-control" type='number' name="quantity" style={styles.font} maxLength = "7" min = "1" value={inputs?.quantity ? inputs.quantity : ""} onChange={(event)=>onChange(event)} required/>
                    </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal" style={styles.text}>Thoát</button>
                <button type="button" className="btn btn-outline-success"  data-bs-dismiss={ inputs?.description && inputs?.quantity ? "modal" : "" }  onClick = {handeModalAddCartNoERP} style = {styles.text}>Thêm vào chi tiết</button>
              </div>
            </div>
          </div>
    </div>
    )
}

export default memo(ModalNoERP);

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
  radio : {
    fontFamily:"Times New Roman",
    fontWeight: 500,
    margin:"15px 0px 30px"
  },
  label : {
    margin:"0px 10px 0px"
  },
  font: {
    fontFamily:"Times New Roman"
  }
}
