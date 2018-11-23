'use strict';

const expect = require('chai').expect
const pcsclite = require('pcsclite');
const Rx = require('rxjs');
const {
    tap,
    switchMap,
    delay,
    filter,
    map,
    first,
    mapTo,
    mergeMap,
    concatMap,
    timeout,
    toArray
} = require('rxjs/operators');

class Reader {

    constructor() {
        this.pcsc = undefined;
        this.pcscReader = undefined;
        this.protocol = undefined;
        this.reader = undefined;
        this.readerTpe = undefined;
        this.cardType = undefined; //TODO define
    }

    connect$() {
        this.pcsc = pcsclite();
        return Rx.fromEvent(this.pcsc, 'reader').pipe(
            first(),
            timeout(1000),
            tap(reader => this.pcscReader = reader),
            tap(reader => this.readerTpe = reader.name.includes('ACR1252') ? 'ACR1252' : reader.name.includes('ACR1255') ? 'ACR1255' : 'UNKNOWN'),
            map(reader => `New reader detected:  ${reader.name})`),

        );
    }

    disconnect$() {
        return Rx.Observable.create(obs => {
            this.pcscReader.close();
            this.pcsc.close();
            obs.next('Reader disconnected');
            obs.complete();
        });
    }


    detectCard$() {
        return Rx.fromEvent(this.pcscReader, 'status').pipe(
            //tap(s => console.log(`JSON=${JSON.stringify(s)} === KEYS=${Object.keys(pcscReader)}`)),
            filter(s => s.state == 34),
            //filter(s => s.state & pcscReader.SCARD_STATE_PRESENT),
            tap(s => this.atr = s.atr),
            tap(s => {
                const cardTypeCode = s.atr.toString('hex', 13, 15);
                if (cardTypeCode === 'ff88' || cardTypeCode === '0001' || cardTypeCode === '0002') {
                    this.cardType = 'SL1';
                } else if (s.atr.toString('hex', 3, 5) === '01c1') {
                    this.cardType = 'SL3';
                } else {
                    throw new Error('ATR INVALID CARD TYPE: ' + cardTypeCode + '; ATR=' + s.atr.toString('hex'));
                }
            }),
            mergeMap(s => this.connectReader$()),
            mergeMap(() => this.requestUid$()),
            first(),
            map(() => `Card Detected ATR=${this.atr.toString('hex')}, Protocol=${this.protocol}, UID=${this.cardUid}`),
        )
    }

    connectReader$() {
        return Rx.bindNodeCallback(this.pcscReader.connect.bind(this.pcscReader))({ share_mode: this.pcscReader.SCARD_SHARE_SHARED })
            .pipe(
                tap(protocol => this.protocol = protocol)
            );
    }

    requestUid$() {
        return this.sendApduCommandToCard$({ apdu: [0xFF, 0xCA, 0x00, 0x00, 0x00], resLen: 40 })
            .pipe(
                filter(respBuffer => respBuffer[respBuffer.length - 2] == 0x90 && respBuffer[respBuffer.length - 1] == 0x00),
                map(respBuffer => respBuffer.slice(0, respBuffer.length - 2)),
                map(respBuffer => respBuffer.toString('hex')),
                tap(cardUid => this.cardUid = cardUid)
            )
    };


    requestCardFirstStepAuth$(authRol) {
        return this.sendApduCommandToCard$({ apdu: [0x70, ...authRol, 0x00], resLen: 256 })
            .pipe(
                tap(respBuffer => expect(respBuffer[0]).to.be.equals(0x90)),
                map(respBuffer => respBuffer.slice(1, respBuffer.length)),
                map(respBuffer => respBuffer.toString('hex')),
                tap(cardFirstStepAuthChallenge => console.log(`  cardFirstStepAuthChallenge: ${cardFirstStepAuthChallenge}`)),
            )
    };

    requestCardSecondStepAuth$(secondStepSamToken) {
        // 0x72 + 32 bytes del requestCardSecondStepAuth
        const apduBuffer = Buffer.concat([Buffer.from([0x72]), secondStepSamToken.slice(0, -2)]);
        const apduByteArray = Array.from(apduBuffer);
        return this.sendApduCommandToCard$({ apdu: apduByteArray, resLen: 1024 })
            .pipe(
                map(respBuffer => respBuffer.slice(1, respBuffer.length)),
                map(respBuffer => respBuffer.toString('hex')),
            );
    }

    executeBinaryCommands$(binaryCommands) {
        return Rx.from(binaryCommands).pipe(
            concatMap(binaryCommand => {
                const apduByteArray = Array.from(Buffer.from(binaryCommand.cmd, 'hex'));
                return this.sendApduCommandToCard$({ apdu: apduByteArray, resLen: 1024 }).pipe(
                    //map(respBuffer => respBuffer.slice(1, respBuffer.length)),
                    map(respBuffer => respBuffer.toString('hex')),
                    tap(readerResponse => binaryCommand.resp = readerResponse),
                    mapTo(binaryCommand)
                );
            }),
            toArray(),
        );
    }

    sendApduCommandToCard$({ apdu, resLen }) {
        return Rx.bindNodeCallback(this.pcscReader.transmit.bind(this.pcscReader))(Buffer.from(apdu), resLen, this.protocol);
    }




}

module.exports = Reader;