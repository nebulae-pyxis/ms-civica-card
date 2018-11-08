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
  static create$({ id, userJwt, userName, posId, posUser, posTerminal, posLocation, readerType, cardType }) {
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
      initialCard: {

      },
      finalCard: {

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
      tap(x => {if(x.result.nModified < 1) throw(new Error(`CivicaCardReloadConversation(id:${id}) not found`)); })
    );
  }


}
/**
 * @returns CivicaCardReloadConversationDA
 */
module.exports = CivicaCardReloadConversationDA 