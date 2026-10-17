FROM  golang:tip-alpine3.24@sha256:ff2648d6106c54e170891b6f6af3f202233515a8d23c417c24b77007098250fe AS builder

COPY go.mod *.go /opt/
RUN cd /opt && go build

FROM alpine:3.24.2@sha256:294b683cb724975bec92580e1e685676bd4b50bda910ddb8c51d4cabeaec77e6
COPY --from=builder /opt/stencil /opt/
USER 1001
ENTRYPOINT ["/opt/stencil"]
