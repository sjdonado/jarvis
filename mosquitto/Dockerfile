FROM eclipse-mosquitto

ARG MQTT_USERNAME=
ARG MQTT_PASSWORD=

ENV MQTT_USERNAME=${MQTT_USERNAME}

USER mosquitto
WORKDIR /usr/mosquitto

EXPOSE 1883/tcp

RUN mosquitto_passwd -c -b passwd "${MQTT_USERNAME}" "${MQTT_PASSWORD}"

COPY mosquitto.conf mosquitto.conf

CMD mosquitto -c ./mosquitto.conf
