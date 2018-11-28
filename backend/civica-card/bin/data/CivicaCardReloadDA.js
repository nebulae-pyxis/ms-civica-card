'use strict'

let mongoDB = undefined;
const Rx = require('rxjs');
const { CustomError } = require('../tools/customError');
const { Observable, defer, of } = require('rxjs');
const { map, tap, mapTo } = require('rxjs/operators');
const Crosscutting = require("../tools/Crosscutting");

const COLLECTION_NAME = `CivicaCardReloadHistory_`;

class CivicaCardReloadDA {

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
   * Saves the sale in a Mongo collection. The collection where the transaction 
   * will be stored is determined according to the last four (4) characters of the uuid.
   * since these correspond to the month and year where the info will be persisted.
   * 
   * @param {*} civicaCardReloadData sale to create
   */
  static saveCivicaCardReloadHistory$(civicaCardReloadEvent) {
    console.log('saveCivicaCardReloadHistory => ', civicaCardReloadEvent);
    const civicaCardReload = {
      _id: Crosscutting.generateHistoricalUuid(new Date(civicaCardReloadEvent.timestamp)),
      timestamp: civicaCardReloadEvent.timestamp,
      ...civicaCardReloadEvent.data
    };    

    const monthYear = civicaCardReload._id.substr(civicaCardReload._id.length - 4);
    const collection = mongoDB.db.collection(`${COLLECTION_NAME}${monthYear}`);    
    console.log('****** persist **** ', civicaCardReload);
    return defer(() => collection.insertOne(civicaCardReload));
  }

  /**
   * Gets civica card reload history by id.
   * @param {*} businessId ID of the business to filter
   * @param {*} civicaCardReloadHistoryId ID of the civica card reload history
   */
  static getCivicaCardReloadHistoryById$(businessId, civicaCardReloadHistoryId) {
    const monthYear = civicaCardReloadHistoryId.substr(civicaCardReloadHistoryId.length - 4);
    const collection = mongoDB.db.collection(`${COLLECTION_NAME}${monthYear}`);
    return of({businessId, transactionHistoryId})
    .pipe(
      map(filter => {
        let query = {
          _id: transactionHistoryId
        };
        if(filter.businessId){
          query.businessId = filter.businessId;
        }
        return query;
      }),
      mergeMap(query => defer(() => collection.findOne(query)))
    );
  }

    /**
   * Gets civica reload history by id.
   * @param {*} civicaCardReloadsIds ID of the transaction history
   */
  static getCivicaCardReloadsHistoryByIds$(id, civicaCardReloadsIds, businessId) {
    const monthYear = id.substr(id.length - 4);
    const collection = mongoDB.db.collection(`${COLLECTION_NAME}${monthYear}`);
    return of(civicaCardReloadsIds)
    .pipe(
      map(data => {
        let query = {
          _id: {$in: civicaCardReloadsIds},
          businessId: businessId
        };
        return query;
      }),
      mergeMap(query => defer(() => collection.find(query).limit(10).toArray()))
    );
  }

/**
 * Gets transaction hsitory from a business according to the filters and the pagination.
 * 
 * @param {*} filter Filter data
 * @param {*} filter.businessId ID of the business to filter
 * @param {*} filter.initDate start date range 
 * @param {*} filter.endDate End date range 
 * @param {*} filter.terminal Terminal object
 * @param {*} filter.terminal.id Id of the terminal to filter
 * @param {*} filter.terminal.userId Id of the terminal user to filter
 * @param {*} filter.terminal.username username of the terminal user to filter
 * @param {*} pagination Pagination data
 * @param {*} pagination.page Page of the data to return
 * @param {*} pagination.count Count of records to return
 * @param {*} pagination.sortTimestamp Indicates if the info should be sorted asc or desc according to the timestamp.
 */
  static getCivicaCardReloadsHistory$(filter, pagination) {

    return Observable.create(async observer => {
      const initDateFormat = new Date(filter.initDate);
      const monthYear = Crosscutting.getMonthYear(initDateFormat);
      const collection = mongoDB.db.collection(`${COLLECTION_NAME}${monthYear}`);
      const query = {
        businessId: filter.businessId,
      };

      if(filter.initDate){
        query.timestamp = query.timestamp || {};
        query.timestamp['$gte'] = filter.initDate;
      }

      if(filter.endDate){
        query.timestamp = query.timestamp || {};
        query.timestamp['$lt'] = filter.endDate;
      }

      if(filter.terminal && filter.terminal.id){
        query['receipt.posTerminal'] = filter.terminal.id;
      }

      if(filter.terminal && filter.terminal.userId){
        query['receipt.posUserId'] = filter.terminal.userId;
      }

      if(filter.terminal && filter.terminal.username){
        query['receipt.posUserName'] = filter.terminal.username;
      }

      if(filter.terminal && filter.terminal.posId){
        query['receipt.posId'] = filter.terminal.posId;
      }

      if(filter.user && filter.user){
        query['user'] = filter.user;
      }

      console.log('Query => ', query);

      const cursor = collection.find(query).skip(pagination.count * pagination.page).limit(pagination.count).sort({timestamp: pagination.sort});
      let obj = await this.extractNextFromMongoCursor(cursor);
      while (obj) {
        observer.next(obj);
        obj = await this.extractNextFromMongoCursor(cursor);
      }

      observer.complete();
    });
  }

  /**
 * Gets the amount of transactions history from a business according to the filters.
 * 
 * @param {*} filter Filter data
 * @param {*} filter.businessId ID of the business to filter
 * @param {*} filter.initDate start date range 
 * @param {*} filter.endDate End date range 
 * @param {*} filter.transactionType Transaction type filter
 * @param {*} filter.transactionConcept Transaction concept filter
 * @param {*} filter.terminal Terminal object
 * @param {*} filter.terminal.id Id of the terminal to filter
 * @param {*} filter.terminal.userId Id of the terminal user to filter
 * @param {*} filter.terminal.username username of the terminal user to filter
 */
static getCivicaCardReloadAmount$(filter) {

    const initDateFormat = new Date(filter.initDate);
    const monthYear = Crosscutting.getMonthYear(initDateFormat);
    const collection = mongoDB.db.collection(`${COLLECTION_NAME}${monthYear}`);
    const query = {
      businessId: filter.businessId,
    };

    if(filter.initDate){
      query.timestamp = query.timestamp || {};
      query.timestamp['$gte'] = filter.initDate;
    }

    if(filter.endDate){
      query.timestamp = query.timestamp || {};
      query.timestamp['$lt'] = filter.endDate;
    }

    if(filter.terminal && filter.terminal.id){
      query['receipt.posTerminal'] = filter.terminal.id;
    }

    if(filter.terminal && filter.terminal.userId){
      query['receipt.posUserId'] = filter.terminal.userId;
    }

    if(filter.terminal && filter.terminal.username){
      query['receipt.posUserName'] = filter.terminal.username;
    }

    if(filter.terminal && filter.terminal.pos){
      query['receipt.posId'] = filter.terminal.pos;
    }

    if(filter.user && filter.user){
      query['user'] = filter.user;
    }

    return collection.count(query);
}


  /**
   * Extracts the next value from a mongo cursor if available, returns undefined otherwise
   * @param {*} cursor
   */
  static async extractNextFromMongoCursor(cursor) {
    const hasNext = await cursor.hasNext();
    if (hasNext) {
      const obj = await cursor.next();
      return obj;
    }
    return undefined;
  }

}
/**
 * @returns CivicaCardReloadDA
 */
module.exports = CivicaCardReloadDA;