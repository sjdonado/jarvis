FROM eclipse-mosquitto

# Set build-time arguments for username, password, and port
ARG MQTT_USERNAME=
ARG MQTT_PASSWORD=

ENV MQTT_USERNAME=${MQTT_USERNAME}
ENV MQTT_PORT=${MQTT_PORT}

WORKDIR /usr/mosquitto

EXPOSE 1883/tcp

RUN mosquitto_passwd -c -b passwd "${MQTT_USERNAME}" "${MQTT_PASSWORD}" && \
    chmod 700 passwd

COPY mosquitto.conf mosquitto.conf

CMD mosquitto -c ./mosquitto.conf
