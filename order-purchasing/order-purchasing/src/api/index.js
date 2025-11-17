import axios from 'axios';
const API_URL='http://dathangnoibo.bitex.vn:8500/app/api/';
const token = localStorage.getItem('access_token');

const config = {
  headers: {
    Accept: 'application/json',
    Authorization: `Bearer ${token ?  token.slice(1, -1) : ""}`,
  }
};

export const getApi = async (endpoint) => {
  try {
    const res = await axios.get(`${API_URL}${endpoint}`, config);
    return res.data
  } catch (error){
    console.log("Error API", error.message)
  }
};

export const postApi = async (endpoint, data) => {
  try {
    let res = await axios({ method: 'POST'
                          , url:`${API_URL}${endpoint}`
                          , data: data
                          , headers: { Accept: 'text/html, application/json, text/plain, */*' }}) 
    return res.data
  } catch (error) {
    console.log("Error API", error.message);
  }
};

export const postApiv1 = async (endpoint, data) => {
  try {
    let res = await axios({ method: 'POST'
                          , url:`${API_URL}${endpoint}`
                          , data: data
                          , headers: { Accept: 'application/json', Authorization: `Bearer ${token ?  token.slice(1, -1) : ""}`,}
                          }) 
    return res.data
  } catch (error) {
    console.log("Error API", error.message);
  }
};

export const postApiv2 = async (endpoint, data) => {
  try {
    let res = await axios({ method: 'POST'
                          , url:`${API_URL}${endpoint}`
                          , data: data
                          , headers: { Accept: 'application/json',  'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token ?  token.slice(1, -1) : ""}`,}
                          }) 
    return res.data
  } catch (error) {
    console.log("Error API", error.message);
  }
};

export const deleteApi = async (endpoint) => {
  try {
    let res = await axios({ method: 'DELETE'
                          , url:`${API_URL}${endpoint}`
                          , headers: { Accept: 'application/json', Authorization: `Bearer ${token ?  token.slice(1, -1) : ""}`,}
                          }) 
    return res.data
  } catch (error) {
    console.log("Error API", error.message);
  }
};

axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);