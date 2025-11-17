import { useEffect, useState } from 'react';
import { pageNumber } from '.';

export const Pages = (table) => {
    /* Trang hiện tại */
    const [currentPage,setCurrentPage] = useState(1); 
    /* Số dữ liệu trong 1 trang */
    const newsPerPage = 10;
    const [data,setData] = useState([]); 
    const pageNb = pageNumber(table,newsPerPage); 
    
/* ================================== PAGE ================================== */
   useEffect(() => {
      /* (vị trí)  cuối của trang */
      const indexLast = currentPage * newsPerPage;
      /* (vị trí) đầu của trang */
      const indexHead = indexLast - newsPerPage; 
      /* "cắt" dữ liệu ban đầu, lấy ra 1 mảng dữ liệu mới cho trang hiện tại */
      const datas = table.slice(indexHead, indexLast); 
      setData(datas)
   }, [table,currentPage]);

/* ================ CHANGE PAGE ================ */
    const handlePage = (i) => {
        setCurrentPage(i)
    }

/* ================ LÙI PAGE ================ */
    const handlePrev = () => {
        currentPage > 1 &&
        setCurrentPage(currentPage-1)
    }

/* ================ TỚI PAGE ================ */
    const handleNext = () => {
        currentPage < pageNb.length &&
        setCurrentPage(currentPage+1)
    }

    const page = (<nav aria-label="Page navigation example">
        <ul className="pagination justify-content-center">
        <button className="btn btn-outline-dark" onClick={()=>handlePrev()}>Previous</button>
        {pageNb && pageNb.map((i,index)=>{
        return <li key={index} className="page-item">
                  <button className="btn btn-outline-dark" onClick={()=>handlePage(i)}>{i}</button>
                </li>
        }) 
        }
        <button className="btn btn-outline-dark" onClick={()=>handleNext()}>Next</button>
        </ul>
    </nav>)

    return {data,page}
    
}