import axios from 'axios';

let lastRequestTime = 0;
const REQUEST_DELAY_MS = 1000;

const client = axios.create({
  baseURL: 'https://fleet-api.taxi.yandex.net',
  headers: {
    'Accept-Language': 'ru',
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use(async (config) => {
  const now = Date.now();
  const timeToWait = Math.max(0, REQUEST_DELAY_MS - (now - lastRequestTime));

  if (timeToWait > 0) {
    await new Promise((resolve) => setTimeout(resolve, timeToWait));
  }

  lastRequestTime = Date.now();
  return config;
});

export default client;
