#!/usr/bin/env bash

set -euo pipefail

IMAGE_NAME="${IMAGE_NAME:-status-api}"
CONTAINER_NAME="${CONTAINER_NAME:-status-api}"
TAG="${TAG:-latest}"
HOST_PORT="${HOST_PORT:-3000}"
CONTAINER_PORT="${CONTAINER_PORT:-3000}"

usage() {
	cat <<'EOF'
Usage: ./script <command>

Commands:
  build     Build the Docker image. Uses buildx when available.
  run       Stop/remove the old container, then run the image in detached mode.
  stop      Stop the running container.
  clean     Stop/remove the container and remove the image.
  rebuild   Clean the old version, build a fresh image, then run it.
  logs      Show container logs.
  help      Show this help message.

Optional environment variables:
  IMAGE_NAME      Default: status-api
  CONTAINER_NAME  Default: status-api
  TAG             Default: latest
  HOST_PORT       Default: 3000
  CONTAINER_PORT  Default: 3000
EOF
}

image_ref() {
	printf "%s:%s" "$IMAGE_NAME" "$TAG"
}

has_container() {
	docker ps -a --format '{{.Names}}' | grep -Fxq "$CONTAINER_NAME"
}

is_running() {
	docker ps --format '{{.Names}}' | grep -Fxq "$CONTAINER_NAME"
}

has_image() {
	docker image inspect "$(image_ref)" >/dev/null 2>&1
}

build_image() {
	if docker buildx version >/dev/null 2>&1; then
		echo "Building $(image_ref) with docker buildx..."
		docker buildx build --load -t "$(image_ref)" .
	else
		echo "Building $(image_ref) with docker build..."
		docker build -t "$(image_ref)" .
	fi
}

stop_container() {
	if is_running; then
		echo "Stopping container $CONTAINER_NAME..."
		docker stop "$CONTAINER_NAME"
	else
		echo "Container $CONTAINER_NAME is not running."
	fi
}

remove_container() {
	if has_container; then
		if is_running; then
			stop_container
		fi
		echo "Removing container $CONTAINER_NAME..."
		docker rm "$CONTAINER_NAME"
	else
		echo "Container $CONTAINER_NAME does not exist."
	fi
}

remove_image() {
	if has_image; then
		echo "Removing image $(image_ref)..."
		docker image rm -f "$(image_ref)"
	else
		echo "Image $(image_ref) does not exist."
	fi
}

run_container() {
	remove_container
	echo "Starting container $CONTAINER_NAME on port $HOST_PORT..."
	docker run -d \
		--name "$CONTAINER_NAME" \
		-p "$HOST_PORT:$CONTAINER_PORT" \
		"$(image_ref)"
}

show_logs() {
	if has_container; then
		docker logs -f "$CONTAINER_NAME"
	else
		echo "Container $CONTAINER_NAME does not exist."
	fi
}

command="${1:-help}"

case "$command" in
	build)
		build_image
		;;
	run)
		run_container
		;;
	stop)
		stop_container
		;;
	clean)
		remove_container
		remove_image
		;;
	rebuild)
		remove_container
		remove_image
		build_image
		run_container
		;;
	logs)
		show_logs
		;;
	help|-h|--help)
		usage
		;;
	*)
		echo "Unknown command: $command"
		echo
		usage
		exit 1
		;;
esac
