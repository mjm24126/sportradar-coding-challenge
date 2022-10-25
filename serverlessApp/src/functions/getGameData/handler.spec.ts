import {describe, expect, test, jest, beforeEach, afterEach} from '@jest/globals';
import { getGameData, queryGameData } from './handler';
import { Client } from 'pg';

jest.mock('pg', () => {
  const mClient = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  };
  return { Client: jest.fn(() => mClient) };
});

describe('required env variables configured', () => {
  test('database variables configured', () => {
    expect(process.env.PGHOST).toBe("nhl-game-stats-instance.cu9z7citjfx6.us-east-1.rds.amazonaws.com");
    expect(process.env.PGUSER).toBe("nhlgamestatsmaster");
    expect(process.env.PGDATABASE).toBe("NHLGameStats");
    expect(process.env.PGPASSWORD).toBeDefined();
    expect(process.env.PGPORT).toBe("5432");
  });
});

describe('queryGameData calls expected db methods', () => {
  let client;

  beforeEach(() => {
    client = new Client();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return query.rows on success', async () => {
    const gameId = '2022020094';
    client.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const result = await queryGameData(gameId);
    expect(client.connect).toBeCalledTimes(1);
    expect(client.query).toBeCalledWith('SELECT * FROM game_stats WHERE gamepk = 2022020094');
    expect(client.end).toBeCalledTimes(1);
    expect(result).toEqual([]);
  });

  test('should return error on failure', async () => {
    const gameId = '2022020094';
    const mError = new Error('dead lock');
    client.query.mockRejectedValueOnce(mError);
    const result = await queryGameData(gameId);
    expect(client.connect).toBeCalledTimes(1);
    expect(client.query).toBeCalledWith('SELECT * FROM game_stats WHERE gamepk = 2022020094');
    expect(client.end).toBeCalledTimes(1);
    expect(result).toEqual(mError);
  });
});

describe('getGameData returns expected object', () => {
  let client;

  beforeEach(() => {
    client = new Client();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return player data array on success', async () => {
    const event = {
      "pathParameters": {
        "gameId": '2022020094'
      }
    };
    client.query.mockResolvedValueOnce({ rows: [{"playerId":"123","goals":1}], rowCount: 1 });
    const result = await getGameData(event);
    expect(result).toEqual({
      "body": "{\"gameId\":\"2022020094\",\"message\":\"Game id 2022020094 requested. data array contains player data and stats for 2022020094 for every player in the game.\",\"data\":[{\"playerId\":\"123\",\"goals\":1}],\"event\":{\"pathParameters\":{\"gameId\":\"2022020094\"}}}", 
      "statusCode": 200
    });
  });
});