FROM denoland/deno:alpine-1.32.5

WORKDIR /app

ADD resource resource
ADD src src
ADD deno.json deno.json

CMD [ "task", "start" ]