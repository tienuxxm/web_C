import { memo } from 'react';
import Select from 'react-select';

function ModalItem( props ) {
     const { item, handleChangeItem, optionItem, handeModalUpdateItem } = props;
    
    const options = item?.map(item => ({
        value: `${item.Code} - ${item.Variant}`,
        label: `${item.Code} - ${item.Name}`
    })) || [];
    
    return (
    <div className="modal fade" id="updateItem" data-bs-backdrop="static" data-bs-keyboard="false" tabIndex={-1} aria-labelledby="staticBackdropLabel" aria-hidden="true">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" style={styles.text} id="staticBackdropLabel">Thêm sản phẩm trong hệ thống ERP</h5>
                {/* <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" /> */}
              </div>
              <div className="modal-body">
                <div className="card flex justify-content-center" style={styles.bodyModal}>
                    <div className="col-md-12 col-sm-12">
                        <label className = "form-label" style = {styles.text}>Chọn sản phẩm</label>
                        <Select options = {options}
                                onChange = {handleChangeItem}
                                placeholder = "Chọn sản phẩm"
                                styles={{ container: base => ({ ...base, ...styles.text }) }}/>
                    </div>
                </div>
              </div>
              <div className = "modal-footer">
                <button type = "button"
                        className = "btn btn-outline-success" 
                        data-bs-dismiss = { optionItem ? "modal" : "" }  
                        onClick = {handeModalUpdateItem} 
                        style = {styles.text}> Lưu
                </button>
              </div>
            </div>
          </div>
    </div>
    )
}

export default memo(ModalItem);

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
