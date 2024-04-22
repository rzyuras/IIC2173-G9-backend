const moment = require("moment-timezone");

// Hora en formato local chileno
let horaChilena = '2024-04-29 15:45';


let horaChile = moment.tz(body.departure_time, "YYYY-MM-DD HH:mm", "America/Santiago");
horaChile = horaChile.utc().format();  // Esto formateará la fecha en ISO 8601 en UTC

console.log(horaUTC); // Muestra la hora en formato ISO 8601 en UTC
