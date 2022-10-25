aws iam create-policy --profile mjm  --policy-name rds-lambda-policy --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": "lambda:InvokeFunction",
            "Resource": "arn:aws:lambda:us-east-1:950863967482:function:nhl-stats-pipeline-dev-startIngestionStepFunction"
        },
        {
            "Sid": "VisualEditor1",
            "Effect": "Allow",
            "Action": "states:*",
            "Resource": "*"
        }
    ]
}'

aws iam create-role --profile mjm --role-name rds-lambda-role --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "rds.amazonaws.com"
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
                "Service": "states.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}'

aws iam attach-role-policy --profile mjm\
    --policy-arn arn:aws:iam::950863967482:policy/rds-lambda-policy \
    --role-name rds-lambda-role --region aws-region


aws rds add-role-to-db-instance --profile mjm \
    --db-instance-identifier nhl-game-stats-instance \
    --feature-name Lambda \
    --role-arn  arn:aws:iam::950863967482:role/rds-lambda-role