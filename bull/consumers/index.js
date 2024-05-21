const { Worker } = require('bullmq');
const axios = require('axios');
require('dotenv').config();

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
};

const worker = new Worker('flightsRecommendation', async (job) => {
  const { userId, latitudeIp, longitudeIp, lastFlight } = job.data;
  const sameDepartureFlightsUrl = `http://app:3000/flights?departure=${lastFlight.arrival_airport_id}`;
  
  try {
    const response = await axios.get(sameDepartureFlightsUrl);
    const sameDepartureFlights = response.data;
    
    // Paso 2: Obtener los últimos 20 vuelos que salgan dentro de la semana después de la compra
    const lastFlights = sameDepartureFlights.filter((flight) => {
      const lastArrivalTime = new Date(lastFlight.arrival_airport_time);
      const flightDepartureTime = new Date(flight.departure_airport_time);
      const timeDiffInDays = Math.abs(lastArrivalTime - flightDepartureTime) / (1000 * 60 * 60 * 24);

      return lastArrivalTime < flightDepartureTime && timeDiffInDays <= 7;
    }).slice(0, 20);  // Revisar

    // Paso 3: Obtener las coordenadas de los aeropuertos de destino de los últimos 20 vuelos
    const flightCoordinatesPromises = lastFlights.map(async (flight) => {
      const geoCodeUrl = `https://geocode.maps.co/search?q=${flight.arrival_airport_name}&api_key=${process.env.GEOCODE_API_KEY}`;
      const geoResponse = await axios.get(geoCodeUrl);
      const location = geoResponse.data[0];
      return { ...flight, latitude: location.lat, longitude: location.lon };
    });

    const flightsWithCoordinates = await Promise.all(flightCoordinatesPromises);

    // Paso 4: Calcular la distancia y ordenar según el precio y distancia
    const calculateDistance = (coord1, coord2) => {
      const R = 6371e3; // Radio de la Tierra en metros
      const φ1 = coord1.latitude * Math.PI / 180;
      const φ2 = coord2.latitude * Math.PI / 180;
      const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
      const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      const distance = R * c; // Distancia en metros
      return distance;
    };

    const ipCoord = { latitude: latitudeIp, longitude: longitudeIp };
    const flightsWithPonder = flightsWithCoordinates.map((flight) => {
      const flightCoord = { latitude: flight.latitude, longitude: flight.longitude };
      const distance = calculateDistance(ipCoord, flightCoord);
      const pond = distance / flight.price;
      return { ...flight, distance, pond };
    });

    // Paso 5: Ordenar y obtener las 3 mejores recomendaciones
    const top3Flights = flightsWithPonder.sort((a, b) => a.pond - b.pond).slice(0, 3);

    return top3Flights;
  } catch (error) {
    console.error(`Error while fetching flights: ${error}`);
    throw error;
  }
}, { connection });

console.log("Worker is listening for jobs...");
