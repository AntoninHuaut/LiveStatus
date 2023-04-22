FROM denoland/deno:alpine-1.32.5

EXPOSE 4100

WORKDIR /app

ADD resource resource
ADD src src
ADD deno.json deno.json

CMD [ "task", "start" ]