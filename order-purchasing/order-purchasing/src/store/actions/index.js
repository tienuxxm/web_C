import { getApi, postApiv1 } from "../../api";
import * as Types from "../type/index"

/* ================== GET PROFILE ================== */
export const getUser = (user) => {
  return (dispatch) => {
    dispatch({ type: Types.GET_USER, payload: user })
  }
};

/* ================== ORDER ================== */
export const addOrder = (product) => {
  return (dispatch) => {
    dispatch({ type: Types.ADD_ORDER, payload: product })
  }
};

export const deleteOrder = (id) => {
  return (dispatch) => {
    dispatch({ type: Types.DELETE_ORDER, payload: id }) 
  }
};

export const deleteAllOrder = () => {
  return (dispatch) => {
    dispatch({ type: Types.DELETE_ALL_ORDER }) 
  }
};

export const getCartByUser = () => {
  return async (dispatch) => {
    const result = await getApi("cart/list");
    dispatch({ type: Types.GET_CART_BY_USER, payload: result })
  }
};

export const getChangeOrderPurchasing = (formData) => {
  return async (dispatch) => {
    const result = await postApiv1("purchase-header/supply", formData);
    dispatch({ type: Types.CHANGE_PURCHASING_ORDER, payload: result })
  }
};

export const updateStatusPO = (document) => {
  return (dispatch) => {
    dispatch({ type: Types.UPDATE_STATUS_PURCHASING_ORDER, payload: document })
  }
};

export const addOrderPurchasing = () => {
  return async (dispatch) => {
    await getApi("cart/getbyuser").then((result) =>{
      dispatch({ type: Types.GET_CART_BY_USER, payload: result.data })
    })
  }
};

export const mergeHeader = (formData) => {
  return async (dispatch) => {
    const res = await postApiv1("merge-header", formData);
    dispatch({ type: Types.GET_ORDER_APPROVAL, payload: res })
  }
};

export const updateStatus = (document) => {
  return (dispatch) => {
    return dispatch({ type: Types.UPDATE_ORDER_APPROVAL, payload: document })
  }
};

// export const updateStatusAdjust = (document) => {
//   return (dispatch) => {
//     return dispatch({ type: Types.UPDATE_ORDER_APPROVAL, payload: document })
//   }
// };

export const updateStatusCancel = (document) => {
  return (dispatch) => {
    return dispatch({ type: Types.CANCEL_ORDER_APPROVAL, payload: document })
  }
};

export const updateStatusPH = (document) => {
  return (dispatch) => {
    return dispatch({ type: Types.STATUS_APPROVAL, payload: document })
  }
};

/* ================== GET CHANGE PURCHASE HEADER ================== */
export const getChangePH = () => {
  return async (dispatch) => {
    const result = await getApi("purchase-header/change-purchase-header");
    dispatch({ type: Types.GET_PURCHASE_HEADER, payload: result })
  }
};

export const getChangePL = (formdata) => {
  return async (dispatch) => {
    const result = await postApiv1('purchase-line/detailall', formdata); 
    dispatch({ type: Types.GET_PURCHASE_LINE, payload: result })
  }
};

export const deletePurchaseLine = (id) => {
  return (dispatch) => {
    dispatch({ type: Types.DELETE_PURCHASE_LINE, payload: id }) 
  }
};

export const addPurchaseLine = (products) => {
  return (dispatch) => {
    dispatch({ type: Types.ADD_PURCHASE_LINE, payload: products }) 
  }
};

export const updatePurchaseHeader = (document) => {
  return (dispatch) => {
    dispatch({ type: Types.UPDATE_PURCHASE_HEADER, payload: document }) 
  }
};

/* ================== GET CHANGE PURCHASE HEADER ================== */