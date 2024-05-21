const { Worker, Job } = require('bullmq');
const axios = require('axios');
require('dotenv').config();

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
};

const worker = new Worker('flights recommendation', async (job) => {
  console.log('Worker received job:', job.id); // Log del recibo del trabajo

  const { userId, latitudeIp, longitudeIp, lastFlight } = job.data;
  const sameDepartureFlightsUrl = `http://app:3000/flights?departure=${lastFlight.arrival_airport_id}`;
  
  try {
    const response = await axios.get(sameDepartureFlightsUrl);
    if (!response.data) {
      throw new Error('No data found');
    } else {
      const sameDepartureFlights = response.data.flights;
      console.log('Fetched same departure flights:', sameDepartureFlights.length);

      // Paso 2: Obtener los últimos 20 vuelos que salgan dentro de la semana después de la compra
      const lastFlights = sameDepartureFlights.filter((flight) => {
        const lastArrivalTime = new Date(lastFlight.arrival_airport_time);
        const flightDepartureTime = new Date(flight.departure_airport_time);
        const timeDiffInDays = Math.abs(lastArrivalTime - flightDepartureTime) / (1000 * 60 * 60 * 24);

        return lastArrivalTime < flightDepartureTime && timeDiffInDays <= 7;
      }).slice(0, 20);  // Revisar
      console.log('Filtered last flights:', lastFlights.length);

      // Paso 3: Obtener las coordenadas de los aeropuertos de destino de los últimos 20 vuelos
      const flightCoordinatesPromises = lastFlights.map(async (flight) => {
        const geoCodeUrl = `https://geocode.maps.co/search?q=${encodeURIComponent(flight.arrival_airport_name)}&api_key=${process.env.GEOCODE_API_KEY}`;
        console.log("geocode:", geoCodeUrl)
        const geoResponse = await fetch(geoCodeUrl);
        const location = await geoResponse.json();
        return { ...flight, latitude: location[0].lat, longitude: location[0].lon };
      });

      const flightsWithCoordinates = await Promise.all(flightCoordinatesPromises);
      console.log('Got coordinates for flights:', flightsWithCoordinates.length);

      // Paso 4: Calcular la distancia y ordenar según el precio y distancia
      const toRadians = (degrees) => degrees * (Math.PI / 180);
      const calculateDistance = (lat1, lon1, lat2, lon2) => {
          const R = 6371; // Radio de la Tierra en km
          const dLat = toRadians(lat2 - lat1);
          const dLon = toRadians(lon2 - lon1);
          const a = 
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c; // Distancia en km
      };

      const flightsWithPonder = flightsWithCoordinates.map((flight) => {
        const distance = calculateDistance(latitudeIp, longitudeIp, flight.latitude, flight.longitude);
        const pond = distance / flight.price;
        return { ...flight, distance, pond };
      });
      console.log('Calculated ponder for flights:', flightsWithPonder.length);

      // Paso 5: Ordenar y obtener las 3 mejores recomendaciones
      const top3Flights = flightsWithPonder.sort((a, b) => a.pond - b.pond).slice(0, 3);
      console.log('Top 3 flights:', top3Flights);

      return top3Flights;
    } 
  } catch (error) {
    console.error(`Error while fetching flights: ${error}`);
    throw error;
  }
    
}, { connection });

// Callback on completed jobs
worker.on("completed", (job, returnvalue) => {
  console.log(`Worker completed job ${job.id} with result ${returnvalue}`);
});

// Callback on failed jobs
worker.on("failed", (job, error) => {
  console.log(`Worker completed job ${job.id} with error ${error}`);
  // Do something with the return value.
});

// Callback on error of the worker
worker.on("error", (err) => {
  // log the error
  console.error(err);
});

// To handle gracefull shutdown of consummers
async function shutdown() {
  console.log("Received SIGTERM signal. Gracefully shutting down...");

  // Perform cleanup or shutdown operations here
  await worker.close();
  // Once cleanup is complete, exit the process
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

