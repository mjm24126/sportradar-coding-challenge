import type { AWS } from '@serverless/typescript';

import getGameData from '@functions/getGameData';
import ingestGameData from '@functions/ingestGameData';
import ingestInitialGameData from '@functions/ingestInitialGameData';
import startIngestionStepFunction from '@functions/startIngestionStepFunction';

const serverlessConfiguration: AWS = {
  service: 'nhl-stats-pipeline',
  frameworkVersion: '3',
  plugins: ['serverless-esbuild'],
  params: {
    'region': {
      'type': 'string',
      'description': 'aws region',
      'AllowedValues' : ["us-east-1", "us-west-2"],
      "Default": "us-east-1",
    },
    'stage': {
      'type': 'string',
      'description': 'environment stage',
      "Default": "dev",
    }
  },
  provider: {
    name: 'aws',
    stage: 'dev',
    region: 'us-east-1',
    runtime: 'nodejs16.x',
    profile: 'mjm',
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
      REGION: 'us-east-1',
      STAGE: '{ "Ref" : "stage" }',
    },
    iam: {
      role: {
        statements: [
          {
            "Effect": "Allow",
            "Action": [
              "*"
            ],
            "Resource": "*"
          },
          {
            "Effect": "Allow",
            "Action": [
              "states:startExecution"
            ],
            "Resource": "*"
          }
        ]
      }
    }
  },
  // import the function via paths
  functions: { getGameData, ingestGameData, ingestInitialGameData, startIngestionStepFunction },
  resources: {
    Resources: {
      'NHLGameStats': {
        'Type' : 'AWS::RDS::DBInstance',
        'Properties' : {
            'DBInstanceIdentifier' : 'nhl-game-stats-instance',
            'DBName' : 'NHLGameStats',
            'AllocatedStorage' : 20,
            'DBInstanceClass' : 'db.t3.medium',
            'StorageType' : 'gp2',
            'Engine' : 'postgres',
            'EngineVersion' : '13.7',
            'MasterUsername' : 'nhlgamestatsmaster',
            'MasterUserPassword' : 'hock3yStat$',
            'Tags':[
              {
                "Key" : "Project",
                "Value" : "sportradar-challenge"
              }
            ]
          }
      },
      "GameStatIngesterStateMachineExecutionRole": {
        "Type": "AWS::IAM::Role",
        "Properties": {
            "AssumeRolePolicyDocument": {
                "Version": "2012-10-17",
                "Statement": [
                  {
                    "Effect": "Allow",
                    "Principal": {
                        "Service": "states.amazonaws.com"
                    },
                    "Action": "sts:AssumeRole"
                  },
                  {
                      "Effect": "Allow",
                      "Principal": {
                          "Service": "lambda.amazonaws.com"
                      },
                      "Action": "sts:AssumeRole"
                  },
                  {
                      "Effect": "Allow",
                      "Principal": {
                          "Service": "rds.amazonaws.com"
                      },
                      "Action": "sts:AssumeRole"
                  }
                ]
            },
            "Path": "/",
            "Policies": [
                {
                    "PolicyName": "root",
                    "PolicyDocument": {
                        "Version": "2012-10-17",
                        "Statement": [
                            {
                                "Effect": "Allow",
                                "Action": "*",
                                "Resource": "*"
                            }
                        ]
                    }
                }
            ]
        }
      },
      'GameStatIngesterStateMachine': {
        'Type': 'AWS::StepFunctions::StateMachine',
        'Properties': {
          'Definition': {
            "Comment": "Collects game stats until a game is no longer live",
            "StartAt": "Lambda - Ingest Initial Game Data",
            "States": {
              "Lambda - Ingest Initial Game Data": {
                "Type": "Task",
                "Resource": "arn:aws:states:::lambda:invoke",
                "OutputPath": "$.Payload",
                "Parameters": {
                  "Payload.$": "$",
                  "FunctionName": "arn:aws:lambda:us-east-1:950863967482:function:nhl-stats-pipeline-dev-ingestInitialGameData:$LATEST"
                },
                "Retry": [
                  {
                    "ErrorEquals": [
                      "Lambda.ServiceException",
                      "Lambda.AWSLambdaException",
                      "Lambda.SdkClientException"
                    ],
                    "IntervalSeconds": 2,
                    "MaxAttempts": 6,
                    "BackoffRate": 2
                  }
                ],
                "Next": "Check if game is still live"
              },
              "Check if game is still live": {
                "Choices": [
                  {
                    "Or": [
                      {
                        "Variable": "$.gameState",
                        "StringMatches": "3"
                      },
                      {
                        "Variable": "$.gameState",
                        "StringMatches": "4"
                      }
                    ],
                    "Next": "Wait"
                  }
                ],
                "Default": "Success",
                "Type": "Choice"
              },
              "Wait": {
                "Type": "Wait",
                "Seconds": 10,
                "Next": "Lambda Ingest Game Data"
              },
              "Success": {
                "Type": "Succeed"
              },
              "Lambda Ingest Game Data": {
                "Type": "Task",
                "Resource": "arn:aws:states:::lambda:invoke",
                "OutputPath": "$.Payload",
                "Parameters": {
                  "Payload.$": "$",
                  "FunctionName": "arn:aws:lambda:us-east-1:950863967482:function:nhl-stats-pipeline-dev-ingestGameData:$LATEST"
                },
                "Retry": [
                  {
                    "ErrorEquals": [
                      "Lambda.ServiceException",
                      "Lambda.AWSLambdaException",
                      "Lambda.SdkClientException"
                    ],
                    "IntervalSeconds": 2,
                    "MaxAttempts": 6,
                    "BackoffRate": 2
                  }
                ],
                "Next": "Check if game is still live"
              }
            }
          },
          'RoleArn': 'arn:aws:iam::950863967482:role/service-role/StepFunctions-GameStatIngesterTest-role-39c35711',
          'TracingConfiguration': {
            "Enabled" : true
          }
        }
      }
    },
    Outputs: {
      'DatabaseEndpoint': {
        'Description': 'Endpoint for master database',
        'Value': {
          "Fn::GetAtt": [
            "NHLGameStats",
            "Endpoint.Address"
          ]
        }
      },
      'PortDB': {
        'Description': 'Port of the newly created RDS PostgreSQL master',
        'Value': {
          "Fn::GetAtt": [
            "NHLGameStats",
            "Endpoint.Port"
          ]
        }
      },
      'JdbcConnString': {
        'Description': 'JDBC connection string of newly created RDS PostgreSQL master, w/o password',
        'Value': {
          "Fn::Join": [
            "", [
              "jdbc:postgresql://:",
              {
                "Fn::GetAtt": [
                  "NHLGameStats",
                  "Endpoint.Address"
                ]
              },
              ":",
              {
                "Fn::GetAtt": [
                  "NHLGameStats",
                  "Endpoint.Port"
                ]
              },
              "/",
              "nhl-game-stats",
              "?user=",
              "nhlgamestatsmaster",
              "&password=",
              "hock3yStat$"            
            ]
          ]
        }
      },
    }
  },
  package: { individually: true },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ['aws-sdk','pg-native'],
      target: 'node14',
      define: { 'require.resolve': undefined },
      platform: 'node',
      concurrency: 10
    },
  },
};

module.exports = serverlessConfiguration;
