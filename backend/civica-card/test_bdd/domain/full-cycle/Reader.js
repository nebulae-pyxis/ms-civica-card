'use strict';

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
    timeout
} = require('rxjs/operators');

class Reader {

    constructor() {
        this.pcsc = undefined;
        this.pcscReader = undefined;
        this.protocol = undefined;
        this.reader = undefined;
        this.readerTpe = undefined; //TODO define
        this.cardType  = undefined; //TODO define
    }

    connect$() {
        this.pcsc = pcsclite();
        return Rx.fromEvent(this.pcsc, 'reader').pipe(
            first(),
            timeout(1000),
            tap(reader => this.pcscReader = reader),
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
            mergeMap(s => this.connectReader$()),
            mergeMap(() => this.requestUid$()),
            first(),
            map(() => `Card Detected ATR=${this.atr.toString('hex')}, Protocol=${this.protocol}, UID=${this.uid}`),
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
                tap(uid => this.uid = uid)
            )
    };

    sendApduCommandToCard$({ apdu, resLen }) {
        return Rx.bindNodeCallback(this.pcscReader.transmit.bind(this.pcscReader))(Buffer.from(apdu), resLen, this.protocol);
    }

}

module.exports = Reader;