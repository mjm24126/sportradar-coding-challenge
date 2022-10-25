import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway';
import { formatJSONResponse } from '../../libs/api-gateway';
import { middyfy } from '../../libs/lambda';
const { Client } = require('pg');

import schema from './schema';

export async function queryGameData(gameId:string) {
  const client = new Client({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE
  });
  await client.connect();

  try {
    const query = await client.query(`SELECT * FROM game_stats WHERE gamepk = ${gameId}`);
    console.log(query);
    client.end();
    return query.rows;
  } catch(error) {
    console.log(error);
    client.end();
    return error;
  }
}

export const getGameData: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const data = await queryGameData(event.pathParameters.gameId);

  return formatJSONResponse({
    gameId: event.pathParameters.gameId,
    message: `Game id ${event.pathParameters.gameId} requested. data array contains player data and stats for ${event.pathParameters.gameId} for every player in the game.`,
    data,
    event,
  });
};

export const main = middyfy(getGameData);