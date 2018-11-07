'use strict';

const Rx = require('rxjs');
const { map, mergeMap, catchError } = require('rxjs/operators');
const { SamClusterClient } = require('../tools/mifare');


let instance;

class CivicaCard {
  constructor() {

    this.transaction = {
      appId: 'CIVICA-CARD-BACKEND',
      transactionId: uuidv4()
    };
    this.samClusterClient = new SamClusterClient({
      mqttServerUrl: 'tcp://rcswsyrt:wAQAois_Sqt5@m15.cloudmqtt.com:16858',
      replyTimeout: 1000
    });

  }

  //#region  mappers for API responses
  errorHandler$(err) {
    return Rx.of(err).pipe(
      map(err => {
        const exception = { data: null, result: {} };
        const isCustomError = err instanceof CustomError;
        if (!isCustomError) {
          err = new DefaultError(err);
        }
        exception.result = {
          code: err.code,
          error: { ...err.getContent() }
        };
        return exception;
      })
    );
  }

  buildSuccessResponse$(rawRespponse) {
    return Rx.of(rawRespponse).pipe(
      map(resp => {
        return {
          data: resp,
          result: {
            code: 200
          }
        };
      })
    );
  }

  //#endregion

  //#region  mappers for API responses
  getReadCardSecondAuthToken$({ root, args, jwt }, authToken) {
    console.log('llegan args: ', args);
    //return Rx.of({ authToken: 'ACA HEXA DE RESPUESTA' })
    return this.samClusterClient.requestSamFirstStepAuth$({
      uid: args.cardUid,
      cardFirstSteptAuthChallenge: args.challengeKey
    }, this.transaction, this.samClusterClient.KEY_DEBIT)
      .pipe(
        tap(samFirstStepAuthResponse => console.log(`  samFirstStepAuthResponso: SamId:${samFirstStepAuthResponse.samId}, secondStepSamToken: ${samFirstStepAuthResponse.secondStepSamToken.toString('hex')}`)),
        tap(samFirstStepAuthResponse => transaction.samId = samFirstStepAuthResponse.samId),
        mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse)),
        catchError(error => this.handleError$(error))
      );
  }

  getReaderKey$({ root, args, jwt }, authToken) {
    return Rx.of(undefined);
  }

  getReadCardApduCommands$({ root, args, jwt }, authToken) {
    return Rx.of(undefined);
  }

  extractReadCardData$({ root, args, jwt }, authToken) {
    return Rx.of(undefined);
  }

  getCardReloadInfo$({ root, args, jwt }, authToken) {
    return Rx.of(undefined);
  }

  extractReadWriteCardData$({ root, args, jwt }, authToken) {
    return Rx.of(undefined);
  }

  getConversation$({ root, args, jwt }, authToken) {
    return Rx.of(undefined);
  }
  //#endregion
}

/**
 * @returns {CivicaCard}
 */
module.exports = () => {
  if (!instance) {
    instance = new CivicaCard();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
