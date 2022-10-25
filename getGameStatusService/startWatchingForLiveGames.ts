const axios = require('axios');

const scheduleURL = 'https://statsapi.web.nhl.com/api/v1/schedule';
const requestIntervalMS = 2000;  // how often to call schedule endpoint for latest game statuses

export async function startWatchingForGameStatus(client) {
  setInterval(getSchedule, requestIntervalMS, client);
}

export async function getSchedule(client) {
  try {
    const response = await axios.get(scheduleURL);
    console.log(response);
    const statusCode = response.status;
    if(statusCode === 200) {
      let bigQuery = '';
      response.data.dates[0].games
        .forEach(element => {
          const pk = Number(element.gamePk);
          const gameStatus = Number(element.status.statusCode);
          const upsertQuery = `INSERT INTO games(gamePk, statusCode, lastupdated) VALUES(${pk}, ${gameStatus}, current_timestamp) ON CONFLICT (gamePk) DO UPDATE SET statusCode = ${gameStatus}, lastupdated = current_timestamp;`;

          bigQuery += upsertQuery;

          if(gameStatus == 3 || gameStatus == 4) {
            console.log(element.gamePk + ` is live now.`);
          }
        });
      
      const res = await client.query(bigQuery);
      console.log(res);
      console.log(`updated ${res.length} rows`);
      return res;
    } else {
      console.log('Error retrieving schedule data.');
    }
  } catch(e) {
    console.log('Error inserting games\n', e);
  }
}
