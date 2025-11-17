import { memo } from 'react';
import { MultiSelect } from 'primereact/multiselect';

function Form(props) {
    const {departments, inputs, onChange, selectedDepartment, setSelectedDepartment, handleSubmit} = props;
    const options = departments?.map(item => ({
        value: `${item.Code}`,
        label: `${item.Code} - ${item.Name}`
    })) || [];

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
            <div className="col-md-6 col-sm-12">
                <label className="form-label" style={styles.InputText}>Phòng ban</label>
                <MultiSelect value={selectedDepartment || []}
                             options={options}
                             onChange={(e) => setSelectedDepartment(e.value)}
                             display="chip"
                             placeholder="Chọn phòng"
                             className="form-control"
                             maxSelectedLabels={1} style={styles.InputText}/>
            </div>
            <div className="d-grid gap-3 justify-content-sm-end">
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
