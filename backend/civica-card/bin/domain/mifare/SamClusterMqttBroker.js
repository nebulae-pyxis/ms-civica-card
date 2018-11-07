'use strict';

const MQTT = require('async-mqtt');
const Rx = require('rxjs');
const {
  tap,
  timeout,
  filter,
  map,
  first
} = require('rxjs/operators');

class SamClusterMqttBroker {

  constructor({ mqttServerUrl, replyTimeout }) {
    this.mqttServerUrl = mqttServerUrl;
    this.replyTimeout = replyTimeout;
    /**
     * Rx Subject for incoming messages
     */
    this.incomingMessages$ = new Rx.Subject();
    /**
     * MQTT Client
     */
    this.mqttClient = MQTT.connect(this.mqttServerUrl);
    this.mqttClient.on('connect', () => console.log(`SamClusterMqttBroker connected`));
    this.mqttClient.on('message', (topic, message) => {
      //console.log(`SamClusterMqttBroker.onMessage: ${JSON.stringify({ topic, message })}`);
      // message is Buffer
      this.incomingMessages$.next({
        appId: topic.split('/')[2],
        transactionId: topic.split('/')[3],
        samId: topic.split('/')[4],
        topic: topic,
        data: message,
      });
    });
    this.mqttClient.subscribe('SAMFARM/RESP/#');
  }

  /**
   * Sends a message to a SAM
   * @param {string} appId 
   * @param {string} transactionId 
   * @param {string} samId 
   * @param {Buffer} apdu 
   */
  send$(appId, transactionId, samId = undefined, apdu) {
    const id1 = transactionId;
    const id2 = appId;
    const id3 = samId;

    const requestTopic = samId === undefined
      ? `SAMFARM/ASYN/${id1}/${id2}`
      : `SAMFARM/SYN/${id3}/${id1}/${id2}`;
    return this.publish$(requestTopic, apdu);
  }

  /**
   * Sends a message to a SAM and waits for the reply
   * @param {string} appId 
   * @param {string} transactionId 
   * @param {string} samId 
   * @param {Buffer} apdu 
   * @param {*} timeout 
   */
  sendAndGetReply$(appId, transactionId, samId = undefined, apdu, timeout = this.replyTimeout) {
    return Rx.forkJoin(
      this.getMessageReply$(appId, transactionId, samId),
      this.send$(appId, transactionId, samId, apdu)
    ).pipe(
      map(([reply]) => reply),
      //tap(data  => console.log(`DATA ====> ${data}`)),
    );
  }

  /**
   * Listens to message replies from the sam cluster
   * @param {string} appId 
   * @param {string} transactionId 
   * @param {string} samId 
   */
  getMessageReply$(appId, transactionId, samId = undefined) {
    return this.incomingMessages$.pipe(
      filter(msg => msg),
      filter(msg => msg.appId === appId && msg.transactionId === transactionId && (samId === undefined || msg.samId === samId)),
      //map(msg => msg.data),
      timeout(this.replyTimeout),
      first()
    );
  }


  /**
   * Publish data throught a topic
   * @param {string} topicName
   * @param {Buffer} data
   */
  publish$(topicName, data) {
    return Rx.defer(() => {
      return this.mqttClient.publish(topicName, data, { qos: 0 })
    });
  }


  /**
   * Disconnect the broker and return an observable that completes when disconnected
   */
  disconnectBroker$() {
    return Rx.from(this.mqttClient.end());
  }
}

module.exports = SamClusterMqttBroker;
