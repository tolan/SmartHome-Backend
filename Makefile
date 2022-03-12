.PHONY: docker-build-dev docker-build-production

SHELL := /bin/bash

default:
	cat Makefile

docker-dev-build:
	docker build -f Dockerfile-dev --tag smarthome:dev .

docker-dev-run:
	docker run -it --rm -u `id -u`:`id -g` -v `pwd`:/app smarthome:dev bash

docker-production-build:
	docker build -f Dockerfile-production --tag smarthome:production .

docker-dind-build:
	docker build -f ./docker/dind --tag smarthome:dind .

docker-dind-run:
	docker run -it --privileged -d -v `pwd`:/app -w /app -p 4444:4444 -p 4445:4445 --name smarthome-dind smarthome:dind

docker-dind-sh:
	docker exec -it smarthome-dind sh

docker-dind-stop:
	docker stop smarthome-dind
	docker rm smarthome-dind
