'use strict';

const Rx = require('rxjs');

let instance;

class CivicaCard {
  constructor() {}

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
  getReadCardSeconduthToken$({ root, args, jwt }, authToken) { 
    return Rx.of(undefined);
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
