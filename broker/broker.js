const mqtt = require('mqtt');
const axios = require('axios');

const url = 'http://app:3000/flights';

class MQTTClient {
    constructor(broker, port, user, password) {
        this.client = mqtt.connect(`mqtt://${broker}:${port}`, { username: user, password: password });
        this.client.on('connect', this.onConnect.bind(this));
        this.client.on('message', this.onMessage.bind(this));
    }

    onConnect() {
        console.log("Connected to MQTT Broker!");
        this.client.subscribe("flights/info");
    }

    async onMessage(topic, message) {
        try {
            const data = JSON.parse(message)[0];
            const flights = JSON.parse(data.flights);
            const emissions = JSON.parse(data.carbonEmission);
            const payload = {
                price: parseInt(data.price),
                currency: data.currency,
                carbon_emissions: parseInt(emissions.this_flight),
                airline_logo_url: data.airlineLogo,
                departure_airport_name: flights[0].departure_airport.name,
                departure_airport_id: flights[0].departure_airport.id,
                departure_airport_time: flights[0].departure_airport.time,
                arrival_airport_name: flights[0].arrival_airport.name,
                arrival_airport_id: flights[0].arrival_airport.id,
                arrival_airport_time: flights[0].arrival_airport.time,
                duration: parseInt(flights[0].duration),
                airplane: flights[0].airplane,
                airline: flights[0].airline,
                airline_logo: flights[0].airline_logo
            };
            const response = await axios.post(url, payload);
            console.log(response.data);
            console.log("Message processed and saved successfully");
        } catch (error) {
            console.error(`An error occurred saving or processing the message: ${error}`);
        }
    }
}

const mqttBroker = 'broker.iic2173.org';
const mqttPort = 9000;
const mqttUser = 'students';
const mqttPassword = 'iic2173-2024-1-students';

const mqttClient = new MQTTClient(mqttBroker, mqttPort, mqttUser, mqttPassword);
