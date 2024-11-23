import { createMachine, assign, createActor } from "xstate";

import { getMQTTClient, SYSTEM_TOPIC, STATUSBAR_TOPIC, DISPLAY_TOPIC } from "../lib/mqtt.server.mjs";

const stateMachine = createMachine(
  {
    id: "screenManager",
    initial: "inactive",
    context: {
      statusbar: null,
      display: {
        buffer: null,
        base64: null,
      },
      scheduledInterval: {
        value: '',
        updatedAt: null,
      },
    },
    states: {
      inactive: {
        on: {
          SCREEN_ON: {
            target: "active",
            actions: ["sendScreenOnSignal", "publishDisplay"],
          },
        },
      },
      active: {
        on: {
          SCREEN_OFF: {
            target: "inactive",
            actions: ["sendScreenOffSignal"],
          },
          UPDATE_STATUSBAR: {
            actions: ["updateStatusbarContext", "publishStatusbar"],
          },
          UPDATE_DISPLAY: {
            actions: ["updateDisplayContext", "publishDisplay"],
          },
          UPDATE_SCHEDULED_INTERVAL: {
            actions: ["updateScheduledIntervalContext"],
          },
        },
      },
    },
  },
  {
    actions: {
      updateStatusbarContext: assign({
        statusbar: ({ event }) => event.value,
      }),
      updateDisplayContext: assign({
        display: ({ event }) => ({
          buffer: event.value,
          base64: `data:image/bmp;base64,${event.value.toString("base64")}`,
        }),
      }),
      updateScheduledIntervalContext: assign({
        scheduledInterval: ({ context, event }) => ({
          value: event.value ?? context.scheduledInterval.value,
          updatedAt: new Date().toISOString(),
        }),
      }),
      sendScreenOnSignal: async () => {
        const client = await getMQTTClient();

        client.publish(SYSTEM_TOPIC, "screen:on", { qos: 2, retain: false }, (err) => {
          if (err) {
            console.error("Failed to publish system message:", err);
          }
        });
      },
      sendScreenOffSignal: async () => {
        const client = await getMQTTClient();

        client.publish(SYSTEM_TOPIC, "screen:off", { qos: 2, retain: false }, (err) => {
          if (err) {
            console.error("Failed to publish system message:", err);
          }
        });
      },
      publishStatusbar: async ({ context }) => {
        const client = await getMQTTClient();

        if (context.statusbar) {
          client.publish(STATUSBAR_TOPIC, context.statusbar, { qos: 0, retain: false }, (err) => {
            if (err) {
              console.error("Failed to publish statusbar message:", err);
            }
          });
        }
      },
      publishDisplay: async ({ context }) => {
        const client = await getMQTTClient();

        if (context.display.buffer) {
          client.publish(DISPLAY_TOPIC, context.display.buffer, { qos: 2, retain: false }, (err) => {
            if (err) {
              console.error("Failed to publish display message:", err);
            }
          });
        }
      },
    },
  }
);

export const screenManager = createActor(stateMachine);

screenManager.start();
