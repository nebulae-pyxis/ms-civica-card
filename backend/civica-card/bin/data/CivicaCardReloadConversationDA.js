'use strict'

let mongoDB = undefined;
const Rx = require('rxjs');
const CollectionName = "CivicaCardReloadConversationDA";
const { CustomError } = require('../tools/customError');
const { map, tap, mapTo } = require('rxjs/operators');


class CivicaCardReloadConversationDA {

  static start$(mongoDbInstance) {
    return Rx.Observable.create((observer) => {
      if (mongoDbInstance) {
        mongoDB = mongoDbInstance;
        observer.next('using given mongo instance');
      } else {
        mongoDB = require('./MongoDB').singleton();
        observer.next('using singleton system-wide mongo instance');
      }
      observer.complete();
    });
  }

  /**
   * Finds a CivicaCardReloadConversation by its id
   * @param string id 
   */
  static find$(id) {
    const collection = mongoDB.db.collection(CollectionName);
    return Rx.defer(() => collection.findOne({ _id: id }));
  }

  /**
   * Finds a CivicaCardReloadConversation by its id
   * @param string id 
   */
  static create$({ id, userJwt, userName, posId, posUser, posTerminal, posLocation, readerType, cardType, cardUid }) {
    const collection = mongoDB.db.collection(CollectionName);

    const conversation = {
      _id: id,
      timestamp: Date.now(),
      user: {
        jwt: userJwt,
        name: userName
      },
      pos: {
        id: posId,
        user: posUser,
        terminal: posTerminal,
        location: posLocation
      },
      readerType,
      cardType,
      cardUid,
      initialCard: {
        rawData:{},
        civicaData:{}
      },
      finalCard: {
        rawData:{},
        civicaData:{}
      },
      currentCardAuth: {

      }

    };
    return Rx.defer(() => collection.insertOne(conversation)).pipe(
      mapTo(conversation)
    );
  }

  static setSamId$(id, samId) {
    const collection = mongoDB.db.collection(CollectionName);
    return Rx.defer(() => collection.update(
      { '_id': id },
      { '$set': { 'currentCardAuth.samId': samId } },
      { 'multi': false }
    )).pipe(
      tap(x => { if (x.result.n < 1) throw (new Error(`CivicaCardReloadConversation(id:${id}) not found`)); })
    );
  }

  static setSamAuthObj$(id, samAuthObj) {
    const collection = mongoDB.db.collection(CollectionName);
    return Rx.defer(() => collection.update(
      { '_id': id },
      {
        '$set': {
          'currentCardAuth.samAuthObj': {
            raw: samAuthObj.raw,
            keyEnc: samAuthObj.keyEnc.toString('hex'),
            keyMac: samAuthObj.keyMac.toString('hex'),
            ti: samAuthObj.ti.toString('hex'),
            readCount: samAuthObj.readCount,
            writeCount: samAuthObj.readCount
          }
        }
      },
      { 'multi': false }
    )).pipe(
      tap(x => { if (x.result.n < 1) throw (new Error(`CivicaCardReloadConversation(id:${id}) not found`)); }),
      mapTo(samAuthObj)
    );
  }

  static setInitialCardRawData$(id, rawData) {
    const collection = mongoDB.db.collection(CollectionName);
    const updateQuery =  [
      { '_id': id },
      {
        '$set': {
          'initialCard.rawData': rawData
        }
      },
      { 'multi': false }
    ];

    return Rx.defer(() => collection.update(...updateQuery)).pipe(
      tap(x => { if (x.result.n < 1) throw (new Error(`CivicaCardReloadConversation(id:${id}) not found`)); }),
      mapTo(rawData)
    );
  }

  static setInitialCardCivicaData$(id, civicaData) {
    const collection = mongoDB.db.collection(CollectionName);
    const updateQuery =  [
      { '_id': id },
      {
        '$set': {
          'initialCard.civicaData': civicaData
        }
      },
      { 'multi': false }
    ];

    return Rx.defer(() => collection.update(...updateQuery)).pipe(
      tap(x => { if (x.result.n < 1) throw (new Error(`CivicaCardReloadConversation(id:${id}) not found`)); }),
      mapTo(civicaData)
    );
  } 


}
/**
 * @returns CivicaCardReloadConversationDA
 */
module.exports = CivicaCardReloadConversationDA 