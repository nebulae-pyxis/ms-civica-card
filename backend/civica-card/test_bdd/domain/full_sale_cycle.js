'use strict';


// TEST LIBS
const assert = require('assert');
const expect = require('chai').expect
const Rx = require('rxjs');
const uuidv4 = require('uuid/v4');
const tokenRequester = require('keycloak-request-token');

const { connectReader$,
    sendApduCommandToCard$,
    requestUid$,
    requestCardFirstStepAuth$,
    requestCardSecondStepAuth$,
    readBlockData$,
    writeBlockData$ } = require('./full_sale_cycle_helper');

const {
    tap,
    switchMap,
    delay,
    filter,
    map,
    first,
    mapTo,
    mergeMap,
    concatMap
} = require('rxjs/operators');


/*
 * BlackBox Clients
 */
const pcsclite = require('pcsclite');
var pcsc = undefined;
let pcscReader = undefined;
let gqlClient;





/*
 * RUNTIME VARIABLES
 */
let jwt;
let civicaCardReloadConversationId = uuidv4();
let civicaCardReloadConversation;

let atr;
let uid;
let reader;
let protocol;

/**
 * HARDCODED ENTITIES
 */
const civicaCardReloadConversation_start_args = {
    id: civicaCardReloadConversationId,
    userJwt: jwt,
    userName: 'Mocha-Chai',
    posId: 'posId',
    posUserName: 'posUserName',
    posUserId: 'posUserId',
    posTerminal: 'posTerminal',
    posLocation: [-75.612855, 6.161791],
    readerType: 'BLE_HIGH_LEVEL',
    cardType: 'SL3'
};


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

        it('wait for card', function (done) {
            this.timeout(10000);
            Rx.fromEvent(pcscReader, 'status').pipe(
                //tap(s => console.log(`JSON=${JSON.stringify(s)} === KEYS=${Object.keys(pcscReader)}`)),
                filter(s => s.state == 34),
                //filter(s => s.state & pcscReader.SCARD_STATE_PRESENT),
                tap(s => { atr = s.atr; console.log(`ATR = ${JSON.stringify(s.atr)}`) }),
                mergeMap(s => connectReader$(pcscReader)),
                first(),
            ).subscribe(
                (evt) => {
                    reader = evt.reader; protocol = evt.protocol;
                    console.log(`  connectReader: ${JSON.stringify(evt)} `);
                },
                (error) => done(error),
                () => done()
            );
        });

        it('read card uid', function (done) {
            this.timeout(1000);
            requestUid$({ reader, protocol })
                .subscribe(
                    (evt) => {
                        console.log(`  card uid: ${evt} `);
                        uid = evt;
                    },
                    (error) => done(error),
                    () => done()
                );
        });
    });




    describe('JWT', function () {
        it('request token to keycloak', function (done) {
            this.timeout(1000);
            const baseUrl = 'http://localhost:8080/auth';
            const settings = {
                username: 'sebastian.molano@nebulae.com.co',
                password: 'uno.2.tres',
                grant_type: 'password',
                client_id: 'emi',
                realmName: 'DEV_PYXIS'
            };

            tokenRequester(baseUrl, settings)
                .then((token) => {
                    jwt = token;
                    console.log(``);
                    done();
                }).catch((err) => {
                    console.log('err', err);
                    done(error);
                });
        });
    });


    describe('GraphQL', function () {
        it('creating graphQL client', function (done) {
            gqlClient = require('graphql-client')({
                url: 'http://localhost:3000/api/sales-gateway/graphql/http',
                headers: {
                    Authorization: 'Bearer ' + jwt
                }
            });

            gqlClient.query(`
            query{author{id}}`, {}, function (req, res) {
                    if (res.status === 401) {
                        //throw new Error('Not authorized')
                        done(new Error('Not authorized'));
                    }
                })
                .then(function (body) {
                    console.log(body)
                    done();
                })
                .catch(function (err) {
                    console.log(err.message)
                })
        });
    });


})

/*
============================================================
============================================================
============================================================
*/


/*================== CONVERSATION CREATE/RETRIEVE ========================*/


describe('CivicaCardReloadConversation', function () {
    describe('start conversation', function () {

        it('query undefined cnversation', function (done) {
            Rx.from(
                gqlClient.query(`
                query{
                    CivicaCardReloadConversation(id: "not-a-real-conversation-id"){
                      id,operationState,readerType,cardType
                    }
                  }`, {}, (req, res) => { if (res.status !== 200) throw new Error(`HTTP ERR: ${JSON.stringify(res)}`) })
            ).pipe(
                first(),
                //tap((body) => console.log(JSON.stringify(body))),
                tap((body) => expect(body.data.CivicaCardReloadConversation).to.be.null),
                tap((body) => expect(body.errors.length).to.be.gt(0)),
                tap((body) => expect(body.errors[0].message.code).to.be.eq(9)),
            ).subscribe(
                (evt) => { },
                (error) => { console.error(error.stack || error); done(error); },
                () => { done(); },
            );
        });


        // startCivicaCardReloadConversation(id: "${civicaCardReloadConversation_start_args.id}", userJwt: "${civicaCardReloadConversation_start_args.jwt}", userName: "${civicaCardReloadConversation_start_args.userName}", posId: "${civicaCardReloadConversation_start_args.posId}", posUser: "${civicaCardReloadConversation_start_args.posUser}", posTerminal: "${civicaCardReloadConversation_start_args.posTerminal}", posLocation: ${civicaCardReloadConversation_start_args.posLocation}", readerType: "${civicaCardReloadConversation_start_args.readerType}", cardType: "${civicaCardReloadConversation_start_args.cardType}"){
        it('Start conversation', function (done) {
            const mutation = `
            mutation {
                startCivicaCardReloadConversation(
                    id: "${civicaCardReloadConversation_start_args.id}",                    
                    posId: "${civicaCardReloadConversation_start_args.posId}", 
                    posUserName: "${civicaCardReloadConversation_start_args.posUserName}", 
                    posUserId: "${civicaCardReloadConversation_start_args.posUserId}", 
                    posTerminal: "${civicaCardReloadConversation_start_args.posTerminal}", 
                    posLocation: [${civicaCardReloadConversation_start_args.posLocation}], 
                    readerType: "${civicaCardReloadConversation_start_args.readerType}", 
                    cardType: "${civicaCardReloadConversation_start_args.cardType}"
                    cardUid: "${uid}"
                    ){
                  id
                }
              }`;
            //console.log(mutation);
            Rx.from(
                gqlClient.query(mutation, {}, (req, res) => { if (res.status !== 200) throw new Error(`HTTP ERR: ${JSON.stringify(res)}`) })
            ).pipe(
                first(),
                //tap((body) => console.log(`#########${JSON.stringify(body)}`)),
                tap((body) => expect(body.data.startCivicaCardReloadConversation).not.to.be.null),
                tap((body) => expect(body.errors).to.be.undefined),
                tap((body) => expect(body.data.startCivicaCardReloadConversation.id).to.be.eq(civicaCardReloadConversationId)),

            ).subscribe(
                (evt) => { },
                (error) => { console.error(error.stack || error); done(error); },
                () => { done(); },
            );
        });

        it('query newly created conversation', function (done) {
            Rx.from(
                gqlClient.query(`
                query{
                    CivicaCardReloadConversation(id: "${civicaCardReloadConversationId}"){id}
                  }`, {}, (req, res) => { if (res.status !== 200) throw new Error(`HTTP ERR: ${JSON.stringify(res)}`) })
            ).pipe(
                first(),
                //tap((body) => console.log(`##%%%%%%%%%%%%${JSON.stringify(body)}`)),
                tap((body) => expect(body.data.CivicaCardReloadConversation).not.to.be.null),
                tap((body) => expect(body.errors).to.be.undefined),
                tap((body) => expect(body.data.CivicaCardReloadConversation.id).to.be.eq(civicaCardReloadConversationId)),
            ).subscribe(
                (evt) => { },
                (error) => { console.error(error.stack || error); done(error); },
                () => { done(); },
            );
        });


    });

})



/*================== PUBLIC: AUTH + READ CARD ========================*/


describe('READ Card', function () {

    //const cardRole = 'DEBIT'; const authRol = [0x04, 0x40]; const dataType = 'CIVICA';
    const cardRole = 'PUBLIC'; const authRol = [0x02, 0x40]; const dataType = 'PUBLIC';


    let cardSecondStepAuthConfirmation;
    let readApduCommands;



    describe('Auth Card', function () {


        it('auth card', function (done) {
            this.timeout(10000);

            Rx.of('').pipe(
                delay(500),
                mergeMap(() => requestCardFirstStepAuth$({ reader, protocol, authRol })),
                mergeMap(cardFirstSteptAuthChallenge => generateCivicaCardReloadSecondAuthToken$(uid, cardFirstSteptAuthChallenge, cardRole)),
                mergeMap((samFirstStepAuthResponse) => {
                    const secondStepSamToken = Buffer.alloc(samFirstStepAuthResponse.length / 2);
                    secondStepSamToken.write(samFirstStepAuthResponse, 0, samFirstStepAuthResponse.length, 'hex');
                    return requestCardSecondStepAuth$({ secondStepSamToken, reader, protocol });
                }),
                first(),
            ).subscribe(
                (evt) => {
                    cardSecondStepAuthConfirmation = evt;
                    console.log(`  card cardSecondStepAuthConfirmation: ${cardSecondStepAuthConfirmation}`);
                },
                (error) => done(error),
                () => done()
            );
        });
    });

    describe('Read Card', function () {
        let binaryCommands = [];
        it('generateCivicaCardReloadReadApduCommands', function (done) {
            this.timeout(1000);
            generateCivicaCardReloadReadApduCommands$(cardSecondStepAuthConfirmation, dataType).pipe(
                mergeMap(binaryCommands => Rx.from(binaryCommands)),
                concatMap(binaryCommand => {
                    const apduByteArray = Array.from(Buffer.from(binaryCommand.cmd, 'hex'));
                    return readBlockData$({ reader, protocol, apdu: apduByteArray }).pipe(
                        tap(readerResponse => binaryCommand.resp = readerResponse),
                        mapTo(binaryCommand)
                    );
                })
            ).subscribe(
                (binaryCommand) => {
                    console.log(`  binaryCommand: ${JSON.stringify(binaryCommand)} `);
                    binaryCommands.push(binaryCommand);
                },
                (error) => done(error),
                () => done()
            );
        });


        it('processCivicaCardReloadReadApduCommandRespones', function (done) {
            this.timeout(1000);
            processCivicaCardReloadReadApduCommandRespones$(binaryCommands)
                .subscribe(
                    (binaryCommand) => {
                        console.log(`  binaryCommand: ${JSON.stringify(binaryCommand)} `);
                        binaryCommands.push(binaryCommand);
                    },
                    (error) => done(error),
                    () => done()
                );
        });

    });


});





/*================== CIVICA: AUTH + READ CARD ========================*/


describe('READ Card', function () {

    const cardRole = 'DEBIT'; const authRol = [0x04, 0x40]; const dataType = 'CIVICA';
    //const cardRole = 'PUBLIC'; const authRol = [0x02, 0x40]; const dataType = 'PUBLIC';


    let cardSecondStepAuthConfirmation;
    let readApduCommands;



    describe('Auth Card', function () {


        it('auth card', function (done) {
            this.timeout(10000);

            Rx.of('').pipe(
                delay(500),
                mergeMap(() => requestCardFirstStepAuth$({ reader, protocol, authRol })),
                mergeMap(cardFirstSteptAuthChallenge => generateCivicaCardReloadSecondAuthToken$(uid, cardFirstSteptAuthChallenge, cardRole)),
                mergeMap((samFirstStepAuthResponse) => {
                    const secondStepSamToken = Buffer.alloc(samFirstStepAuthResponse.length / 2);
                    secondStepSamToken.write(samFirstStepAuthResponse, 0, samFirstStepAuthResponse.length, 'hex');
                    return requestCardSecondStepAuth$({ secondStepSamToken, reader, protocol });
                }),
                first(),
            ).subscribe(
                (evt) => {
                    cardSecondStepAuthConfirmation = evt;
                    console.log(`  card cardSecondStepAuthConfirmation: ${cardSecondStepAuthConfirmation}`);
                },
                (error) => done(error),
                () => done()
            );
        });
    });

    describe('Read Card', function () {
        let binaryCommands = [];
        it('generateCivicaCardReloadReadApduCommands', function (done) {
            this.timeout(1000);
            generateCivicaCardReloadReadApduCommands$(cardSecondStepAuthConfirmation, dataType).pipe(
                mergeMap(binaryCommands => Rx.from(binaryCommands)),
                concatMap(binaryCommand => {
                    const apduByteArray = Array.from(Buffer.from(binaryCommand.cmd, 'hex'));
                    return readBlockData$({ reader, protocol, apdu: apduByteArray }).pipe(
                        tap(readerResponse => binaryCommand.resp = readerResponse),
                        mapTo(binaryCommand)
                    );
                })
            ).subscribe(
                (binaryCommand) => {
                    console.log(`  binaryCommand: ${JSON.stringify(binaryCommand)} `);
                    binaryCommands.push(binaryCommand);
                },
                (error) => done(error),
                () => done()
            );
        });


        it('processCivicaCardReloadReadApduCommandRespones', function (done) {
            this.timeout(1000);
            processCivicaCardReloadReadApduCommandRespones$(binaryCommands)
                .subscribe(
                    (binaryCommand) => {
                        console.log(`  binaryCommand: ${JSON.stringify(binaryCommand)} `);
                        binaryCommands.push(binaryCommand);
                    },
                    (error) => done(error),
                    () => done()
                );
        });

    });


});



/*================== PURCHASE CARD RELOAD ========================*/



describe('PURCHASE CARD RELOAD', function () {
    it('purchase itself', function (done) {
        this.timeout(1000);
        purchaseCivicaCardReload$(5000)
            .subscribe(
                (purchase) => {
                    console.log(`  purchase: ${JSON.stringify(purchase)} `);
                },
                (error) => done(error),
                () => done()
            );
    });
})



/*================== WRITE AND READ CARD ========================*/

describe('WRITE AND READ CARD', function () {

    const cardRole = 'CREDIT'; const authRol = [0x05, 0x40]; const dataType = 'CIVICA';

    let cardSecondStepAuthConfirmation;
    let writeApduCommands;
    let readApduCommands;



    describe('Auth Card', function () {


        it('auth card', function (done) {
            this.timeout(10000);

            Rx.of('').pipe(
                delay(500),
                mergeMap(() => requestCardFirstStepAuth$({ reader, protocol, authRol })),
                mergeMap(cardFirstSteptAuthChallenge => generateCivicaCardReloadSecondAuthToken$(uid, cardFirstSteptAuthChallenge, cardRole)),
                mergeMap((samFirstStepAuthResponse) => {
                    const secondStepSamToken = Buffer.alloc(samFirstStepAuthResponse.length / 2);
                    secondStepSamToken.write(samFirstStepAuthResponse, 0, samFirstStepAuthResponse.length, 'hex');
                    return requestCardSecondStepAuth$({ secondStepSamToken, reader, protocol });
                }),
                first(),
            ).subscribe(
                (evt) => {
                    cardSecondStepAuthConfirmation = evt;
                    console.log(`  card cardSecondStepAuthConfirmation: ${cardSecondStepAuthConfirmation}`);
                },
                (error) => done(error),
                () => done()
            );
        });
    });

    describe('Write + Read Card', function () {
        let binaryCommands = [];
        it('generateCivicaCardReloadWriteAndReadApduCommands', function (done) {
            this.timeout(1000);
            generateCivicaCardReloadWriteAndReadApduCommands$(cardSecondStepAuthConfirmation, dataType).pipe(
                mergeMap(binaryCommands => Rx.from(binaryCommands)),
                concatMap(binaryCommand => {
                    const apduByteArray = Array.from(Buffer.from(binaryCommand.cmd, 'hex'));
                    return readBlockData$({ reader, protocol, apdu: apduByteArray }).pipe(
                        tap(readerResponse => binaryCommand.resp = readerResponse),
                        mapTo(binaryCommand)
                    );
                })
            ).subscribe(
                (binaryCommand) => {
                    console.log(`  binaryCommand: ${JSON.stringify(binaryCommand)} `);
                    binaryCommands.push(binaryCommand);
                },
                (error) => done(error),
                () => done()
            );
        });


        it('processCivicaCardReloadWriteAndReadApduCommandResponses', function (done) {
            this.timeout(1000);
            processCivicaCardReloadWriteAndReadApduCommandResponses$(binaryCommands)
                .subscribe(
                    (binaryCommand) => {
                        console.log(`  binaryCommand: ${JSON.stringify(binaryCommand)} `);
                        binaryCommands.push(binaryCommand);
                    },
                    (error) => done(error),
                    () => done()
                );
        });

    });


});


/*======================================================================*/
/*============================   API CALLS   ===========================*/
/*======================================================================*/



const generateCivicaCardReloadSecondAuthToken$ = (cardUid, cardChallenge, cardRole) => {
    return Rx.from(
        gqlClient.query(`
        mutation {
            generateCivicaCardReloadSecondAuthToken(conversationId: "${civicaCardReloadConversationId}",cardChallenge: "${cardChallenge}",cardRole: "${cardRole}",){token}
          }`, {}, (req, res) => { if (res.status !== 200) throw new Error(`HTTP ERR: ${JSON.stringify(res)}`) })
    ).pipe(
        first(),
        tap((body) => console.log(`generateCivicaCardReloadSecondAuthToken: ${JSON.stringify(body)}`)),
        tap((body) => expect(body.data.generateCivicaCardReloadSecondAuthToken).not.to.be.null),
        tap((body) => expect(body.errors).to.be.undefined),
        tap((body) => expect(body.data.generateCivicaCardReloadSecondAuthToken.token).not.to.be.null),
        map((body) => body.data.generateCivicaCardReloadSecondAuthToken.token)
    )
}

const generateCivicaCardReloadReadApduCommands$ = (cardSecondStepAuthConfirmation, dataType) => {
    return Rx.from(
        gqlClient.query(`
        mutation {
            generateCivicaCardReloadReadApduCommands(conversationId: "${civicaCardReloadConversationId}",cardAuthConfirmationToken: "${cardSecondStepAuthConfirmation}",dataType: "${dataType}"){ order, cmd, resp, cbc, rbc }
          }`, {}, (req, res) => { if (res.status !== 200) throw new Error(`HTTP ERR: ${JSON.stringify(res)}`) })
    ).pipe(
        first(),
        tap((body) => console.log(`generateCivicaCardReloadReadApduCommands: ${JSON.stringify(body)}`)),
        tap((body) => expect(body.data.generateCivicaCardReloadReadApduCommands).not.to.be.null),
        //tap((body) => expect(body.errors).to.be.undefined),
        //tap((body) => expect(body.data.generateCivicaCardReloadSecondAuthToken.token).not.to.be.null),
        map((body) => body.data.generateCivicaCardReloadReadApduCommands)
    )
}


const processCivicaCardReloadReadApduCommandRespones$ = (binaryCommands) => {
    const mutation = `
    mutation {
        processCivicaCardReloadReadApduCommandRespones(conversationId: "${civicaCardReloadConversationId}",
        commands: [${ binaryCommands.map(
            bc => "{" + (Object.keys(bc).map(key => `${key}: ${(typeof bc[key] === 'string' || bc[key] instanceof String) ? `"${bc[key]}"` : `${bc[key]}`}`)) + "}"
        ).join(', ')}]
        ){ identificacionEmpresa,identificacionEmpleado,tipoNumeroDocumento,saldoTarjeta,saldoTarjetaBk,numeroTerminal,formaPagoUsoTransporte,fechaHoraTransaccion,rutaUtilizada,perfilUsuario,rutaAnterior,valorPagoUsoTransporte,secuenciaUsoTrayecto,_saldoTarjeta }
    }`;
    return Rx.from(
        gqlClient.query(mutation, {}, (req, res) => { if (res.status !== 200) throw new Error(`HTTP ERR: ${JSON.stringify(res)}`) })
    ).pipe(
        first(),
        tap((body) => console.log(`processCivicaCardReloadReadApduCommandRespones: ${JSON.stringify(body)}`)),
        tap((body) => expect(body.data.processCivicaCardReloadReadApduCommandRespones).not.to.be.null),
        //tap((body) => expect(body.errors).to.be.undefined),
        //tap((body) => expect(body.data.generateCivicaCardReloadSecondAuthToken.token).not.to.be.null),
        map((body) => body.data.processCivicaCardReloadReadApduCommandRespones)
    )
}


const purchaseCivicaCardReload$ = (value) => {
    const mutation = `
    mutation {
        purchaseCivicaCardReload(conversationId: "${civicaCardReloadConversationId}", value: ${value}
        ){granted,errorMsg,receipt{id,timestamp,reloadValue,cardInitialValue,cardFinalValue,businesId,posId,posUserName,posUserId,posTerminal}   }
    }`;
    return Rx.from(
        gqlClient.query(mutation, {}, (req, res) => { if (res.status !== 200) throw new Error(`HTTP ERR: ${JSON.stringify(res)}`) })
    ).pipe(
        first(),
        tap((body) => console.log(`purchaseCivicaCardReload: ${JSON.stringify(body)}`)),
        tap((body) => expect(body.data.purchaseCivicaCardReload).not.to.be.null),
        //tap((body) => expect(body.errors).to.be.undefined),
        //tap((body) => expect(body.data.generateCivicaCardReloadSecondAuthToken.token).not.to.be.null),
        map((body) => body.data.purchaseCivicaCardReload)
    )
}


const generateCivicaCardReloadWriteAndReadApduCommands$ = (cardSecondStepAuthConfirmation, dataType) => {
    return Rx.from(
        gqlClient.query(`
        mutation {
            generateCivicaCardReloadWriteAndReadApduCommands(conversationId: "${civicaCardReloadConversationId}",cardAuthConfirmationToken: "${cardSecondStepAuthConfirmation}",dataType: "${dataType}"){ order, cmd, resp, cbc, rbc }
          }`, {}, (req, res) => { if (res.status !== 200) throw new Error(`HTTP ERR: ${JSON.stringify(res)}`) })
    ).pipe(
        first(),
        tap((body) => console.log(`generateCivicaCardReloadWriteAndReadApduCommands: ${JSON.stringify(body)}`)),
        tap((body) => expect(body.data.generateCivicaCardReloadWriteAndReadApduCommands).not.to.be.null),
        //tap((body) => expect(body.errors).to.be.undefined),
        //tap((body) => expect(body.data.generateCivicaCardReloadSecondAuthToken.token).not.to.be.null),
        map((body) => body.data.generateCivicaCardReloadWriteAndReadApduCommands)
    )
}


const processCivicaCardReloadWriteAndReadApduCommandResponses$ = (binaryCommands) => {
    const mutation = `
    mutation {
        processCivicaCardReloadWriteAndReadApduCommandResponses(conversationId: "${civicaCardReloadConversationId}",
        commands: [${ binaryCommands.map(
            bc => "{" + (Object.keys(bc).map(key => `${key}: ${(typeof bc[key] === 'string' || bc[key] instanceof String) ? `"${bc[key]}"` : `${bc[key]}`}`)) + "}"
        ).join(', ')}]
        ){ identificacionEmpresa,identificacionEmpleado,tipoNumeroDocumento,saldoTarjeta,saldoTarjetaBk,numeroTerminal,formaPagoUsoTransporte,fechaHoraTransaccion,rutaUtilizada,perfilUsuario,rutaAnterior,valorPagoUsoTransporte,secuenciaUsoTrayecto,_saldoTarjeta }
    }`;
    return Rx.from(
        gqlClient.query(mutation, {}, (req, res) => { if (res.status !== 200) throw new Error(`HTTP ERR: ${JSON.stringify(res)}`) })
    ).pipe(
        first(),
        tap((body) => console.log(`processCivicaCardReloadWriteAndReadApduCommandResponses: ${JSON.stringify(body)}`)),
        tap((body) => expect(body.data.processCivicaCardReloadWriteAndReadApduCommandResponses).not.to.be.null),
        //tap((body) => expect(body.errors).to.be.undefined),
        //tap((body) => expect(body.data.generateCivicaCardReloadSecondAuthToken.token).not.to.be.null),
        map((body) => body.data.processCivicaCardReloadWriteAndReadApduCommandResponses)
    )
}





/*
============================================================
============================================================
============================================================
*/

describe('De-Prepare', function () {
    describe('NFC reader stop', function () {
        it('connect', function (done) {
            pcscReader.close();
            pcsc.close();
            done();
        });
    });

})








