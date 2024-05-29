FROM denoland/deno:alpine-1.43.6

EXPOSE 4100

WORKDIR /app

ADD resource resource
ADD src src
ADD deno.json deno.json

CMD [ "task", "start" ]