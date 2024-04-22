// kwttoken.js
const axios = require('axios');

async function getToken() {
  const options = {
    method: 'POST',
    url: 'https://dev-1op7rfthd5gfwdq8.us.auth0.com/oauth/token',
    headers: { 'content-type': 'application/json' },
    data: JSON.stringify({
      client_id: 'kHI66mb0H0koAJfqAvvsB9KAPGsdA0JT',
      client_secret: 'PVA8-OVLKGI7NrWStEMVetLnq7UK05LoAsKUPXL6cvnOVoKo_N--irlbNlH3fCYS',
      audience: 'https://dev-1op7rfthd5gfwdq8.us.auth0.com/api/v2/',
      grant_type: 'client_credentials',
    }),
  };

  try {
    const response = await axios(options);
    return response.data.access_token;
  } catch (error) {
    console.error('Error obtaining token:', error);
    throw error;
  }
}

module.exports = getToken;
