'use strict'

const Rx = require('rxjs');
const {
    tap,
    map,
} = require('rxjs/operators');
const SamClusterMqttBroker = require('./SamClusterMqttBroker');

class SamClusterClient {

    constructor({ mqttServerUrl, replyTimeout }) {
        this.KEY_CREDIT = 1;
        this.KEY_DEBIT = 2;
        this.KEY_PUBLIC = 7;
        this.broker = new SamClusterMqttBroker({ mqttServerUrl, replyTimeout });
    }

    stop$() {
        return this.broker.disconnectBroker$();
    }


    /**
     * request a SAM to execute the first step auth
     * @param {string} card.uid Card uid hexa;  hexa string
     * @param {string} card.cardFirstSteptAuthChallenge Card First Stept Auth Challenge; hexa string
     * @param {string} transaction.appId trasaction Application ID
     * @param {string} transaction.transactionId trasaction  ID
     * @param {number} key SAM key to use. SamClusterClient.KEY_*
     * @returns 
     */
    requestSamFirstStepAuth$({ uid, cardFirstSteptAuthChallenge }, { appId, transactionId }, key) {
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

        console.log(`this.broker.sendAndGetReply$(${appId}, ${transactionId}, undefined, ${apduBuffer})`);
        return this.broker.sendAndGetReply$(appId, transactionId, undefined, apduBuffer).pipe(
            map(response => ({ secondStepSamToken: response.data, samId: response.samId }))
        );
    };

    /**
     * 
     * @param {string} cardSecondStepAuthConfirmation card second step auth confirmation
     * @param {string} transaction.appId trasaction Application ID
     * @param {string} transaction.transactionId trasaction  ID
     * @param {string} transaction.samId Sam id to use
     */
    requestSamSecondStepAuth$(cardSecondStepAuthConfirmation, { appId, transactionId, samId }) {
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
        console.log(`samId: ${samId} appId: ${appId} transactionId: ${transactionId} apduBuffer: ${apduBuffer}`);
        

        return this.broker.sendAndGetReply$(appId, transactionId, samId, apduBuffer).pipe(
            tap(resp => { 
                console.log('llega resp de SAM: ',resp)
            }),
            map(response => ({ 
                raw : response.data.toString('hex'),
                keyEnc : response.data.slice(0,16).toString('hex'),
                keyMac : response.data.slice(16,32).toString('hex'),
                ti : response.data.slice(32,36).toString('hex'),
                readCount : response.data.slice(36,38).toString('hex'),
                writeCount : response.data.slice(38,40).toString('hex'),
             }))
        );

        // 32 e9 ce a6 97 35 08 b3 62 31 ae a8 38 02 9e 94 fc 27 fc 52 00 56 54 4b 21 62 16 18 3c 50 6f dc 90 af
        /*
        
                keyEnc := respSam2[0:16]
                keyMac := respSam2[16:32]
                log.Printf("key Mac: [% X]\n", keyMac)
                Ti := respSam2[32:36]
                log.Printf("Ti: [% X]\n", Ti)
                readCounter := respSam2[36:38]
                writeCounter := respSam2[38:40]
                log.Printf("Read Counter: [% X]\n", readCounter)
                log.Printf("Write Counter: [% X]\n", writeCounter)
        */
    }


}

module.exports = SamClusterClient;