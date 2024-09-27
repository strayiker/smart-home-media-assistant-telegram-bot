# Variables
IMAGE_NAME = smart-home-media-assistant-bot
DATA_PATH = ./volumes/data
ENV_FILE = .env

# Build the Docker image
build:
	podman build -t $(IMAGE_NAME) .

# Run the Docker container
run:
	podman rm --ignore $(IMAGE_NAME)
	podman run \
		-v $(DATA_PATH):/data \
		--name $(IMAGE_NAME) \
		--env-file $(ENV_FILE) \
		--network host \
		--restart unless-stopped \
		--tty \
		$(IMAGE_NAME)

# Stop and remove the Docker container
stop:
	podman stop $(IMAGE_NAME)
	podman rm $(IMAGE_NAME)

# Rebuild and rerun the Docker container
rebuild:
	stop build run

# Remove all stopped containers
clean:
	podman container prune -f

.PHONY: build run stop rebuild clean
