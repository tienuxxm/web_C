import { memo } from 'react';

function Form(props) {
    const {inputs, onChange, handleSubmit, exportCSV} = props;
 
    return (
        <form className="row g-3" onSubmit = {handleSubmit}>
            <div className="col-md-3 col-sm-6">
                <label className="form-label" style={styles.InputText}>Từ ngày</label>
                <input type="date" style={styles.InputText} className="form-control" name="formDate" value={inputs.formDate || ""} onChange={(event)=>onChange(event)} />
            </div>
            <div className="col-md-3 col-sm-6">
                <label className="form-label" style={styles.InputText}>Đến ngày</label>
                <input type="date" style={styles.InputText} className="form-control" name="toDate" value={inputs.toDate || ""} onChange={(event)=>onChange(event)} />
            </div>
            <div className="d-grid gap-3 d-sm-flex justify-content-sm-end">
                <button style={styles.InputText} className="btn btn-outline-primary">Tải báo cáo</button>
                <button style={styles.InputText} className="btn btn-outline-secondary" onClick={exportCSV}>Xuất excel</button>
            </div> 
        </form>
    )
}

export default memo(Form);
const styles = {
    InputText:{
        fontFamily:"Times New Roman"
    }
}
