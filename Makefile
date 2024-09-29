IMAGE_NAME = smart-home-media-assistant-bot
DATA_PATH = ./volumes/data
ENV_FILE = .env

build:
	docker build -t $(IMAGE_NAME) .

run:
	docker rm --ignore $(IMAGE_NAME)
	docker run -d \
		-v $(DATA_PATH):/data \
		--name $(IMAGE_NAME) \
		--env-file $(ENV_FILE) \
		--network host \
		--restart unless-stopped \
		$(IMAGE_NAME)

stop:
	docker stop $(IMAGE_NAME)
	docker rm $(IMAGE_NAME)

clean:
	docker container prune -f

.PHONY: build run stop clean
