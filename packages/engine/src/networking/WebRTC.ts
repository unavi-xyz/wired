import { Device } from "mediasoup-client";
import { Producer } from "mediasoup-client/lib/Producer";
import { Transport } from "mediasoup-client/lib/Transport";

import { RenderThread } from "../render/RenderThread";
import { FromHostMessage, ToHostMessage } from "./types";

const PUBLISH_HZ = 15; // X times per second

export class WebRTC {
  playerId: number | null = null;
  playerPosition: Int32Array | null = null;
  playerRotation: Int16Array | null = null;

  #ws: WebSocket;
  #renderThread: RenderThread;

  #device: Device | null = null;
  #producerTransport: Transport | null = null;
  #consumerTransport: Transport | null = null;
  #producer: Producer | null = null;
  #paused = false;

  #onProducerId: ({ id }: { id: string }) => void = () => {};
  #onDataProducerId: ({ id }: { id: string }) => void = () => {};

  constructor(ws: WebSocket, renderThread: RenderThread) {
    this.#ws = ws;
    this.#renderThread = renderThread;
  }

  connect() {
    this.#send({ subject: "get_router_rtp_capabilities", data: null });
  }

  async onmessage({ subject, data }: FromHostMessage) {
    switch (subject) {
      case "router_rtp_capabilities": {
        // Create device
        const device = new Device();
        await device.load({ routerRtpCapabilities: data });
        this.#device = device;

        // Create transports
        this.#send({
          subject: "create_transport",
          data: {
            type: "producer",
          },
        });

        this.#send({
          subject: "create_transport",
          data: {
            type: "consumer",
          },
        });

        // Set rtp capabilities
        this.#send({
          subject: "set_rtp_capabilities",
          data: {
            rtpCapabilities: this.#device.rtpCapabilities,
          },
        });
        break;
      }

      case "transport_created": {
        if (!this.#device) throw new Error("Device not initialized");

        // Create local transport
        const transport =
          data.type === "producer"
            ? this.#device.createSendTransport(data.options)
            : this.#device.createRecvTransport(data.options);

        transport.on("connect", async ({ dtlsParameters }, callback) => {
          this.#send({
            subject: "connect_transport",
            data: {
              dtlsParameters,
              type: data.type,
            },
          });

          callback();
        });

        transport.on("connectionstatechange", (state) => {
          console.info(`🚀 WebRTC ${data.type}: ${state}`);
        });

        if (data.type === "producer") {
          this.#producerTransport = transport;

          transport.on("produce", async ({ kind, rtpParameters }, callback) => {
            if (kind === "video") throw new Error("Video not supported");

            this.#onProducerId = callback;

            this.#send({
              subject: "produce",
              data: { rtpParameters },
            });
          });

          transport.on(
            "producedata",
            async ({ sctpStreamParameters }, callback) => {
              this.#onDataProducerId = callback;

              this.#send({
                subject: "produce_data",
                data: { sctpStreamParameters },
              });
            }
          );

          const dataProducer = await transport.produceData({
            ordered: false,
            maxRetransmits: 0,
          });

          // Player id = 1 byte (Uint8)
          // Position = 3 * 4 bytes (Int32)
          // Rotation = 4 * 2 bytes (Int16)
          // Total = 21 bytes
          const bytes = 21;
          const buffer = new ArrayBuffer(bytes);
          const view = new DataView(buffer);

          setInterval(() => {
            if (
              this.playerId === null ||
              !this.playerPosition ||
              !this.playerRotation ||
              dataProducer.readyState !== "open"
            )
              return;

            view.setUint8(0, this.playerId);

            view.setInt32(1, Atomics.load(this.playerPosition, 0), true);
            view.setInt32(5, Atomics.load(this.playerPosition, 1), true);
            view.setInt32(9, Atomics.load(this.playerPosition, 2), true);

            view.setInt16(13, Atomics.load(this.playerRotation, 0), true);
            view.setInt16(15, Atomics.load(this.playerRotation, 1), true);
            view.setInt16(17, Atomics.load(this.playerRotation, 2), true);
            view.setInt16(19, Atomics.load(this.playerRotation, 3), true);

            dataProducer.send(buffer);
          }, 1000 / PUBLISH_HZ);
        }

        if (data.type === "consumer") {
          this.#consumerTransport = transport;

          this.#send({
            subject: "ready_to_consume",
            data: true,
          });
        }

        break;
      }

      case "create_consumer": {
        if (!this.#consumerTransport)
          throw new Error("Consumer transport not initialized");
        if (this.#consumerTransport.closed)
          throw new Error("Consumer transport closed");

        const consumer = await this.#consumerTransport.consume({
          id: data.id,
          producerId: data.producerId,
          rtpParameters: data.rtpParameters,
          kind: "audio",
        });

        // Start receiving audio
        await consumer.resume();

        this.#send({
          subject: "resume_audio",
          data: null,
        });

        // Create audio stream
        const stream = new MediaStream([consumer.track]);

        // Create audio element
        const audio = new Audio();
        audio.srcObject = stream;
        audio.autoplay = true;

        // TODO Add positional audio (https://developer.mozilla.org/en-US/docs/Web/API/PannerNode)
        // - Cant just use the threejs audio listener because it's on a different thread :(

        // User needs to interact with the page to play audio
        // There is probably a better way to do this
        try {
          await audio.play();
        } catch {
          const tryToPlay = setInterval(() => {
            audio
              .play()
              .then(() => {
                clearInterval(tryToPlay);
              })
              .catch((error) => {
                console.warn(error);
              });
          }, 5000);
        }

        break;
      }

      case "create_data_consumer": {
        if (!this.#consumerTransport)
          throw new Error("Consumer transport not initialized");
        if (this.#consumerTransport.closed)
          throw new Error("Consumer transport closed");

        const dataConsumer = await this.#consumerTransport.consumeData({
          id: data.id,
          dataProducerId: data.dataProducerId,
          sctpStreamParameters: data.sctpStreamParameters,
        });

        dataConsumer.on("message", (message) => {
          this.#renderThread.postMessage(
            {
              subject: "player_location",
              data: message,
            },
            [message]
          );
        });

        break;
      }

      case "producer_id": {
        this.#onProducerId(data);
        break;
      }

      case "data_producer_id": {
        this.#onDataProducerId(data);
        break;
      }
    }
  }

  #send(message: ToHostMessage) {
    this.#ws.send(JSON.stringify(message));
  }

  async produceAudio(track: MediaStreamTrack) {
    if (!this.#producerTransport)
      throw new Error("Producer transport not initialized");
    if (this.#producerTransport.closed)
      throw new Error("Producer transport closed");

    this.#producer = await this.#producerTransport.produce({ track });

    if (this.#paused) this.#producer.pause();
    else this.#producer.resume();
  }

  setAudioPaused(paused: boolean) {
    this.#paused = paused;

    if (this.#producer && paused) this.#producer.pause();
    else if (this.#producer && !paused) this.#producer.resume();
  }
}
