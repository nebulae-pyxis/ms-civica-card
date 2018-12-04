'use strict'

let mongoDB = undefined;
const Rx = require('rxjs');
const CollectionName = "CivicaCardReloadConversation";
const { CustomError, CONVERSATION_NOT_FOUND } = require('../tools/customError');
const { map, tap, mapTo } = require('rxjs/operators');


class CivicaCardReloadConversationDA {

  /**
   * prepare thsi DA to work
   * @param {*} mongoDbInstance 
   */
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
    return Rx.defer(() => collection.findOne({ _id: id })).pipe(
      tap(conversation => { if (conversation === null) throw new CustomError('CivicaCardReloadConversation not Found', `getCivicaCardReloadConversation(${id})`, CONVERSATION_NOT_FOUND) })
    );
  }

  /**
   * id CivicaCardReloadConversation
   * @param {{ id, userJwt, userName, businessId, posId, posUserName, posUserId, posTerminal, posLocation, readerType, cardType, cardUid }} data 
   */
  static create$({ id, userJwt, userName, businessId, posId, posUserName, posUserId, posTerminal, posLocation, readerType, cardType, cardUid }) {
    const collection = mongoDB.db.collection(CollectionName);

    const conversation = {
      _id: id,
      timestamp: Date.now(),
      uiStateHistory: [],
      uiState: '',
      businessId,
      user: {
        jwt: userJwt,
        name: userName,
      },
      pos: {
        id: posId,
        userName: posUserName,
        userId: posUserId,
        terminal: posTerminal,
        location: {
          "type": "Point",
          "coordinates": posLocation
        }
      },
      readerType,
      cardType,
      cardUid,
      initialCard: {
        rawData: {},
        civicaData: {}
      },
      finalCard: {
        rawData: {},
        civicaData: {}
      },
      currentCardAuth: {
      }

    };
    return Rx.defer(() => collection.insertOne(conversation)).pipe(
      mapTo(conversation)
    );
  }

  /**
   * Sets the property uiState at the conversation
   * @param {String} id conversation id
   * @param {String} uiState state to set
   */
  static setUiState$(id, uiState) {
    const collection = mongoDB.db.collection(CollectionName);
    return Rx.defer(() => collection.findOneAndUpdate(
      { '_id': id },
      { '$set': { 'uiState': uiState }, '$push': { 'uiStateHistory': { uiState, ts: Date.now() } } },
      { 'returnOriginal': true }
    )).pipe(
      map(result => result && result.value ? result.value : undefined)
    );
  }

  /**
   * Sets the samId, samKey and cardRole currently being used in the conversation
   * @param {String} id conversation id
   * @param {*} samId 
   * @param {*} samKey 
   * @param {*} cardRole 
   */
  static setSamIdSamKeyAndCardRole$(id, samId, samKey, cardRole) {
    const collection = mongoDB.db.collection(CollectionName);
    return Rx.defer(() => collection.update(
      { '_id': id },
      {
        '$set': {
          'currentCardAuth.samId': samId,
          'currentCardAuth.samKey': samKey,
          'currentCardAuth.cardRole': cardRole
        }
      },
      { 'multi': false }
    )).pipe(
      tap(x => { if (x.result.n < 1) throw new CustomError('CivicaCardReloadConversation not Found', `getCivicaCardReloadConversation(${id})`, CONVERSATION_NOT_FOUND); })
    );
  }

  /**
   * Sets the samAuthObject currently being used in the conversation
   * @param {String} id conversation id
   * @param {*} samAuthObj 
   */
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
      tap(x => { if (x.result.n < 1) throw (new CustomError('CivicaCardReloadConversation not Found', `getCivicaCardReloadConversation(${id})`, CONVERSATION_NOT_FOUND)); }),
      mapTo(samAuthObj)
    );
  }

  /**
   * Sets the origianl client's card raw data
   * @param {String} id conversation id
   * @param {*} rawData client's card raw data
   */
  static setInitialCardRawData$(id, rawData) {
    const collection = mongoDB.db.collection(CollectionName);
    const updateQuery = [
      { '_id': id },
      {
        '$set': {
          'initialCard.rawData': rawData
        }
      },
      { 'multi': false }
    ];

    return Rx.defer(() => collection.update(...updateQuery)).pipe(
      tap(x => { if (x.result.n < 1) throw (new CustomError('CivicaCardReloadConversation not Found', `getCivicaCardReloadConversation(${id})`, CONVERSATION_NOT_FOUND)); }),
      mapTo(rawData)
    );
  }

  /**
   *  Sets the origianl client's card data
   * @param {String} id conversation id
   * @param {*} civicaData 
   */
  static setInitialCardCivicaData$(id, civicaData) {
    const collection = mongoDB.db.collection(CollectionName);
    const updateQuery = [
      { '_id': id },
      {
        '$set': {
          'initialCard.civicaData': civicaData
        }
      },
      { 'multi': false }
    ];

    return Rx.defer(() => collection.update(...updateQuery)).pipe(
      tap(x => { if (x.result.n < 1) throw (new CustomError('CivicaCardReloadConversation not Found', `getCivicaCardReloadConversation(${id})`, CONVERSATION_NOT_FOUND)); }),
      mapTo(civicaData)
    );
  }

  /**
   * Sets the purchase data for a conversation
   * @param {String} id conversation id
   * @param {Boolean} granted 
   * @param {String} errorMsg 
   * @param {*} receipt 
   */
  static setPurchaseData$(id, granted, errorMsg, receipt) {
    const purchase = {
      granted,
      errorMsg,
      value: receipt.reloadValue,
      receipt
    };
    const updateQuery = [
      { '_id': id },
      {
        '$set': {
          'purchase': purchase
        }
      },
      { 'multi': false }
    ];
    const collection = mongoDB.db.collection(CollectionName);
    return Rx.defer(() => collection.update(...updateQuery)).pipe(
      tap(x => { if (x.result.n < 1) throw (new CustomError('CivicaCardReloadConversation not Found', `getCivicaCardReloadConversation(${id})`, CONVERSATION_NOT_FOUND)); }),
      mapTo(purchase)
    );
  }


  /**
   * Sets the final (after being written) client's card raw data
   * @param {String} id conversation id
   * @param {*} rawData client's card raw data
   */
  static setFinalCardRawData$(id, rawData) {
    const collection = mongoDB.db.collection(CollectionName);
    const updateQuery = [
      { '_id': id },
      {
        '$set': {
          'finalCard.rawData': rawData
        }
      },
      { 'multi': false }
    ];

    return Rx.defer(() => collection.update(...updateQuery)).pipe(
      tap(x => { if (x.result.n < 1) throw (new CustomError('CivicaCardReloadConversation not Found', `getCivicaCardReloadConversation(${id})`, CONVERSATION_NOT_FOUND)); }),
      mapTo(rawData)
    );
  }

  /**
   * Sets the final (after being written) client's card  data.
   * @param {String} id conversation id
   * @param {*} rawData client's card data
   */
  static setFinalCardCivicaData$(id, civicaData) {
    const collection = mongoDB.db.collection(CollectionName);
    const updateQuery = [
      { '_id': id },
      {
        '$set': {
          'finalCard.civicaData': civicaData
        }
      },
      { 'multi': false }
    ];

    return Rx.defer(() => collection.update(...updateQuery)).pipe(
      tap(x => { if (x.result.n < 1) throw (new CustomError('CivicaCardReloadConversation not Found', `getCivicaCardReloadConversation(${id})`, CONVERSATION_NOT_FOUND)); }),
      mapTo(civicaData)
    );
  }


}
/**
 * @returns CivicaCardReloadConversationDA
 */
module.exports = CivicaCardReloadConversationDA 