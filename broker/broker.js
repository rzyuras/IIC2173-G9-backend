const mqtt = require('mqtt');
const axios = require('axios');
const getToken = require('./jwttoken');

const urlFlights = 'http://app:3000/flights';
const urlRequest = 'http://app:3000/flights/request/other';
const urlValidation = 'http://app:3000/flights/validation';
const urlAuction = 'http://app:3000/flights/auctions';
const urlProposal = 'http://app:3000/flights/auctions/proposal';
const urlResponse = 'http://app:3000/flights/auctions/response';

class MQTTClient {
  constructor(broker, port, user, password) {
    this.client = mqtt.connect(`mqtt://${broker}:${port}`, {
      username: user,
      password,
    });
    this.client.on('connect', () => {
      this.client.subscribe([
        'flights/info',
        'flights/requests',
        'flights/validation',
        'flights/auctions'
      ]);
    });
    this.client.on('message', (topic, message) => this.onMessage(topic, message));
  }

  async onMessage(topic, message) {
    if (topic === 'flights/info') {
      try {
        const data = JSON.parse(message)[0];
        const flights = JSON.parse(data.flights);
        const emissions = JSON.parse(data.carbonEmission);
        const payload = {
          price: parseInt(data.price, 10),
          currency: data.currency,
          carbon_emissions: parseInt(emissions.this_flight, 10),
          airline_logo_url: data.airlineLogo,
          departure_airport_name: flights[0].departure_airport.name,
          departure_airport_id: flights[0].departure_airport.id,
          departure_airport_time: flights[0].departure_airport.time,
          arrival_airport_name: flights[0].arrival_airport.name,
          arrival_airport_id: flights[0].arrival_airport.id,
          arrival_airport_time: flights[0].arrival_airport.time,
          duration: parseInt(flights[0].duration, 10),
          airplane: flights[0].airplane,
          airline: flights[0].airline,
          airline_logo: flights[0].airline_logo,
        };

        await axios.post(urlFlights, payload);

      } catch (error) {
        console.error(`An error occurred while sending the flight message: ${error}`);
      }
    } else if (topic === 'flights/requests') {
      try {
        const data = JSON.parse(message);
        const payload = {
          type: 'other_group_purchase',
          request_id: data.request_id,
          group_id: data.group_id,
          user_id: data.user_id,
          departure_airport: data.departure_airport,
          arrival_airport: data.arrival_airport,
          departure_time: data.departure_time,
          datetime: data.datetime,
          deposit_token: data.deposit_token,
          quantity: data.quantity,
          seller: data.seller,
        };

        const token = await getToken();
        await axios.post(urlRequest, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error(`An error occurred while processing the other group request messages: ${error}`);
      }
    } else if (topic === 'flights/validation') {
      try {
        const data = JSON.parse(message);
        const payload = {
          request_id: data.request_id,
          group_id: data.group_id,
          seller: data.seller,
          valid: data.valid,
        };

        await axios.post(urlValidation, payload).catch((error) => {
          if (error.response) {
            console.log('Detalles del error del servidor:', error.response.data);
            console.log('Código de estado:', error.response.status);
          } else if (error.request) {
            console.log('La solicitud fue hecha pero no se recibió respuesta', error.message);
          } else {
            console.log('Error al hacer la solicitud:', error.message);
          }
        });
      } catch (error) {
        console.error(`An error occurred while processing the validation message: ${error}`);
      }
    } else if (topic === 'flights/auctions') {
      try {
        const data = JSON.parse(message);
        const token = await getToken();
        if (data.type === 'offer') {
          await axios.post(urlAuction, data, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } else if (data.type === 'proposal') {
          await axios.post(urlProposal, data, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } else if (data.type === 'acceptance' || data.type === 'rejection') {
          await axios.post(urlResponse, data, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        }
      } catch (error) {
        console.error(`An error occurred while processing the auction message: ${error}`);
      }
    }
  }
}

const mqttBroker = process.env.MQTT_BROKER;
const mqttPort = process.env.MQTT_PORT;
const mqttUser = process.env.MQTT_USER;
const mqttPassword = process.env.MQTT_PASSWORD;

// eslint-disable-next-line no-new
new MQTTClient(mqttBroker, mqttPort, mqttUser, mqttPassword);
