FROM balenalib/rpi-raspbian:bookworm AS build

RUN apt-get update && \
  apt-get install -y --no-install-recommends build-essential ca-certificates gcc-arm-linux-gnueabihf g++-arm-linux-gnueabihf curl && \
  rm -rf /var/lib/apt/lists/*

ENV GO_VERSION=1.25.5
RUN curl -L https://go.dev/dl/go${GO_VERSION}.linux-armv6l.tar.gz | tar -C /usr/local -xz
ENV PATH=/usr/local/go/bin:${PATH}

WORKDIR /app
COPY . .

# Build natively for Pi Zero (armv6 hard-float): C static lib + Go CLI
ENV GOOS=linux
ENV GOARCH=arm
ENV GOARM=6
ENV CC=arm-linux-gnueabihf-gcc
ENV CXX=arm-linux-gnueabihf-g++

RUN make clean && ARCH_FLAGS="-march=armv6 -mfpu=vfp -mfloat-abi=hard" make && go build -o jarvis main.go

FROM scratch AS export
COPY --from=build /app/jarvis /out/jarvis
