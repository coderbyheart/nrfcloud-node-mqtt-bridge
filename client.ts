import { mqtt, iot, io } from "aws-iot-device-sdk-v2";
import { fromEnv } from "@nordicsemiconductor/from-env";
import os from "node:os";
const decoder = new TextDecoder();

const clientBootstrap = new io.ClientBootstrap();

const { tenantId, caCert, privateKey, clientCert, endpoint } = fromEnv({
  tenantId: "TENANT_ID",
  caCert: "CA_CERT",
  clientCert: "CLIENT_CERT",
  privateKey: "PRIVATE_KEY",
  endpoint: "ENDPOINT",
})(process.env);

const prefix = `prod/${tenantId}/`;

const ts = () => `[${new Date().toISOString()}]`;

const connect = async ({
  clientCert,
  privateKey,
  clientId,
  mqttEndpoint,
}: {
  clientCert: string;
  privateKey: string;
  clientId: string;
  mqttEndpoint: string;
}) =>
  new Promise<mqtt.MqttClientConnection>((resolve, reject) => {
    const cfg = iot.AwsIotMqttConnectionConfigBuilder.new_mtls_builder(
      clientCert,
      privateKey
    );
    cfg.with_clean_session(true);
    cfg.with_client_id(clientId);
    cfg.with_endpoint(mqttEndpoint);
    const client = new mqtt.MqttClient(clientBootstrap);
    const connection = client.new_connection(cfg.build());
    connection.on("error", (err) => {
      console.error(JSON.stringify(err));
      reject(err);
    });
    connection.on("connect", () => {
      console.debug(ts(), `${clientId} connected`);
      resolve(connection);
    });
    connection.on("disconnect", () => {
      console.debug(ts(), `${clientId} disconnected`);
    });
    connection.on("closed", () => {
      console.debug(ts(), `${clientId} closed`);
    });
    connection.connect().catch(() => {
      console.error(ts(), `${clientId} failed to connect.`);
    });
  });

console.debug(ts(), `Connecting account-${tenantId} to ${endpoint}`);

const connection = await connect({
  clientId: `account-${tenantId}`,
  clientCert: [clientCert, caCert].join(os.EOL),
  mqttEndpoint: endpoint,
  privateKey,
});

console.debug(ts(), `Prefix`, prefix);

const sub = async (
  topic: string,
  onmessage: (topic: string, payload: ArrayBuffer) => void
) => {
  console.debug(ts(), `Subscribing to`, topic.replace(prefix, ""));
  await connection.subscribe(topic, mqtt.QoS.AtLeastOnce, (topic, payload) => {
    console.log(ts(), `@`, topic);
    console.log(ts(), `>`, JSON.parse(decoder.decode(payload)));
    onmessage(topic, payload);
  });
};

// Subscribe to shadow updates
await sub(`${prefix}devices/+/c2a`, async (topic, payload) => {});

// Subscribe to device messages
await sub(`${prefix}m/#`, async (topic, payload) => {});
