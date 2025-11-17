import Header from '../Header'
function HeaderOnly({children}) {
   return (  
   <div className="container-fluid">
      <Header/>
      {children}
   </div>
   )
}

export default HeaderOnly;