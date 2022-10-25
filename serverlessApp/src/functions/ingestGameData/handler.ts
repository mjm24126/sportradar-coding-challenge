const axios = require("axios");
const dotenv = require('dotenv');
const { Client } = require('pg');
dotenv.config();

// Todo - break this code up into separate functions. one for axios call, one for db update loop. 
// Todo - call those functions from ingestIntialGameData

export const ingestGameData = async (event) => {
  console.log(event);
  const gameId = event.GameId;
  const gameStatsURL = `https://statsapi.web.nhl.com/api/v1/game/${gameId}/feed/live`;

  console.log(gameStatsURL);

  const response = await axios.get(gameStatsURL);
  const statusCode = response.status;
  if(statusCode === 200) {
    console.log(`game status: ${response.data.gameData.status.statusCode}`);
  } else {
    console.log('Error getting live data - non200\n');
    return {
      message: `error retrieving live game ${gameId} stats`,
      gameState: response.data.gameData.status.statusCode,
      GameId: event.GameId,
      event,
      responseStatus: statusCode
    };
  }

  const client = new Client({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE
  });
  await client.connect();

  const players = response.data.gameData.players;

  for (const [key, value] of Object.entries(players)) {
    // console.log(`${key}: ${value}`);
    const player = value;
    const playerId = player.id;
    const statId = `${gameId}${playerId}`;
    const playeridString = key;
    const teamid = player.currentTeam.id;

    const boxscore = response.data.liveData.boxscore;
    var playerStats;
    if(boxscore.teams.away.team.id === teamid) {
      if(boxscore.teams.away.players[playeridString].position.code === "G") {
        playerStats = boxscore.teams.away.players[playeridString].stats.goalieStats;  
      } else {
        playerStats = boxscore.teams.away.players[playeridString].stats.skaterStats;
      }
    } else {
      if(boxscore.teams.home.players[playeridString].position.code === "G") {
        playerStats = boxscore.teams.home.players[playeridString].stats.goalieStats;  
      } else {
        playerStats = boxscore.teams.home.players[playeridString].stats.skaterStats;
      }
    }

    const assists = playerStats && playerStats.assists ? playerStats.assists : 0;
    const goals = playerStats && playerStats.goals ? playerStats.goals : 0;
    const penaltyMinutes = playerStats && playerStats.penaltyMinutes ? playerStats.penaltyMinutes : 0;
    const hits = playerStats && playerStats.hits ? playerStats.hits : 0;
    const points = goals + assists;

    try {
      const query = await client.query(`UPDATE public.game_stats 
                      SET assists = ${assists}, 
                        goals = ${goals},
                        hits = ${hits},
                        points = ${points},
                        penaltyMinutes = ${penaltyMinutes},
                        lastupdated = current_timestamp
                      WHERE statid = ${statId}`);
      console.log(query);
    } catch(error) {
      client.end();
      return {
        message: `error ingesting ongoing ${gameId} stats`,
        gameState: response.data.gameData.status.statusCode,
        GameId: event.GameId,
        event,
        error
      };
    }
  }

  client.end();
  return {
    message: `ingesting ongoing ${gameId} stats`,
    gameState: response.data.gameData.status.statusCode,
    GameId: event.GameId,
    event,
  };
};

export const main = ingestGameData;
