const Rx = require('rxjs');
const uuidv4 = require('uuid/v4');
const expect = require('chai').expect

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



const connectReader$ = (reader) => {
    return Rx.bindNodeCallback(reader.connect.bind(reader))({ share_mode: reader.SCARD_SHARE_SHARED })
        .pipe(
            map(protocol => ({ reader, protocol }))
        );
}

const sendApduCommandToCard$ = ({ reader, protocol, apdu, resLen }) => {
    return Rx.bindNodeCallback(reader.transmit.bind(reader))(Buffer.from(apdu), resLen, protocol);
}


const requestUid$ = ({ reader, protocol }) => {
    return sendApduCommandToCard$({ reader, protocol, apdu: [0xFF, 0xCA, 0x00, 0x00, 0x00], resLen: 40 })
        .pipe(
            filter(respBuffer => respBuffer[respBuffer.length - 2] == 0x90 && respBuffer[respBuffer.length - 1] == 0x00),
            map(respBuffer => respBuffer.slice(0, respBuffer.length - 2)),
            map(respBuffer => respBuffer.toString('hex')),
            tap(uid => console.log(`  requestUid: ${uid}`)),
        )
};

const readBlockData$ = ({ reader, protocol, apdu }) => {
    return sendApduCommandToCard$({ reader, protocol, apdu, resLen: 1024 })
        .pipe(
            //tap(resp => console.log(`  readBlockData_raw: ${resp.toString('hex')}`)),
            //tap(respBuffer => expect(respBuffer[0]).to.be.equals(0x90)),
            //map(respBuffer => respBuffer.slice(1, respBuffer.length)),
            map(respBuffer => respBuffer.toString('hex')),
        )
};

const requestCardFirstStepAuth$ = ({ reader, protocol, authRol }) => {    
    return sendApduCommandToCard$({ reader, protocol, apdu: [0x70, ...authRol, 0x00], resLen: 256 })
        .pipe(
            filter(respBuffer => respBuffer[0] == 0x90),
            map(respBuffer => respBuffer.slice(1, respBuffer.length)),
            map(respBuffer => respBuffer.toString('hex')),
            tap(cardFirstStepAuthChallenge => console.log(`  cardFirstStepAuthChallenge: ${cardFirstStepAuthChallenge}`)),
        )
};


const requestCardSecondStepAuth$ = ({ secondStepSamToken, reader, protocol }) => {
    // 0x72 + 32 bytes del requestCardSecondStepAuth
    const apduBuffer = Buffer.concat( [Buffer.from([0x72]), secondStepSamToken.slice(0,-2)] );    
    //const apduBuffer = Buffer.concat( [Buffer.from([0x72]), Buffer.from([0x00,0x00,0x00,0x00])] );    
    const apduByteArray = Array.from(apduBuffer);
    
    return sendApduCommandToCard$({ reader, protocol, apdu: apduByteArray, resLen: 40 })
        .pipe( 
            map(respBuffer => respBuffer.slice(1, respBuffer.length)),          
            map(respBuffer => respBuffer.toString('hex')),
        );
};


module.exports = {
    connectReader$,
    sendApduCommandToCard$,
    requestUid$,
    requestCardFirstStepAuth$,
    requestCardSecondStepAuth$,
    readBlockData$
}






