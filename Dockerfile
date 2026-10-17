FROM  golang:tip-alpine3.24@sha256:ff2648d6106c54e170891b6f6af3f202233515a8d23c417c24b77007098250fe

RUN mkdir -p /opt/stencil/
WORKDIR /opt/stencil
COPY go.mod main.go routes.go handlers.go /opt/stencil/
RUN go build
USER 1001
ENTRYPOINT ["/opt/stencil/stencil"]


