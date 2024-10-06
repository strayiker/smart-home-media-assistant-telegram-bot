NAME = smart-home-media-assistant-telegram-bot

ifneq "$(use)" ""
CONTAINER_TOOL = $(use)
else
CONTAINER_TOOL = docker
endif

build:
	${CONTAINER_TOOL} build -t $(NAME) .

run:
	${CONTAINER_TOOL} run -d \
		-v ./data:/data \
		--name $(NAME) \
		--env-file .env \
		--network host \
		--restart unless-stopped \
		$(NAME)

logs:
	${CONTAINER_TOOL} logs -f $(NAME)

stop:
	${CONTAINER_TOOL} stop $(NAME)
	${CONTAINER_TOOL} rm $(NAME)

.PHONY: build run stop clean
