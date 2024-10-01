IMAGE_NAME = smart-home-media-assistant-bot
DATA_PATH = ./volumes/data
ENV_FILE = .env

ifneq "$(use)" ""
BUILDTOOL = $(use)
else
BUILDTOOL = docker
endif

build:
	${BUILDTOOL} build -t $(IMAGE_NAME) .

run:
	${BUILDTOOL} stop $(IMAGE_NAME)
	${BUILDTOOL} rm --ignore $(IMAGE_NAME)
	${BUILDTOOL} run -d \
		-v $(DATA_PATH):/data \
		--name $(IMAGE_NAME) \
		--env-file $(ENV_FILE) \
		--network host \
		--restart unless-stopped \
		$(IMAGE_NAME)

logs:
	${BUILDTOOL} logs -f $(IMAGE_NAME)

stop:
	${BUILDTOOL} stop $(IMAGE_NAME)
	${BUILDTOOL} rm $(IMAGE_NAME)

clean:
	${BUILDTOOL} container prune -f

.PHONY: build run stop clean
