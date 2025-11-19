import { memo } from 'react';
import { MultiSelect } from 'primereact/multiselect';

function Form(props) {
    const {departments, status, inputs, onChange, handleChangeStatus, selectedDepartment, setSelectedDepartment, handleSubmit, exportCSV} = props;
    const options = departments?.map(item => ({
        value: `${item.Code}`,
        label: `${item.Code} - ${item.Name}`
    })) || [];

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
            <div className="col-md-6 col-sm-6">
                <label className="form-label" style={styles.InputText}>Phòng ban</label>
                <MultiSelect value={selectedDepartment || []}
                             options={options}
                             onChange={(e) => setSelectedDepartment(e.value)}
                             optionLabel="label"
                             display="chip"
                             placeholder="Chọn phòng"
                             filter  
                             maxSelectedLabels={1} className="form-control" style={styles.InputText}/>
            </div>
            <div className="d-grid gap-3 d-md-flex justify-content-md-end">
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
