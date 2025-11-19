import { memo } from 'react';

function Form(props) {
    const { industry, inputs, onChange, handlMerge } = props;
    
    return (
        <div className="row g-3">
            <div className="col-md-6 col-sm-6">
                <label className="form-label" style={styles.InputText}>Ngành hàng</label>
                <select className="form-select" onChange={onChange} name="industry" value={inputs ?? ""}>
                    <option value=""> === Chọn ngành hàng === </option>
                    { industry.map(item => (
                        <option key={item.Code} value={item.Code}>
                            {item.Description}
                        </option>))
                    }
                </select>
            </div>
            <div className="d-grid gap-3 d-md-flex justify-content-md-end">
                <button style={styles.InputText} onClick={handlMerge} className="btn btn-outline-info">Gộp đơn</button>
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
