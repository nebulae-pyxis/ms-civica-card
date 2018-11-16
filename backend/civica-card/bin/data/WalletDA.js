'use strict'

let mongoDB = undefined;
const Rx = require('rxjs');
const CollectionName = "Wallet";
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
   * Finds a Wallet by its buisnessid
   * @param string id 
   */
  static find$(businessId) {
    const collection = mongoDB.db.collection(CollectionName);
    return Rx.defer(() => collection.findOne({ _id: businessId }));
  }


  /**
   * updates wallet status
   * @param {String} businessId 
   * @param {{main,bonus}} pockets 
   * @param {boolean} spendingAllowed 
   */
  static updateWallet$(businessId, pockets, spendingAllowed) {
    const collection = mongoDB.db.collection(CollectionName);
    const updateQuery = [
      { '_id': businessId },
      {
        '$set': {
          pockets,
          spendingAllowed
        }
      },
      { 'multi': false, upsert: true }
    ];

    return Rx.defer(() => collection.update(...updateQuery)).pipe(
      tap(x => { if (x.result.ok !== 1) throw (new Error(`Wallet(id:${id}) updated failed`)); }),
    );
  }


}
/**
 * @returns CivicaCardReloadConversationDA
 */
module.exports = CivicaCardReloadConversationDA 