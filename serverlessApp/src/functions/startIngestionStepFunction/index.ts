import { handlerPath } from '@libs/handler-resolver';

export default {
  handler: `${handlerPath(__dirname)}/handler.handler`,
  environment: {
    "STATE_MACHINE_ARN": "arn:aws:states:us-east-1:950863967482:stateMachine:GameStatIngesterStateMachine-kz2GvDztBOMt"
  }
};
