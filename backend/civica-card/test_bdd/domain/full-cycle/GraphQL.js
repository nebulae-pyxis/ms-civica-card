'use strict';

const expect = require('chai').expect
const GqlClient = require('graphql-client');
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

class GraphQL {

    constructor(jwt) {
        this.jwt = jwt;
        this.url = 'http://localhost:3000/api/sales-gateway/graphql/http';
        //this.url = 'https://pyxis.nebulae.com.co/api/sales-gateway/graphql/http';        
    }

    connect$() {
        return Rx.Observable.create(obs => {
            this.gqlClient = GqlClient({
                url: this.url,
                headers: {
                    Authorization: 'Bearer ' + this.jwt
                }
            });
            obs.next(`GraphQL connected to ${this.url}`);
            obs.complete();
        });
    }

    testConnection$() {
        const testQuery = `query{author{id}}`;
        return this.executeQuery$(testQuery).pipe(
            tap(({data,errors}) => expect(data.author).to.not.be.equals("1233")),
            map(({data,errors}) => `GraphQL test ok: ${JSON.stringify(data)}`),
        );
    }


    disconnect$() {
        return Rx.of('GraphQL disconnect not implemented');
    }


    executeQuery$(query, args = {}) {
        return Rx.from(
            this.gqlClient.query(query, args, function (req, res) {
                if (res.status !== 200) {
                    throw new Error(`HTTP ERR: ${JSON.stringify(res)}`)
                }
            })
        ).pipe(
            //tap(x => console.log(`====${JSON.stringify(x)}=====`))
        )
    }

}

module.exports = GraphQL;