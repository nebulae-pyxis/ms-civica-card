'use strict'

const Rx = require('rxjs');
const {
    tap,
    map,
} = require('rxjs/operators');
const SamClusterMqttBroker = require('./SamClusterMqttBroker');

class SamClusterClient {

    constructor({ mqttServerUrl, replyTimeout, appId }) {
        this.KEY_CREDIT = 1;
        this.KEY_DEBIT = 2;
        this.KEY_PUBLIC = 7;
        this.appId = appId;
        this.broker = new SamClusterMqttBroker({ mqttServerUrl, replyTimeout });
    }

    stop$() {
        return this.broker.disconnectBroker$();
    }


    /**
     * request a SAM to execute the first step auth
     * @param {string} card.uid Card uid hexa;  hexa string
     * @param {string} card.cardFirstSteptAuthChallenge Card First Stept Auth Challenge; hexa string
     * @param {string} transaction.transactionId trasaction  ID
     * @param {number} key SAM key to use. SamClusterClient.KEY_*
     * @returns 
     */
    requestSamFirstStepAuth$({ uid, cardFirstSteptAuthChallenge }, { transactionId }, key) {
        const apduBuffer = Buffer.alloc(32);

        const sl = 3; //SL level
        const keyNo = key;
        const keyVer = 0x00;
        const data = cardFirstSteptAuthChallenge;
        const dataDiv = uid.length === 8 ? `00000000${uid}` : uid;

        let p1 = 0x01;
        switch (sl) {
            case 0:
                p1 = p1 + 0x00;
                break;
            case 2:
                p1 = p1 + 0x04;
                break;
            case 3:
                p1 = p1 + 0x0C;
                break;
            default:
                p1 = p1 + 0x80;
                break;
        }

        let apduBufferIndex = 0;
        apduBuffer[apduBufferIndex++] = 0x80;
        apduBuffer[apduBufferIndex++] = 0xA3;
        apduBuffer[apduBufferIndex++] = p1;
        apduBuffer[apduBufferIndex++] = 0x00;
        apduBuffer[apduBufferIndex++] = 0x1A;//len
        apduBuffer[apduBufferIndex++] = keyNo;
        apduBuffer[apduBufferIndex++] = keyVer;
        apduBuffer.write(data, apduBufferIndex, data.length, 'hex');
        apduBufferIndex += 16;
        apduBuffer.write(dataDiv, apduBufferIndex, dataDiv.length, 'hex');
        apduBufferIndex += 8;
        apduBuffer[apduBufferIndex++] = 0x00;

        return this.broker.sendAndGetReply$(this.appId, transactionId, undefined, apduBuffer).pipe(
            map(response => ({ secondStepSamToken: response.data, samId: response.samId }))
        );
    };

    /**
     * 
     * @param {string} cardSecondStepAuthConfirmation card second step auth confirmation    
     * @param {string} transaction.transactionId trasaction  ID
     * @param {string} transaction.samId Sam id to use
     */
    requestSamSecondStepAuth$(cardSecondStepAuthConfirmation, {  transactionId, samId }) {
        const dataLen = (cardSecondStepAuthConfirmation.length / 2);
        const apduBuffer = Buffer.alloc(6 + dataLen);
        let bufferIndex = 0;
        apduBuffer[bufferIndex++] = 0x80;
        apduBuffer[bufferIndex++] = 0xA3;
        apduBuffer[bufferIndex++] = 0x00;
        apduBuffer[bufferIndex++] = 0x00;
        apduBuffer.writeUInt8(dataLen, bufferIndex++);
        apduBuffer.write(cardSecondStepAuthConfirmation, bufferIndex, cardSecondStepAuthConfirmation.length, 'hex');
        bufferIndex += dataLen;
        apduBuffer[bufferIndex++] = 0x00;
        

        return this.broker.sendAndGetReply$(this.appId, transactionId, samId, apduBuffer).pipe(
            map(response => ({ 
                raw : response.data.toString('hex'),
                keyEnc : response.data.slice(0,16),
                keyMac : response.data.slice(16,32),
                ti : response.data.slice(32,36),
                readCount : 0,//response.data.readUInt16BE(36),
                writeCount : 0// response.data.readUInt16BE(38)
             }))
        );
    }


}

module.exports = SamClusterClient;