import { memo } from 'react';

function Form(props) {
    const { item, document, inputs, onChange, handeModalApproval } = props;
    
    return (
        <div className="row g-3">
            <div className="col-md-4 col-sm-4">
                <label className="form-label" style={styles.InputText}>Mã đơn</label>
                <input type="text" style={styles.InputText} name="document" className="form-control" value={document ?? ""} disabled/>
            </div>
            <div className="col-md-4 col-sm-4">
                <label className="form-label" style={styles.InputText}>Ngành hàng</label>
                <input type="text" style={styles.InputText} className="form-control" name="industry" value = {item[0]?.Description || ""} disabled/>
            </div>
            <div className="col-md-4 col-sm-4">
                <label className="form-label" style={styles.InputText}>Ngày dự kiến</label>
                <input type="date" style={styles.InputText} className="form-control" 
                       name="shipment" 
                       value={inputs.shipment || (item[0] ? item[0].ShipmentDate : '')}
                       onChange={(event)=>onChange(event)} />
            </div>
            <div className="d-grid gap-3 d-md-flex justify-content-sm-end">
                <button style={styles.InputText} onClick={handeModalApproval} className="btn btn-outline-info">Gửi Phê Duyệt</button>
            </div> 
        </div>
    )
}

export default memo(Form);
const styles = {
    InputText:{
        fontFamily:"Times New Roman",
    }
}
