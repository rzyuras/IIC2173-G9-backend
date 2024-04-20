const express = require("express");
const mqtt = require("mqtt");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment-timezone");
const { auth } = require("express-oauth2-jwt-bearer");
const Database = require("./db"); // Asume que tienes un archivo db.js que exporta la clase Database
require("dotenv").config();

const jwtCheck = auth({
  audience: "https://my-api-endpoint/",
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  tokenSigningAlg: "RS256",
});

// Datos de conexión PostgreSQL
const pgDbname = process.env.DATABASE_NAME;
const pgUser = process.env.DATABASE_USER;
const pgPassword = process.env.DATABASE_PASSWORD;
const pgHost = "db"; // O usa 'localhost' según tu configuración local
const mqttBroker = process.env.MQTT_BROKER;
const mqttPort = process.env.MQTT_PORT;
const mqttUser = process.env.MQTT_USER;
const mqttPassword = process.env.MQTT_PASSWORD;

// Crear instancia de Database
const db = new Database(pgDbname, pgUser, pgPassword, pgHost);
db.connect();

// Conectarse al Broker
const client = mqtt.connect(`mqtt://${mqttBroker}:${mqttPort}`, {
  username: mqttUser,
  password: mqttPassword,
});

client.on("connect", () => {
  console.log("Connected to MQTT Broker");
});

client.on("error", (error) => {
  console.error(`An error occurred: ${error}`);
});

// Crea una instancia de Express y la almacena en la variable app.
const app = express();
app.use(express.json()); // Middleware para parsear JSON

class FlightData {
  constructor(data) {
    this.price = data.price;
    this.currency = data.currency;
    this.carbon_emissions = data.carbon_emissions;
    this.airline_logo_url = data.airline_logo_url;
    this.departure_airport_name = data.departure_airport_name;
    this.departure_airport_id = data.departure_airport_id;
    this.departure_airport_time = data.departure_airport_time;
    this.arrival_airport_name = data.arrival_airport_name;
    this.arrival_airport_id = data.arrival_airport_id;
    this.arrival_airport_time = data.arrival_airport_time;
    this.duration = data.duration;
    this.airplane = data.airplane;
    this.airline = data.airline;
    this.airline_logo = data.airline_logo;
  }
}

app.get("/flights", async (req, res) => {
  try {
    const { page = 1, count = 25, departure, arrival, date } = req.query;
    const flights = await db.getAllFlights();
    const actualDatetime = moment().utc();
    let flightsFiltered = flights;

    if (departure && !arrival && !date) {
      flightsFiltered = flights.filter(
        (flight) => flight.departure_airport_id === departure
      );
    } else if (arrival && !departure && !date) {
      flightsFiltered = flights.filter(
        (flight) => flight.arrival_airport_id === arrival
      );
    } else if (date && !departure && !arrival) {
      flightsFiltered = flights.filter(
        (flight) =>
          moment(flight.departure_airport_time).format("YYYY-MM-DD") === date &&
          actualDatetime <= moment(flight.departure_airport_time)
      );
    } else if (departure && arrival && !date) {
      flightsFiltered = flights.filter(
        (flight) =>
          flight.departure_airport_id === departure &&
          flight.arrival_airport_id === arrival
      );
    } else if (departure && date && !arrival) {
      flightsFiltered = flights.filter(
        (flight) =>
          flight.departure_airport_id === departure &&
          moment(flight.departure_airport_time).format("YYYY-MM-DD") === date &&
          actualDatetime <= moment(flight.departure_airport_time)
      );
    } else if (arrival && date && !departure) {
      flightsFiltered = flights.filter(
        (flight) =>
          flight.arrival_airport_id === arrival &&
          moment(flight.departure_airport_time).format("YYYY-MM-DD") === date &&
          actualDatetime <= moment(flight.departure_airport_time)
      );
    } else if (departure && arrival && date) {
      flightsFiltered = flights.filter(
        (flight) =>
          flight.departure_airport_id === departure &&
          flight.arrival_airport_id === arrival &&
          moment(flight.departure_airport_time).format("YYYY-MM-DD") === date &&
          actualDatetime <= moment(flight.departure_airport_time)
      );
    }

    const startIndex = (page - 1) * count;
    const selectedFlights = flightsFiltered.slice(
      startIndex,
      startIndex + count
    );

    res.json({ flights: selectedFlights });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving flights", error: error.message });
  }
});

app.get("/flights/:identifier", async (req, res) => {
  try {
    const flight = await db.getFlight(req.params.identifier);
    res.json({ flight });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving flight", error: error.message });
  }
});

app.post("/flights", async (req, res) => {
  try {
    const flightData = new FlightData(req.body);
    await db.insertFlight(flightData);
    res.status(201).json({ message: "Flight inserted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "An error occurred inserting the flight",
      error: error.message,
    });
  }
});

app.post("/flight/request-purchase", jwtCheck, async (req, res) => {
  try {
    const { body } = req.body;

    // Obtener la información del vuelo usando await
    const flight = await db.getFlight(body.flight_id);

    const message = {
      request_id: uuidv4(),
      group_id: "9",
      departure_airport: flight.departure_airport_name,
      arrival_airport: flight.arrival_airport_name,
      departure_time: moment(flight.departure_airport_time)
        .tz("America/Santiago")
        .toISOString(),
      datetime: moment().tz("America/Santiago").toISOString(),
      deposit_token: "",
      quantity: body.quantity,
      seller: 0,
    };

    // Insertar la compra en la base de datos
    await db.insertPurchase({
      flight_id: body.flight_id,
      user_id: req.user.sub,
      status: "pending",
      quantity: body.quantity,
    });

    // Publicar el mensaje usando await
    await client.publish("flights/request", JSON.stringify(message));

    res.status(201).json({ message: "Request sent successfully" });
  } catch (error) {
    res.status(500).json({
      message: "An error occurred sending the request",
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);
