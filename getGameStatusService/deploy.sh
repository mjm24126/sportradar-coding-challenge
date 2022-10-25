#!/usr/bin/env bash
set -ex
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 950863967482.dkr.ecr.us-east-1.amazonaws.com/game-status-service
docker build . -t game_status_web_app     
docker tag game_status_web_app:latest 950863967482.dkr.ecr.us-east-1.amazonaws.com/game-status-service:latest
docker push 950863967482.dkr.ecr.us-east-1.amazonaws.com/game-status-service:latest
AWS_REGION=us-east-1 aws ecs update-service --cluster GetGameStatusCluster --service GetGameStatusService --force-new-deployment