import { useState, useEffect, useRef, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import * as ACTIONS from '../../../store/actions/index';
import { getApi, postApiv1, deleteApi, postApiv2 } from '../../../api';
import {formDate_toDate} from '../../../hooks';
import Form from './form';
import Modal from './modal';
import ModalNoERP from './modalNoERP';
import Spinner from '../../../components/Spinner';

function Home() { 
  const order = useSelector((state) => state.order);
  const dispatch = useDispatch();
  
  const [loading, setLoading] = useState(true);
  const [industry, setIndustry] = useState([]);
  const [item, setItem] = useState([]);
  const [inputs, setInputs] = useState({});
  const [selectedOptionItem, setOptionItem] = useState(null);
  const toast = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setInputs(formDate_toDate);
    const fetchIndustry = async () => {
      try {
        const result = await getApi("industry");
        setIndustry(result);
      } catch (error) {
        console.error("Lỗi khi gọi API Item:", error);
      }
    };
    fetchIndustry();
    setLoading(false);
  }, [])

  /* Lấy dữ liệu từ api */
  useEffect(() => {
    dispatch(ACTIONS.getCartByUser())
  }, [dispatch])
  
  /* Lấy dữ liệu từ thẻ input */
  const onChange = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setInputs(values => ({...values, [name]: value}));
  }
  
  /* lấy dữ liệu sản phẩm */
  function handleChangeItem(selectedOption) {
    setOptionItem(selectedOption?.value);
  }
  
  // chỉ lấy file đầu tiên
  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) {
      return toast.current.show({severity:"warn", summary: "Warning", detail:"Vui lòng chọn file trước.", life: 3000});
    }
    if(!inputs.industry){
      return toast.current.show({severity:"warn", summary: "Warning", detail:"Vui lòng chọn ngành hàng", life: 3000});
    }
    
    const formData = new FormData();
    formData.append('file', file); 
    formData.append('industry', inputs.industry); 
    
    try {
      setLoading(true);
      const response = await postApiv2("cart/import", formData);
      dispatch(ACTIONS.getCartByUser())
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setLoading(false);
      return toast.current.show({severity:"success", summary: "Thông báo", detail:`${response?.message}`, life: 3000});
    } catch (error) {
      toast.current.show({severity:"error", summary: "Error", detail:"Import file Excel thất bại", life: 3000});
    }
  };

  /* loading data item */
  const handleLoadItem = async () => {
    let id = inputs.industry ?? 10
    const result = await getApi(`item/${id}`);
    setItem(result);
  }

  /* xóa sản phẩm ra giỏ hàng */
  const handleChangeDeleteCart = async (id) => {
    try {
      await deleteApi(`cart/${id}`);
      dispatch(ACTIONS.deleteOrder(id));
      toast.current.show({ severity: 'success', summary: 'Thông báo', detail: 'Sản phẩm đã được xóa.', life: 3000 });
    } catch (error) {
      toast.current.show({ severity: 'error', summary: 'Lỗi', detail: 'Xóa sản phẩm thất bại', life: 3000 });
    }
  };

  const activityBodyTemplate = (rowData) => {
    return <Button type="button" severity="danger" onClick={() => handleChangeDeleteCart(rowData.id)} icon="pi pi-trash" rounded/>
  };
  
  /* thêm sản phẩm vào giỏ hàng */
  const handeModalAddCart = async () => {
    if(!selectedOptionItem){
      return toast.current.show({severity:"warn", summary: "Warning", detail:"Vui lòng chọn sản phẩm", life: 3000});
    }
    if(!inputs.quantity){
      return toast.current.show({severity:"warn", summary: "Warning", detail:"Vui lòng điền số lượng", life: 3000});
    }
    
    const parts = selectedOptionItem.split(' - ');
    if (parts.length !== 5) {
      console.log("Invalid format. Expected format: ItemCode - Variant - Unit - Price"); 
    }
    
    const isDuplicate = order.some(item => 
      item.itemcode === parts[0] && item.variant === parts[1]
    );
    if (isDuplicate) {
      return toast.current.show({severity:"warn", summary: "Warning", detail:"Mã hàng này có rồi. Vui lòng chọn lại", life: 3000});
    }
    
    let formData = new FormData(); 
    formData.append('itemcode', parts[0]);
    formData.append('variant', parts[1]);
    formData.append('quantity', inputs.quantity);    
    const res_ID = await postApiv1("cart/store", formData);
    
    const products = [{
      itemcode: parts[0],
      variant: parts[1],
      description: parts[4],
      unit: parts[2],
      quantity: inputs.quantity,
      price: parts[3],
      id: res_ID.id
    }];
    dispatch(ACTIONS.addOrder(products));
  }

  /* Tạo đơn Purchase */
  const handleCreatePurchase = async () => {
    if(!inputs.formDate){
      return toast.current.show({severity:"warn", summary: "Warning", detail:"Vui lòng chọn ngày", life: 3000});
    }
    if(!inputs.supplier){
      return toast.current.show({severity:"warn", summary: "Warning", detail:"Vui lòng điền nhà cung cấp", life: 3000});
    }
    if(!inputs.purpose){
      return toast.current.show({severity:"warn", summary: "Warning", detail:"Vui lòng điền mục đích sử dụng", life: 3000});
    }
    if(!inputs.industry){
      return toast.current.show({severity:"warn", summary: "Warning", detail:"Vui lòng chọn ngành hàng", life: 3000});
    }

    if(!order || order.length === 0){
      return toast.current.show({severity:"warn", summary: "Warning", detail:"Vui lòng chọn sản phẩm để đặt hàng", life: 3000});
    }
   
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('industry', inputs.industry);
      formData.append('postingDate', inputs.toDate);
      formData.append('intendedUse', inputs.purpose);
      formData.append('supplier', inputs.supplier);
      formData.append('note', inputs.note ? inputs.note : '.');
      order.forEach((line, index) => {
        formData.append(`lines[${index}][itemcode]`, line.itemcode);
        formData.append(`lines[${index}][variant]`, line.variant);
        formData.append(`lines[${index}][description]`, line.description);
        formData.append(`lines[${index}][unit]`, line.unit);
        formData.append(`lines[${index}][quantity]`, line.quantity);
        formData.append(`lines[${index}][price]`, line.price);
      });
      await postApiv2("purchase-line/insertlines", formData);
      await getApi("sendMail/purchase");
      dispatch(ACTIONS.deleteAllOrder());
      setLoading(false);
      return toast.current.show({severity:"success", summary: "Success", detail:"Đặt hàng thành công.", life: 3000}); 
    } catch (error) {
      return toast.current.show({severity: "error", summary: "Error", detail: "Đặt hàng thất bại", life: 3000});
    }
  }

  /* thêm sản phẩm ngoài hệ thống erp */
  const handeModalAddCartNoERP = async () => {
    if(!inputs.description){
      return toast.current.show({severity:"warn", summary: "Warning", detail:"Vui lòng điền tên sản phẩm", life: 3000});
    }
    if(!inputs.quantity){
      return toast.current.show({severity:"warn", summary: "Warning", detail:"Vui lòng điền số lượng", life: 3000});
    }

    try {
      let formData = new FormData(); 
      formData.append('description', inputs.description);
      formData.append('quantity', inputs.quantity);    
      const res_ID = await postApiv1("cart/insert", formData);

      const products = [{
        itemcode: 'NA',
        variant: 'NA',
        description: inputs.description,
        unit: 'NA',
        quantity: inputs.quantity,
        price: 0,
        id: res_ID.id
      }];
      dispatch(ACTIONS.addOrder(products));

      setInputs({description: ''});
      setInputs({quantity: ''});
    } catch (error) {
      toast.current.show({ severity: 'error', summary: 'Lỗi', detail: 'Thêm sản phẩm thất bại', life: 3000 });
    }
    
  }
  return ( 
    <div className="row">
      <Panel style={styles.header} header="Yêu Cầu Hàng Hóa">
        <Form industry = {industry} 
              order = {order} 
              onChange = {onChange} 
              inputs = {inputs} 
              activityBodyTemplate = {activityBodyTemplate} 
              handleCreatePurchase = {handleCreatePurchase}
              handleLoadItem = {handleLoadItem}
              handleFileChange = {handleFileChange}
              fileInputRef = {fileInputRef}/>
      </Panel>
      <Modal item = {item} inputs = {inputs} selectedOptionItem = {selectedOptionItem}
             handeModalAddCart = {handeModalAddCart} 
             handleChangeItem = {handleChangeItem}
             onChange = {onChange}/> 
      <ModalNoERP inputs = {inputs} onChange = {onChange}
                  handeModalAddCartNoERP = {handeModalAddCartNoERP}/>
      {loading && <Spinner />}
      <Toast ref = {toast}/>
    </div>
  );
}

export default memo(Home);
const styles = {
   header:{  fontFamily:"Times New Roman" }
}
 