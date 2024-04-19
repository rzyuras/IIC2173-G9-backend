const mqtt = require('mqtt');
const axios = require('axios');

const url = 'http://app:3000/flights';

class MQTTClient {
  constructor(broker, port, user, password) {
    this.client = mqtt.connect(`mqtt://${broker}:${port}`, {
      username: user,
      password,
    });
    this.client.on('connect', () => {
      this.client.subscribe('flights/info');
    });
    this.client.on('message', (topic, message) => this.onMessage(topic, message));
  }

  // eslint-disable-next-line class-methods-use-this
  async onMessage(topic, message) {
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

      // Se hace el POST pero no se asigna a una variable ya que no se utiliza
      await axios.post(url, payload);

      // Comentario o eliminación de la declaración console
    } catch (error) {
      // Es aceptable dejar el console.error aquí para el registro de errores
      // eslint-disable-next-line no-console
      console.error(`An error occurred while processing the message: ${error}`);
    }
  }
}
const mqttBroker = process.env.MQTT_BROKER;
const mqttPort = process.env.MQTT_PORT;
const mqttUser = process.env.MQTT_USER;
const mqttPassword = process.env.MQTT_PASSWORD;

// eslint-disable-next-line no-new
new MQTTClient(mqttBroker, mqttPort, mqttUser, mqttPassword);