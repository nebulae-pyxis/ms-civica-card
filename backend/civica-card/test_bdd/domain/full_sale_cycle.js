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
    requestCardSecondStepAuth$ } = require('./full_sale_cycle_helper');

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
    posUser: 'posUser',
    posTerminal: 'posTerminal',
    posLocation: [0, 0],
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
                    posUser: "${civicaCardReloadConversation_start_args.posUser}", 
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



/*================== AUTH + READ CARD ========================*/


describe('READ Card', function () {

    let cardSecondStepAuthConfirmation;

    let readApduCommands;

    describe('Auth Card', function () {


        it('auth card', function (done) {
            this.timeout(10000);

            Rx.of('').pipe(
                delay(500),
                mergeMap(() => requestCardFirstStepAuth$({ reader, protocol })),
                mergeMap(cardFirstSteptAuthChallenge => generateCivicaCardReloadSecondAuthToken$(uid, cardFirstSteptAuthChallenge, 'DEBIT')),
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
        it('generateCivicaCardReloadReadApduCommands', function (done) {
            this.timeout(1000);
            generateCivicaCardReloadReadApduCommands$(cardSecondStepAuthConfirmation, 'PUBLIC')
                .subscribe(
                    (evt) => {
                        console.log(`  readApduCommands: ${evt} `);
                        readApduCommands = evt;
                    },
                    (error) => done(error),
                    () => done()
                );
        });
    });
})


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
            generateCivicaCardReloadReadApduCommands(conversationId: "${civicaCardReloadConversationId}",cardAuthConfirmationToken: "${cardSecondStepAuthConfirmation}",dataType: "${dataType}"){ order, cmd, resp }
          }`, {}, (req, res) => { if (res.status !== 200) throw new Error(`HTTP ERR: ${JSON.stringify(res)}`) })
    ).pipe(
        first(),
        tap((body) => console.log(`generateCivicaCardReloadReadApduCommands: ${JSON.stringify(body)}`)),
        tap((body) => expect(body.data.generateCivicaCardReloadReadApduCommands).not.to.be.null),
        //tap((body) => expect(body.errors).to.be.undefined),
        //tap((body) => expect(body.data.generateCivicaCardReloadSecondAuthToken.token).not.to.be.null),
        //map((body) => body.data.generateCivicaCardReloadSecondAuthToken.token)        
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








