import { useState, memo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { postApi } from '../../api';
import { Toast } from 'primereact/toast';
import { InputText } from "primereact/inputtext";
import { Password } from 'primereact/password';
import Spinner from '../../components/Spinner';

function Login() {
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({});
  const navigate = useNavigate();
  const toast = useRef(null);

  const handleChange = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setInputs(values => ({...values, [name]: value}));
  }

  const showError = () => {
    toast.current.show({severity:'error', summary: 'Error', detail:'Đăng nhập thất bại!', life: 3000});
  }
  
  const handleSubmit = async(event) => {
    event.preventDefault();
    setLoading(true);
    try {
      
      let formData = new FormData(); 
      formData.append('email', inputs.email);
      formData.append('password', inputs.password);

      const res = await postApi("auth/login", formData);
      localStorage.setItem('access_token', JSON.stringify(res.access_token));
      localStorage.setItem('role', JSON.stringify(res.user[0].role_name));
      localStorage.setItem('department', JSON.stringify(res.user[0].department_name));
      localStorage.setItem('name', JSON.stringify(res.user[0].name));
      
      navigate("/purchasing/report-statistics");
      navigate(0);
    } catch (error) {
      showError();
    }
    setLoading(false);
  }

  return ( 
    <div className="login">
      <div className="login-box">
        <div className="logo"> 
          <img src="img/logoBitex.png" alt="Logo"/>
          <h3 style={styles.margin_top}>Đặt Hàng Nội Bộ</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <span className="p-float-label">
                <InputText id="email" type="email" onChange={handleChange} name="email" value={inputs.email || ""} required />
                <label htmlFor="email">Tên đăng nhập</label>
          </span>
          <span className="p-float-label">
              <Password id="password" type="password" onChange={handleChange} name="password" value={inputs.password || ""} feedback={false} required />
              <label htmlFor="password">Mật khẩu</label>
          </span>
          <input type="submit" value="Đăng nhập"  />
        </form>
        {loading && <Spinner />}
        <Toast ref={toast} />
      </div>
    </div>
  );
}

export default memo(Login);
const styles = {
    margin_top:{
        marginTop:"20px",
        color:"red",
        fontWeight: 900
    },
}

