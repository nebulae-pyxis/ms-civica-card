'use strict'

let mongoDB = undefined;
const Rx = require('rxjs');
const CollectionName = "Business";
const { tap } = require('rxjs/operators');


class BusinessDA {

  /**
   * set the DA ready for work
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
   * Finds a Business by its buisnessid
   * @param string id 
   */
  static find$(businessId) {
    const collection = mongoDB.db.collection(CollectionName);
    return Rx.defer(() => collection.findOne({ _id: businessId }));
  }


  /**
   * updates business active flag
   * @param {String} businessId 
   * @param {boolean} active 
   */
  static updateBusinessActive$(businessId, active) {
    const collection = mongoDB.db.collection(CollectionName);
    const updateQuery = [
      { '_id': businessId },
      {
        '$set': {
          'active':active
        }
      },
      { 'multi': false, upsert: true }
    ];

    return Rx.defer(() => collection.update(...updateQuery)).pipe(
      tap(x => { if (x.result.ok !== 1) throw (new Error(`Business(id:${id}) updated failed`)); }),
    );
  }

  /**
   * updates business wallet status
   * @param {String} businessId 
   * @param {{main,bonus}} pockets wallet pockets
   * @param {boolean} spendingAllowed wallet spending allowed flag
   */
  static updateBusinessWallet$(businessId, pockets, spendingAllowed) {
    const collection = mongoDB.db.collection(CollectionName);
    const updateQuery = [
      { '_id': businessId },
      {
        '$set': {
          'wallet':{pockets,spendingAllowed}          
        }
      },
      { 'multi': false, upsert: true }
    ];

    return Rx.defer(() => collection.update(...updateQuery)).pipe(
      tap(x => { if (x.result.ok !== 1) throw (new Error(`Business(id:${id}) updated failed`)); }),
    );
  }


}
/**
 * @returns BusinessDA
 */
module.exports = BusinessDA 