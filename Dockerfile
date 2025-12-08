FROM balenalib/rpi-raspbian:bookworm AS build

RUN apt-get update && \
  apt-get install -y --no-install-recommends build-essential ca-certificates && \
  rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# Build natively for Pi Zero (armv6 hard-float)
RUN make clean && ARCH_FLAGS="-march=armv6 -mfpu=vfp -mfloat-abi=hard" make

FROM scratch AS export
COPY --from=build /app/jarvis /out/jarvis
