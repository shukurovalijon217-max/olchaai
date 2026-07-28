FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o bin/olcha-go ./cmd/server/

FROM alpine:latest
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=builder /app/bin/olcha-go ./bin/olcha-go
ENV PORT=8099
EXPOSE 8099
CMD ["./bin/olcha-go"]
