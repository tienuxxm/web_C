import { memo } from 'react';

function Form(props) {
    const { status, inputs, onChange, handleChangeStatus, handleSubmit} = props;

    return (
        <form className="row g-3" onSubmit = {handleSubmit}>
            <div className="col-md-4 col-sm-4">
                <label className="form-label" style={styles.InputText}>Từ ngày</label>
                <input type="date" style={styles.InputText} className="form-control" name="formDate" value={inputs.formDate || ""} onChange={(event)=>onChange(event)} />
            </div>
            <div className="col-md-4 col-sm-4">
                <label className="form-label" style={styles.InputText}>Đến ngày</label>
                <input type="date" style={styles.InputText} className="form-control" name="toDate" value={inputs.toDate || ""} onChange={(event)=>onChange(event)} />
            </div>
            <div className="col-md-4 col-sm-4">
                <label className="form-label" style={styles.InputText}>Trạng thái</label>
                <select className="form-control" style={styles.InputText} onChange ={ handleChangeStatus }>
                  { status && status.length > 0 ? 
                    status.map((item, index) => {
                      return ( <option key={index} value={item.Code}>{item.Code} - {item.Name}</option>) }) : ""  
                  }
                </select>
            </div>
            <div className="d-grid gap-3 d-md-flex justify-content-md-end">
                <button style={styles.InputText} className="btn btn-outline-primary">Tải danh sách</button>
            </div> 
        </form>
    )
}

export default memo(Form);
const styles = {
    InputText:{
        fontFamily:"Times New Roman",
    }
}
