const assert = require('assert');
const expect = require('chai').expect
const uuidv4 = require('uuid/v4');
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
    concatMap
} = require('rxjs/operators');


const Reader = require('./Reader');
const KeyCloak = require('./KeyCloak');
const GraphQL = require('./GraphQL');


const reader = new Reader();
const keyCloak = new KeyCloak();
const graphQL = new GraphQL();


const logError = (error) => {
    if (!error.stack) {
        console.error(error);
    }
    const stackLines = error.stack.split('\n');
    console.error(
        stackLines[0] + '\n' + stackLines.filter(line => line.includes('civica-card/bin')).join('\n') + '\n'
    );
};

const getRxDefaultSubscription = (evtText, done) => {
    return [
        (evt) => console.log(`${evtText}: ${evt}`),
        (error) => { done(error); logError(error) },
        () => done()
    ];
};


describe('Full Cycle Test', function () {

    describe('Prepare', function () {
        it('connect hardware and servers', function (done) {
            this.timeout(5000);
            Rx.merge(
                reader.connect$().pipe(mergeMap(() => reader.detectCard$())),
                keyCloak.logIn$().pipe(
                    tap(jwt => graphQL.jwt = jwt),
                    mergeMap(jwt => graphQL.connect$()),
                    mergeMap(() => graphQL.testConnection$())
                )
            ).subscribe(...getRxDefaultSubscription('Prepare:connect hardware and servers', done));
        });
    });


    /*
        Conversation + Business & Wallet activation
        - start conversation w/o Businness
        - start conversation w Businness deactivated
        - activate Business
        - start conversation w/ Wallet
        - start conversation w Wallet Deactivated
        - activate Wallet
        - Retrieve false cnversations
        - Create Conversation
        - Retrieve valid conversation     
    */
    








    describe('De-Prepare', function () {
        it('disconnects hardware and servers', function (done) {
            this.timeout(5000);
            Rx.merge(
                reader.disconnect$(),
                keyCloak.logOut$(),
                graphQL.disconnect$()
            ).subscribe(...getRxDefaultSubscription('De-Prepare:disconnect hardware and servers', done));
        });
    });





})