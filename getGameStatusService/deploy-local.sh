#!/usr/bin/env ts-node
set -ex
docker build . -t game_status_web_app

docker run game_status_web_app