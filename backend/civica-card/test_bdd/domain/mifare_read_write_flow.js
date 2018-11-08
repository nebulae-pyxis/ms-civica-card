// TEST LIBS
const assert = require('assert');
const expect = require('chai').expect
const Rx = require('rxjs');
const uuidv4 = require('uuid/v4');

const { connectReader$,
    sendApduCommandToCard$,
    readCard$,
    requestUid$,
    requestCardFirstStepAuth$,
    requestCardSecondStepAuth$ } = require('./full_sale_cycle_helper');

const { SamClusterClient } = require('../../bin/tools/mifare');
let samClusterClient = undefined;

const {
    tap,
    switchMap,
    delay,
    filter,
    map,
    first,
    mapTo,
    mergeMap,
    reduce
} = require('rxjs/operators');


const pcsclite = require('pcsclite');
var pcsc = undefined;
let pcscReader = undefined;



describe('Prepare', function () {
    describe('NFC Reader Start', function () {
        it('connect', function (done) {
            this.timeout(5000);
            pcsc = pcsclite();
            Rx.fromEvent(pcsc, 'reader').pipe(
                first(),
                tap(r => {
                    pcscReader = r;
                    console.log('New reader detected', pcscReader.name);
                })
            ).subscribe(
                (evt) => console.log(evt),
                (error) => done(error),
                () => done()
            );
        });
    });

    describe('Prepare Sam Cluster Client', function () {
        it('instance samClusterClient', function (done) {
            //ENVIRONMENT VARS
            samClusterClient = new SamClusterClient({
                mqttServerUrl: 'tcp://rcswsyrt:wAQAois_Sqt5@m15.cloudmqtt.com:16858',
                replyTimeout: 10000
            });
            assert.ok(true, 'SamClusterClient constructor worked');
            return done();
        });
    });
})




describe('READ Card', function () {
    describe('Read Card', function () {

        let atr;
        let uid;
        it('wait for card', function (done) {
            this.timeout(10000);

            Rx.fromEvent(pcscReader, 'status').pipe(
                //tap(s => console.log(`JSON=${JSON.stringify(s)} === KEYS=${Object.keys(pcscReader)}`)),
                filter(s => s.state == 34),
                //filter(s => s.state & pcscReader.SCARD_STATE_PRESENT),
                tap(s => { atr = s.atr; console.log(`ATR = ${JSON.stringify(s.atr)}`) }),
                mergeMap(s => connectReader$(pcscReader)),
                tap(result => console.log(`  connectReader: ${JSON.stringify(result)} `)),
                mergeMap(({ reader, protocol }) => readCard$({ reader, protocol })),
                first(),
            ).subscribe(
                (evt) => console.log(evt),
                (error) => done(error),
                () => done()
            );
        });
    });
})




describe('De-Prepare', function () {
    describe('NFC reader stop', function () {
        it('connect', function (done) {
            pcscReader.close();
            pcsc.close();
            done();
        });
    });
    describe('de-prepare Sam Cluster Client', function () {
        it('stop samClusterClient', function (done) {
            samClusterClient.stop$()
                .subscribe(
                    () => {
                    },
                    error => {
                        return done(new Error(error));
                    },
                    () => {
                        assert.ok(true, 'samClusterClient stoped');
                        return done();
                    }
                );
        });
    });
})


const connectReader$ = (reader) => {
    return Rx.bindNodeCallback(reader.connect.bind(reader))({ share_mode: reader.SCARD_SHARE_SHARED })
        .pipe(
            map(protocol => ({ reader, protocol }))
        );
}

const sendApduCommandToCard$ = ({ reader, protocol, apdu, resLen }) => {
    return Rx.bindNodeCallback(reader.transmit.bind(reader))(Buffer.from(apdu), resLen, protocol);
}

const readCard$ = ({ reader, protocol }) => {

    const transaction = {
        appId: 'CIVICA-CARD-BACKEND',
        transactionId: uuidv4()
    };

    return requestUid$({ reader, protocol })
        .pipe(
            delay(500),
            mergeMap((uid) => requestCardFirstStepAuth$({ reader, protocol })
                .pipe(
                    mergeMap(cardFirstSteptAuthChallenge => samClusterClient.requestSamFirstStepAuth$({ uid, cardFirstSteptAuthChallenge }, transaction, samClusterClient.KEY_DEBIT)),
                    tap(samFirstStepAuthResponse => console.log(`  samFirstStepAuthResponso: SamId:${samFirstStepAuthResponse.samId}, secondStepSamToken: ${samFirstStepAuthResponse.secondStepSamToken.toString('hex')}`)),
                    tap(samFirstStepAuthResponse => transaction.samId = samFirstStepAuthResponse.samId),
                    mergeMap(samFirstStepAuthResponse => requestCardSecondStepAuth$({ secondStepSamToken: samFirstStepAuthResponse.secondStepSamToken, reader, protocol })),
                    mergeMap(cardSecondStepAuthConfirmation => samClusterClient.requestSamSecondStepAuth$(cardSecondStepAuthConfirmation, transaction))
                )
            ),
            //tap(result => console.log(`  requestFirstStepAuth: ${result.toString('hex')} `))
        );
};

const requestUid$ = ({ reader, protocol }) => {
    return sendApduCommandToCard$({ reader, protocol, apdu: [0xFF, 0xCA, 0x00, 0x00, 0x00], resLen: 40 })
        .pipe(
            filter(respBuffer => respBuffer[respBuffer.length - 2] == 0x90 && respBuffer[respBuffer.length - 1] == 0x00),
            map(respBuffer => respBuffer.slice(0, respBuffer.length - 2)),
            map(respBuffer => respBuffer.toString('hex')),
            tap(uid => console.log(`  requestUid: ${uid}`)),
        )
};

const requestCardFirstStepAuth$ = ({ reader, protocol }) => {
    const authRol = [0x04, 0x40];//  [40 00] en litle endian
    return sendApduCommandToCard$({ reader, protocol, apdu: [0x70, ...authRol, 0x00], resLen: 40 })
        .pipe(
            filter(respBuffer => respBuffer[0] == 0x90),
            map(respBuffer => respBuffer.slice(1, respBuffer.length)),
            map(respBuffer => respBuffer.toString('hex')),
            tap(cardFirstStepAuthChallenge => console.log(`  cardFirstStepAuthChallenge: ${cardFirstStepAuthChallenge}`)),
        )
};


const requestCardSecondStepAuth$ = ({ secondStepSamToken, reader, protocol }) => {
    // 0x72 + 32 bytes del requestCardSecondStepAuth
    const apduBuffer = Buffer.concat([Buffer.from([0x72]), secondStepSamToken.slice(0, -2)]);
    //const apduBuffer = Buffer.concat( [Buffer.from([0x72]), Buffer.from([0x00,0x00,0x00,0x00])] );    
    const apduByteArray = Array.from(apduBuffer);

    return sendApduCommandToCard$({ reader, protocol, apdu: apduByteArray, resLen: 40 })
        .pipe(
            map(respBuffer => respBuffer.slice(1, respBuffer.length)),
            map(respBuffer => respBuffer.toString('hex')),
            tap(cardSecondStepAuthConfirmation => console.log(`cardSecondStepAuthConfirmation: ${cardSecondStepAuthConfirmation}`))
        );
};






