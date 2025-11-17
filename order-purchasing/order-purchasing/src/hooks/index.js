export const formatPrice = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
export const pageNumber = (data,newsPerPage) => {
    let number=[];
    for ( let i = 1 ; i <= Math.ceil(data.length / newsPerPage) ; i++){
        number.push(i);
    }
    return number;
}

export const findIndex = (data, id) => {
    let temp = -1;
    data.forEach((data, index) => {
        if(data.Code === id){
            temp = index;
        }
    });
    return temp;
}

export const search = (data, query) => {
    return data.filter((item) => item.Status.toLowerCase().includes(query));
}

export const formDate_toDate = () => {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');

    return {
      formDate: `${y}-${m}-01`,
      toDate: `${y}-${m}-${d}`,
    };
}

export const renderLoading = (flag) => {
    if(flag === true){
        return (
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        )
    }else return;
}

