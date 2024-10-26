FROM eclipse-mosquitto

# Set build-time arguments for username, password, and port
ARG MQTT_USERNAME=
ARG MQTT_PASSWORD=

ENV MQTT_USERNAME=${MQTT_USERNAME}
ENV MQTT_PORT=${MQTT_PORT}

EXPOSE 1883/tcp

COPY mosquitto.conf /etc/mosquitto/mosquitto.conf

RUN mosquitto_passwd -c -b /etc/mosquitto/passwd "${MQTT_USERNAME}" "${MQTT_PASSWORD}"

CMD mosquitto -c /etc/mosquitto/mosquitto.conf
