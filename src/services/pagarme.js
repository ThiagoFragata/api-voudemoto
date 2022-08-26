const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.pargar.me/1',
})

const api_key = ''

module.exports = {
  createRecipient: async (data) => {},
  createCreditCard: async (data) => {},
}