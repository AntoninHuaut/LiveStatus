FROM denoland/deno:alpine-1.24.1

WORKDIR /app

# Cache the dependencies as a layer (the following two steps are re-run only when deps.ts is modified).
# Ideally cache deps.ts will download and compile _all_ external files used in app.ts.
COPY ./src/deps.ts ./src/deps.ts
RUN deno cache ./src/deps.ts

# These steps will be re-run upon each file change in your working directory:
ADD resource resource
ADD src src
ADD deno.json deno.json

CMD [ "task", "start" ]