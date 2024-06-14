FROM golang:1.22-alpine

EXPOSE 8080

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

ADD . .

RUN go build -o /livestatus

CMD [ "/livestatus" ]
