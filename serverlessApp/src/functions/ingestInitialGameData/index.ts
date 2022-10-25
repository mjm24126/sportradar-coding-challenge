import { handlerPath } from '@libs/handler-resolver';

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  environment: {
    "PGUSER": "nhlgamestatsmaster",
    "PGHOST": "nhl-game-stats-instance.cu9z7citjfx6.us-east-1.rds.amazonaws.com",
    "PGDATABASE": "NHLGameStats",
    "PGPASSWORD": "hock3yStat$",
    "PGPORT": "5432"
  }
};
