FROM denoland/deno:2.0.2

EXPOSE 5683/udp
EXPOSE 8000

WORKDIR /app

USER deno

COPY ./deno.lock ./deno.lock

RUN deno install --frozen

COPY . .

RUN deno cache main.ts

CMD ["run", "start"]
