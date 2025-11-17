import { useNavigate } from "react-router-dom";
function Error404() {
    let navigate = useNavigate();
    const handleGoback = () => {
        navigate("/", {replace: true});
    }
    return (  
    <div className="page-error">
    <div className="Error404">
       <h1 className="title">Error 404</h1>
       <p className="description">Oops! The page you're looking for doesn't exist.</p>
       <button className="goBack" onClick={handleGoback}>Go back</button> 
    </div>
    </div>
    )
 }
 
 export default Error404;