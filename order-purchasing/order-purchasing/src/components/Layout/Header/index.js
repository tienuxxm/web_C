import { useState, useEffect, useMemo } from 'react';
import { Link } from "react-router-dom";
import { Sidebar } from 'primereact/sidebar';
import { Button } from 'primereact/button';
import { useNavigate } from 'react-router-dom';
import { postApiv1, getApi } from '../../../api';

function Header() {
  const [menu, setMenu] = useState([]);
  const [visible, setVisible] = useState(false);
  const [userName, setUserName] = useState();
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const result = await getApi("getMenuByUser");
        setMenu(result.data);
      } catch (error) {
        console.error("Lỗi khi gọi API menu:", error);
      }
    };
    fetchMenu();
    setUserName(JSON.parse(localStorage.getItem('name') || '""'));
  },[])
  
  const handleLogout = async () => {
    try {
      await postApiv1("auth/logout");
      localStorage.removeItem("access_token");
      localStorage.removeItem("role");
      localStorage.removeItem("department");
      localStorage.removeItem("name");
      navigate("/");
    } catch (error) {
      console.error("Lỗi khi logout:", error);
    }
  };

  const { level1, level2 } = useMemo(() => {
    const l1 = [];
    const l2 = [];

    menu.forEach(item => {
      if (item.Parent === "0") {
        l1.push({ Id: item.ID, Name: item.MenuName, Icon: item.Icon, TagCode: item.TagCode });
      }
    });

    menu.forEach(item => {
      l1.forEach(item1 => {
        if (item.Parent === item1.Id) {
          l2.push({ Id: item.ID, Name: item.MenuName, Icon: item.Icon, Parent: item.Parent, TagCode: item.TagCode, TagName: item.TagName });
        }
      });
    });

    return { level1: l1, level2: l2 };
  }, [menu]);

  const getLevel = (FrmCode) => {
    
    if(FrmCode === null){
      return (
        <label>
          <input type="checkbox"/>
          <i className="fa-solid fa-angle-down"></i>
        </label>
        ) 
    }
  }
  
  return ( 
    <div className="nav">
      <Sidebar className="nav-header" visible={visible} onHide={() => setVisible(false)} >
        <div className="nav-menu">
          <div className="logo">
            <img src="/img/logoBitex.png" width="100px" height="100px" alt="logo"/>
          </div>
          <div className="navbar">
            <ul className="menu">
            { /* menu */ } 
            { level1.map((item, index) => {
                return (
                  <li key={index}> <i className={ item.Icon }></i>
                   <Link to={ item.TagCode }>
                      { item.Name }
                   </Link> 
                     { getLevel(item.TagCode) }
                      { level2.map((item1, index1) => {
                        if(item1.Parent === item.Id){
                          return (
                            <ul key={index1}>
                                  <li><Link to={ item1.TagCode }>{ item1.Name }</Link></li>
                             </ul>
                          )
                        }else { return null }
                       }) 
                       }
                  </li>
                )
            })}
            { /* menu */ }
            </ul>
            <ul className="otherOption">
              <li><i className="fa-solid fa-user"></i>{ userName }</li>
              <li onClick = {handleLogout}><i className="fa-solid fa-right-to-bracket"></i>Đăng xuất</li>
            </ul>
          </div>
        </div>
      </Sidebar>
      <Button style={styles.menu} icon="pi pi-bars" onClick={() => setVisible(true)} outlined />
    </div>
  );
}

export default Header;
const styles = {
  menu:{ marginLeft: "5px" }
}

