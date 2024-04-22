const express = require("express");
const mqtt = require("mqtt");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment-timezone");
const { auth } = require("express-oauth2-jwt-bearer");
const cors = require("cors");
const Database = require("./db");
require("dotenv").config();

const jwtCheck = auth({
  audience: "https://dev-1op7rfthd5gfwdq8.us.auth0.com/api/v2/",
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  tokenSigningAlg: "RS256",
  secret: process.env.AUTH0_SECRET,
  algorithms: ["RS256"],
  issuer: process.env.AUTH0_ISSUER_BASE_URL,
});

const corsOptions = {
  origin: "*",
  allowHeaders: [
    "Access-Control-Allow-Headers",
    "Origin",
    "Accept",
    "X-Requested-With",
    "Content-Type",
    "Access-Control-Request-Method",
    "Access-Control-Request-Headers",
    "Auth",
  ],
  allowMethods: ["GET", "HEAD", "OPTIONS", "PUT", "POST", "DELETE", "PATCH"],
};

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
app.use(cors(corsOptions));

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
    let body = req.body;

    console.log("GUardando vuelo: departure y arrival", body.departure_airport_time, body.arrival_airport_time)
    body.departure_airport_time = moment.tz(body.departure_airport_time, "YYYY-MM-DD HH:mm", "America/Santiago");
    body.departure_airport_time = body.departure_airport_time.utc().format();

    body.arrival_airport_time = moment.tz(body.arrival_airport_time, "YYYY-MM-DD HH:mm", "America/Santiago");
    body.arrival_airport_time = body.arrival_airport_time.utc().format();

    console.log("GUardando vuelo mod: departure y arrival", body.departure_airport_time, body.arrival_airport_time)


    
    const flightData = new FlightData(body);
    await db.insertFlight(flightData);
    res.status(201).json({ message: "Flight inserted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "An error occurred inserting the flight",
      error: error.message,
    });
  }
});

app.get("/purchase", jwtCheck, async (req, res) => {
  try {
    console.log(req)
    const user_id = req.auth.payload.sub;;
    const purchases = await db.getMyPurchases(user_id);
    res.json({ purchases });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving purchases", error: error.message });
  }
});

app.post("/flights/request", jwtCheck, async (req, res) => {
  try {
    
    const { body } = req;


    if (body.type.includes("our_group_purchase")) {
      const flight = await db.getFlight(body.flight_id);
      const message = {
        request_id: uuidv4(),
        group_id: "9",
        departure_airport: flight.departure_airport_name,
        arrival_airport: flight.arrival_airport_name,
        departure_time: moment(flight.departure_airport_time)
          .tz("America/Santiago")
          .format("YYYY-MM-DD HH:mm"),
        datetime: moment().tz("America/Santiago").format("YYYY-MM-DD HH:mm"),
        deposit_token: "",
        quantity: body.quantity,
        seller: 0,
      };
      console.log(req);
      console.log(req.user);
      await db.insertPurchase({
        flight_id: body.flight_id,
        user_id: req.auth.payload.sub,
        purchase_status: "pending",
        uuid: message.request_id,
        quantity: body.quantity,
      });

      client.publish("flights/requests", JSON.stringify(message));

      // Si no hay error en la petición, responde con un mensaje de éxito (true)
      res.json({ success: true });

      // Otro Grupo
    } else if (body.type.includes("other_group_purchase")) {


      let horaChile = moment.tz(body.departure_time, "YYYY-MM-DD HH:mm", "America/Santiago");
      horaChile = horaChile.utc().format(); 




      console.log("Datos", body.departure_airport, body.arrival_airport, horaChile)
      const flight = await db.getFlightBydata(
        body.departure_airport,
        body.arrival_airport,
        horaChile
      );

      console.log("Vuelo", flight)

      if (flight) {
        await db.insertPurchase({
          flight_id: flight.id,
          user_id: "null",
          purchase_status: "pending",
          uuid: body.request_id,
          quantity: body.quantity,
        });
      }
      

    }
  } catch (error) {
    res.status(500).json({
      message: "An error occurred sending the request(API)",
      error: error.message,
    });
  }
});

app.post("/flights/validation", async (req, res) => {
  try {
    const { body } = req;

    console.log("BODY", body);
    const request_id = body.request_id;

    // Delay de 10 segundos
    setTimeout(async () => {
      let validation = Boolean(body.valid);

      const purchase = await db.getPurchase(request_id);
      console.log("PURCHASE", purchase);
      const flight = await db.getFlight(purchase.flight_id);
      const flight_tickets = parseInt(flight.flight_tickets);

      if (parseInt(purchase.quantity) > flight_tickets) {
        validation = false;
      }

      if (validation) {
        const purchaseData = await db.updatePurchase(request_id, "approved");
        await db.updateFlight(purchaseData.quantity, purchaseData.flight_id);
        res.status(200).json({ message: "Purchase validated and flight updated" });
      } else {
        await db.updatePurchase(request_id, "rejected");
        res.status(200).json({ message: "Purchase rejected due to insufficient tickets" });
      }
    }, 10000); // 10000 milisegundos = 10 segundos


  } catch (error) {
    console.log("Error during validation: ", error);
    res.status(500).json({
      message: "An error occurred sending the validation",
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);
