import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:3000', // The address of our Rust backend
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;