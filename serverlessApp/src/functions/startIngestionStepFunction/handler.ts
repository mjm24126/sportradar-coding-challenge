'use strict';

var aws = require('aws-sdk')

module.exports.handler = async (event, context, callback) => {
  console.log(event);
  console.log(process.env.STATE_MACHINE_ARN);
  const gameId = event.GameId;
  var params = {
    stateMachineArn: process.env.STATE_MACHINE_ARN,
    input: `{\"GameId\" : \"${gameId}\"}`
  }
  console.log(params);
  var stepfunctions = new aws.StepFunctions({region: 'us-east-1'})
  await stepfunctions.startExecution(params, function (err, data) {
    if (err) {
      console.log(err)
      console.log('err while executing step function')
    } else {
      console.log('started execution of step function')
      console.log(data);
    }
  })
}