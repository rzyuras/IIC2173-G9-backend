require('newrelic');
const express = require('express');
const { validationResult, body } = require('express-validator');
const mqtt = require('mqtt');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');
const { auth, claimCheck } = require('express-oauth2-jwt-bearer');
const cors = require('cors');
const jwtDecode = require('jwt-decode');
const nodemailer = require('nodemailer');
const Database = require('./db');
const tx = require('./trx');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'munoz.hernandez.lorenzo@gmail.com',
    pass: 'veof xwcs jzcy kjyh',
  },
});

const jwtCheck = auth({
  audience: 'https://dev-1op7rfthd5gfwdq8.us.auth0.com/api/v2/',
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  tokenSigningAlg: 'RS256',
  secret: process.env.AUTH0_SECRET,
  algorithms: ['RS256'],
  issuer: process.env.AUTH0_ISSUER_BASE_URL,
});

const corsOptions = {
  origin: '*',
  allowHeaders: [
    'Access-Control-Allow-Headers',
    'Origin',
    'Accept',
    'X-Requested-With',
    'Content-Type',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'Auth',
  ],
  allowMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'POST', 'DELETE', 'PATCH'],
};

const checkAdmin = (req, res, next) => {
  const role = req.auth.payload['https://matiasoliva.me/role'];
  if (role && role.includes('Admin')) {
    return next();
  }
  return res.status(403).json({ message: 'Unauthorized: Admin Role Required' });
};

// Datos de conexión PostgreSQL
const pgDbname = process.env.DATABASE_NAME;
const pgUser = process.env.DATABASE_USER;
const pgPassword = process.env.DATABASE_PASSWORD;
const pgHost = 'db'; // O usa 'localhost' según tu configuración local
const mqttBroker = process.env.MQTT_BROKER;
const mqttPort = process.env.MQTT_PORT;
const mqttUser = process.env.MQTT_USER;
const mqttPassword = process.env.MQTT_PASSWORD;

// Crear instancia de Database
const db = new Database(pgDbname, pgUser, pgPassword, pgHost);
db.connect();

db.client.on('notification', async (msg) => {
  try {
    const payload = JSON.parse(msg.payload);
    const userId = payload.user_id;
    const flightId = payload.flight_id; // arreglar
    const lastFlight = await db.getFlight(flightId);
    const latitudeIp = payload.latitude_ip;
    const longitudeIp = payload.longitude_ip;
    // Hacer un post al worker.matiasoliva.me
    const message = {
      userId,
      lastFlight,
      latitudeIp,
      longitudeIp,
    };

    const request = await fetch('https://8ilp4td039.execute-api.us-east-2.amazonaws.com/dev/job', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    await db.createRecommendation(userId);
    const result = await request.json();
    if (result.length === 3) {
      const flight1 = result[0];
      const flight2 = result[1];
      const flight3 = result[2];
      await db.updateRecommendation(userId, flight1.id, flight2.id, flight3.id);
    }
  } catch (error) {
    console.log('Error during notification: ', error);
  }
});

db.client.query('LISTEN table_update');

// Conectarse al Broker
const client = mqtt.connect(`mqtt://${mqttBroker}:${mqttPort}`, {
  username: mqttUser,
  password: mqttPassword,
});

client.on('connect', () => {
  console.log('Connected to MQTT Broker');
});

client.on('error', (error) => {
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

app.get('/flights', async (req, res) => {
  try {
    const {
      page = 1, count = 25, departure, arrival, date,
    } = req.query;
    const flights = await db.getAllFlights();
    const actualDatetime = moment().utc();
    let flightsFiltered = flights;

    if (departure && !arrival && !date) {
      flightsFiltered = flights.filter(
        (flight) => flight.departure_airport_id === departure,
      );
    } else if (arrival && !departure && !date) {
      flightsFiltered = flights.filter(
        (flight) => flight.arrival_airport_id === arrival,
      );
    } else if (date && !departure && !arrival) {
      flightsFiltered = flights.filter(
        (flight) => moment(flight.departure_airport_time).format('YYYY-MM-DD') === date
          && actualDatetime <= moment(flight.departure_airport_time),
      );
    } else if (departure && arrival && !date) {
      flightsFiltered = flights.filter(
        (flight) => flight.departure_airport_id === departure
          && flight.arrival_airport_id === arrival,
      );
    } else if (departure && date && !arrival) {
      flightsFiltered = flights.filter(
        (flight) => flight.departure_airport_id === departure
          && moment(flight.departure_airport_time).format('YYYY-MM-DD') === date
          && actualDatetime <= moment(flight.departure_airport_time),
      );
    } else if (arrival && date && !departure) {
      flightsFiltered = flights.filter(
        (flight) => flight.arrival_airport_id === arrival
          && moment(flight.departure_airport_time).format('YYYY-MM-DD') === date
          && actualDatetime <= moment(flight.departure_airport_time),
      );
    } else if (departure && arrival && date) {
      flightsFiltered = flights.filter(
        (flight) => flight.departure_airport_id === departure
          && flight.arrival_airport_id === arrival
          && moment(flight.departure_airport_time).format('YYYY-MM-DD') === date
          && actualDatetime <= moment(flight.departure_airport_time),
      );
    }

    const startIndex = (page - 1) * count;
    const selectedFlights = flightsFiltered.slice(
      startIndex,
      startIndex + count,
    );

    res.json({ flights: selectedFlights });
  } catch (error) {
    console.log('Error during get flights: ', error);
    res
      .status(500)
      .json({ message: 'Error retrieving flights', error: error.message });
  }
});

app.post('/flights', async (req, res) => {
  try {
    const { body } = req;

    body.departure_airport_time = moment.tz(body.departure_airport_time, 'YYYY-MM-DD HH:mm', 'America/Santiago');
    body.departure_airport_time = body.departure_airport_time.utc().format();

    body.arrival_airport_time = moment.tz(body.arrival_airport_time, 'YYYY-MM-DD HH:mm', 'America/Santiago');
    body.arrival_airport_time = body.arrival_airport_time.utc().format();

    const flightData = new FlightData(body);
    await db.insertFlight(flightData);
    res.status(201).json({ message: 'Flight inserted successfully' });
  } catch (error) {
    res.status(500).json({
      message: 'An error occurred inserting the flight',
      error: error.message,
    });
  }
});

app.get('/flights/recommendations', jwtCheck, async (req, res) => {
  try {
    const userId = req.auth.payload.sub;
    await db.createRecommendation(userId);
    const recommendedFlights = await db.getRecommendation(userId);
    res.json({ flights: recommendedFlights });
  } catch (error) {
    console.log('Error during get recommended flights: ', error);
    res.status(500).json({ message: 'Error getting flights', error: error.message });
  }
});

app.get('/purchase', jwtCheck, async (req, res) => {
  try {
    const userId = req.auth.payload.sub;
    const purchases = await db.getMyPurchases(userId);
    res.json({ purchases });
  } catch (error) {
    console.log('Error during get purchase: ', error);
    res
      .status(500)
      .json({ message: 'Error retrieving purchases', error: error.message });
  }
});

app.post('/flights/request', jwtCheck, async (req, res) => { // no poder comprar si hay menos tickets
  try {
    const { body } = req;
    const flight = await db.getFlight(body.flight_id);
    const amount = body.quantity * flight.price;
    const purchase = await db.insertPurchase({
      flight_id: body.flight_id,
      user_id: req.auth.payload.sub,
      purchase_status: 'pending',
      uuid: uuidv4(),
      quantity: body.quantity,
      username: body.name,
      purchase_type: body.purchase_type,
      action_type: 'seller0',
    });

    // WebPay Integration
    const ticket = await tx.create(String(purchase.id), 'test-g9', amount, `${process.env.BASE_FRONT_URL}/purchase`);

    const message = {
      request_id: purchase.uuid,
      group_id: '9',
      departure_airport: flight.departure_airport_id,
      arrival_airport: flight.arrival_airport_id,
      departure_time: moment(flight.departure_airport_time)
        .tz('America/Santiago')
        .format('YYYY-MM-DD HH:mm'),
      datetime: moment().tz('America/Santiago').format('YYYY-MM-DD HH:mm'),
      deposit_token: ticket.token,
      quantity: body.quantity,
      seller: 0,
    };

    db.updatePurchaseDir(purchase.uuid, body.latitudeIp, body.longitudeIp);
    client.publish('flights/requests', JSON.stringify(message));

    res.status(201).json({
      status: 'ok',
      purchase_uuid: purchase.uuid,
      ticket,

    });
  } catch (error) {
    console.log('Error during request purchase: ', error);
    res.status(500).json({
      message: 'An error occurred processing the request purchase in flight/request',
      error: error.message,
    });
  }
});

app.post('/flights/admin/request', jwtCheck, checkAdmin, async (req, res) => { // no poder comprar si no es admin!!!!!!!!!!!!!!!
  try {
    const { body } = req;
    const flight = await db.getFlight(body.flight_id);
    const amount = body.quantity * flight.price;
    const purchase = await db.insertPurchase({
      flight_id: body.flight_id,
      user_id: req.auth.payload.sub,
      purchase_status: 'pending',
      uuid: uuidv4(),
      quantity: body.quantity,
      username: body.name,
      purchase_type: 'standard',
      action_type: 'seller9',
    });

    // WebPay Integration
    const ticket = await tx.create(String(purchase.id), 'test-g9', amount, `${process.env.BASE_FRONT_URL}/purchase`);

    const message = {
      request_id: purchase.uuid,
      group_id: '9',
      departure_airport: flight.departure_airport_id,
      arrival_airport: flight.arrival_airport_id,
      departure_time: moment(flight.departure_airport_time)
        .tz('America/Santiago')
        .format('YYYY-MM-DD HH:mm'),
      datetime: moment().tz('America/Santiago').format('YYYY-MM-DD HH:mm'),
      deposit_token: ticket.token,
      quantity: body.quantity,
      seller: 9,
    };

    db.updatePurchaseDir(purchase.uuid, body.latitudeIp, body.longitudeIp);
    client.publish('flights/requests', JSON.stringify(message));

    res.status(201).json({
      status: 'ok',
      purchase_uuid: purchase.uuid,
      ticket,

    });
  } catch (error) {
    console.log('Error during request purchase: ', error);
    res.status(500).json({
      message: 'An error occurred processing the request purchase in flight/request',
      error: error.message,
    });
  }
});

app.post(
  '/flights/request/other',
  jwtCheck,
  body('request_id').notEmpty().isAscii(),
  body('group_id').notEmpty().isInt(),
  body('departure_airport').notEmpty().isAscii(),
  body('arrival_airport').notEmpty().isAscii(),
  body('departure_time').notEmpty().matches(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/),
  body('datetime').notEmpty().isAscii(),
  body('deposit_token').notEmpty(),
  body('quantity').notEmpty().isInt(),
  body('seller').notEmpty(),
  async (req) => {
    try {
      const { body } = req;
      const result = validationResult(req);

      if (result.isEmpty() && body.group_id !== '9') {
        let horaChile = moment.tz(body.departure_time, 'YYYY-MM-DD HH:mm', 'America/Santiago');
        horaChile = horaChile.utc().format();

        const flight = await db.getFlightBydata(
          body.departure_airport,
          body.arrival_airport,
          horaChile,
        );

        if (flight) {
          await db.insertPurchase({
            flight_id: flight.id,
            user_id: 'null',
            purchase_status: 'pending',
            uuid: body.request_id,
            quantity: body.quantity,
          });
        }
      } else {
        console.log(`Invalid data request from group ${body.group_id}`);
      }
    } catch (error) {
      console.log('Error during request purchase by other groups: ', error);
    }
  },
);

app.post('/flights/commit', jwtCheck, async (req, res) => {
  try {
    const purchaseUuid = req.body.purchase_uuid;
    const purchase = await db.getPurchaseByUuid(purchaseUuid);
    const { action_type } = purchase;
    const wsToken = req.body.ws_token;
    const { userEmail } = req.body;
    if (wsToken) {
      const commitedTx = await tx.commit(wsToken);
      var commitedStatus = commitedTx.status === 'AUTHORIZED';
      if (commitedStatus) {
        const mailOptions = {
          from: 'munoz.hernandez.lorenzo@gmail.com',
          to: userEmail,
          subject: 'Pago exitoso',
          text: '¡Tu pago ha sido recibido exitosamente!\n\nGracias por comprar en FlightsApp.\nVolar nunca fue tan fácil😉',
          html: '<strong>¡Tu pago ha sido recibido exitosamente!</strong><br><br>Gracias por comprar en FlightsApp.<br>Volar nunca fue tan fácil😉',
        };
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log(error);
          } else {
            //
          }
        });

        res.status(200).json({ message: 'Pago Aprobado' });
      } else {
        res.status(200).json({ message: 'Pago Rechazado' });
      }
    } else {
      var commitedStatus = false;
      res.status(200).json({ message: 'Compra Anulada por el Usuario' });
    }

    const message = {
      request_id: purchaseUuid,
      group_id: '9',
      seller: action_type === 'seller9' ? 9 : 0,
      valid: commitedStatus,
    };
    client.publish('flights/validation', JSON.stringify(message));
  } catch (error) {
    console.log('Error during commit purchase: ', error);
    res.status(500).json({
      message: 'An error occurred processing the commit purchase',
      error: error.message,
    });
  }
});

app.post('/flights/validation', async (req, res) => {
  try {
    const { body } = req;
    const requestId = body.request_id;

    setTimeout(async () => {
      let validation = Boolean(body.valid);
      const purchase = await db.getPurchaseByUuid(requestId);

      if (purchase) {
        const flight = await db.getFlight(purchase.flight_id);
        const flightTickets = parseInt(flight.flight_tickets, 10);
        if (parseInt(purchase.quantity, 10) > flightTickets) {
          validation = false;
        }
        if (validation) {
          const purchaseData = await db.updatePurchaseStatus(requestId, 'approved');

          const pdfData = {
            userName: purchase.username,
            flightDetails: {
              flightId: flight.id,
              airline_logo: flight.airline_logo_url,
              airline: flight.airline,
              departure_airport_time: flight.departure_airport_time,
              departure_airport_id: flight.departure_airport_id,
              departure_airport_name: flight.departure_airport_name,
              arrival_airport_time: flight.arrival_airport_time,
              arrival_airport_id: flight.arrival_airport_id,
              arrival_airport_name: flight.arrival_airport_name,
              price: flight.price,
            },
            receiptId: purchase.uuid,
            quantity: purchase.quantity,
            totalPrice: flight.price * purchase.quantity,
          };
          try {
            const response = await fetch('https://y9bbgbpn0h.execute-api.us-east-2.amazonaws.com/dev/generate-pdf', {
              method: 'POST',
              body: JSON.stringify(pdfData),
            });

            if (response.ok) {
              const result = await response.json();
              const receiptUrl = result.url;
              await db.updateReceiptUrl(requestId, receiptUrl);

              if (purchase.purchase_type === 'standard') {
                await db.updateFlightTickets(purchaseData.quantity, purchaseData.flight_id);
              } else if (purchase.purchase_type === 'group') {
                await db.updateGroupTickets(purchaseData.quantity, purchaseData.flight_id);
              } else {
                console.log('Invalid purchase type');
              }
              if (body.seller === 9) {
                await db.updateGroupTickets(-1 * purchaseData.quantity, purchaseData.flight_id);
              }

              res.status(200).json({ message: 'Purchase validated, flight updated, and PDF generated', receiptUrl });
            } else {
              res.status(response.status).json({ message: 'Purchase validated and flight updated, but error generating PDF' });
            }
          } catch (error) {
            console.log('Error during PDF generation: ', error);
          }
        } else {
          await db.updatePurchaseStatus(requestId, 'rejected');
          res.status(200).json({ message: 'Purchase rejected due to insufficient tickets' });
        }
      }
    }, 1000);
  } catch (error) {
    console.log('Error during validation: ', error);
    res.status(500).json({
      message: 'An error occurred sending the validation',
      error: error.message,
    });
  }
});

app.get('/flights/:identifier', async (req, res) => {
  try {
    const flight = await db.getFlight(req.params.identifier);
    res.json({ flight });
  } catch (error) {
    console.log('Error during get flight: ', error);
    res
      .status(500)
      .json({ message: 'Error retrieving flight', error: error.message });
  }
});

app.get('/flights/auctions', jwtCheck, checkAdmin, async (req, res) => {
  try {
    const auctions = await db.getAllAuctions();
    res.json({ auctions });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving auctions', error: error.message });
  }
});


app.post('/flights/auctions', jwtCheck, checkAdmin, async (req, res) => {
  try {
    const auction = {
      auction_id: uuidv4(),
      proposal_id: "",
      departure_airport: req.body.departure_airport,
      arrival_airport: req.body.arrival_airport,
      departure_time: moment.tz(req.body.departure_time, 'YYYY-MM-DD HH:mm', 'America/Santiago').utc().format(),
      airline: req.body.airline,
      quantity: req.body.quantity,
      group_id: req.body.group_id,
      type: 'offer'
    };
    await db.insertAuction(auction);
    client.publish('flights/auctions', JSON.stringify(auction));
    res.status(201).json({ message: 'Auction created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating auction', error: error.message });
  }
});


app.post('/flights/auctions/proposal', jwtCheck, checkAdmin, async (req, res) => {
  try {
    const proposal = {
      auction_id: req.body.auction_id,
      proposal_id: uuidv4(),
      departure_airport: req.body.departure_airport,
      arrival_airport: req.body.arrival_airport,
      departure_time: moment.tz(req.body.departure_time, 'YYYY-MM-DD HH:mm', 'America/Santiago').utc().format(),
      airline: req.body.airline,
      quantity: req.body.quantity,
      group_id: req.body.group_id,
      type: 'proposal'
    };
    await db.insertProposal(proposal);
    client.publish('flights/auctions', JSON.stringify(proposal));
    res.status(201).json({ message: 'Proposal created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating proposal', error: error.message });
  }
});


app.post('/flights/auctions/response', jwtCheck, checkAdmin, async (req, res) => {
  try {
    const response = {
      auction_id: req.body.auction_id,
      proposal_id: req.body.proposal_id,
      departure_airport: req.body.departure_airport,
      arrival_airport: req.body.arrival_airport,
      departure_time: moment.tz(req.body.departure_time, 'YYYY-MM-DD HH:mm', 'America/Santiago').utc().format(),
      airline: req.body.airline,
      quantity: req.body.quantity,
      group_id: req.body.group_id,
      type: req.body.type 
    };
    await db.insertResponse(response);
    client.publish('flights/auctions', JSON.stringify(response));
    res.status(201).json({ message: 'Response sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error sending response', error: error.message });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

