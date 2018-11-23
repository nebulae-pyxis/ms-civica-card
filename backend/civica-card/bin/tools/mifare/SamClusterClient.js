'use strict'

const Rx = require('rxjs');
const {
    tap,
    map,
} = require('rxjs/operators');
const SamClusterMqttBroker = require('./SamClusterMqttBroker');
const { CustomError, BYTECODE_COMPILER_ERROR } = require('../customError');

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
     * request a SAM to execute the first step auth for SL3 cards
     * @param {{ dataDiv, key, cardFirstSteptAuthChallenge }} card.dataDiv Diversified card key, SAM key to use. SamClusterClient.KEY_*, Card First Stept Auth Challenge; hexa string     
     * @param {string} transaction.transactionId trasaction  ID     
     * @returns 
     */
    requestSamFirstStepAuth$({ dataDiv = undefined, cardSecurityLevel = 3, key, cardFirstSteptAuthChallenge }, { transactionId }) {
        const apduLen = 18 + (dataDiv === undefined ? 0 : dataDiv.length / 2);

        const apduBuffer = Buffer.alloc(5 + apduLen + 1);
        const keyNo = key;
        const keyVer = 0x00;
        const data = cardFirstSteptAuthChallenge;

        let p1 = dataDiv === undefined ? 0x00 : 0x01;
        switch (cardSecurityLevel) {
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
        apduBuffer[apduBufferIndex++] = apduLen;
        apduBuffer[apduBufferIndex++] = keyNo;
        apduBuffer[apduBufferIndex++] = keyVer;
        apduBuffer.write(data, apduBufferIndex, data.length, 'hex');
        apduBufferIndex += 16;
        if (dataDiv !== undefined) {
            apduBuffer.write(dataDiv, apduBufferIndex, dataDiv.length, 'hex');
            apduBufferIndex += 8;
        }

        apduBuffer[apduBufferIndex++] = 0x00;

        return this.broker.sendAndGetReply$(this.appId, transactionId, undefined, apduBuffer).pipe(
            map(response => ({ secondStepSamToken: response.data, samId: response.samId, samKey: key })),
        );
    };

    /**
     * request a SAM to execute the second step auth for SL3 cards
     * @param {string} cardSecondStepAuthConfirmation card second step auth confirmation    
     * @param {string} transaction.transactionId trasaction  ID
     * @param {string} transaction.samId Sam id to use
     */
    requestSamSecondStepAuth$(cardSecondStepAuthConfirmation, { transactionId, samId }) {
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
                raw: response.data.toString('hex'),
                keyEnc: response.data.slice(0, 16),
                keyMac: response.data.slice(16, 32),
                ti: response.data.slice(32, 36),
                readCount: 0,//response.data.readUInt16BE(36),
                writeCount: 0// response.data.readUInt16BE(38)
            }))
        );
    }

    requestSL1OfflineAuthKey$(transactionId, samKey, cardUid) {
        const uuid_buff = Buffer.from(cardUid, 'hex').slice(0, 4);
        const uuid_reversed_buff = Buffer.from(uuid_buff).swap32();
        const uuid_niblesFlip_buff = Buffer.from([
            uuid_buff[0] >> 4 & 0x0F | uuid_buff[0] << 4 & 0xF0,
            uuid_buff[1] >> 4 & 0x0F | uuid_buff[1] << 4 & 0xF0,
            uuid_buff[2] >> 4 & 0x0F | uuid_buff[2] << 4 & 0xF0,
            uuid_buff[3] >> 4 & 0x0F | uuid_buff[3] << 4 & 0xF0
        ]);
        const keyDiversifiedData_buff = Buffer.concat([uuid_reversed_buff, uuid_niblesFlip_buff]);

        const apdu1 = this.getActivateOfflineKeyApdu(samKey, 0x00, undefined);
        const apdu2 = this.getEncipherDataApdu(true, 0x00, keyDiversifiedData_buff);
        const mergedApdu = Buffer.concat([apdu1, apdu2]);

        return this.broker.sendAndGetReply$(this.appId, transactionId, undefined, mergedApdu).pipe(
            tap(({ data }) => { if (data[data.length - 2] !== 0x90 || data[data.length - 1] !== 0x00) { throw new CustomError('SAM Error Response', 'SamClusterClient.requestOfflineAuthKey', BYTECODE_COMPILER_ERROR, 'SAM returned error response when trying to calculate Offline Auth Key for SL1'); } }),
            map(response => ({ key: response.data.slice(0, 6), samId: response.samId })),
        );

    }


    /**
     * Calculates APDU for SAM_ActivateOfflineKey
     * @param {number} keyNo 
     * @param {number} keyVer 
     * @param {Array} dataDiv 
     */
    getActivateOfflineKeyApdu(keyNo, keyVer, dataDiv) {
        const p1 = dataDiv === undefined ? 0x00 : 0x01;
        const aid = Buffer.concat([
            Buffer.from([0x80, 0x01, p1, 0x00, (dataDiv === undefined ? 0 : dataDiv.length) + 2, keyNo, keyVer]),
            Buffer.from(dataDiv === undefined ? [] : dataDiv)
        ]);
        return aid;
    }

    /**
     * SAM_Encipher_Data command encrypts data received from any other system based on the given cipher text data andt the current valid cryptographic OfflineCrypto Key.
     * @param {Boolean} last 
     * @param {Number} offset 
     * @param {Buffer} dataPlain 
     */
    getEncipherDataApdu(last, offset, dataPlain) {
        const p1 = last ? 0x00 : 0xAF;
        const aid = Buffer.concat([
            Buffer.from([0x80, 0xED, p1, offset, dataPlain.length]),
            dataPlain,
            Buffer.from([0x00]),
        ]);
        return aid;
    }


}

module.exports = SamClusterClient;