'use strict'

const Rx = require("rxjs");
const { tap, filter, toArray, concatMap, mergeMap, map } = require('rxjs/operators');
const { SamClusterClient } = require('../../tools/mifare/');
const {
    CRDB, CWDB, CRVB, CWVB, CIVB, CDVB, CASE,
    RRDB, RWDB, RRVB, RWVB, RIVB, RDVB, RASE
} = require('./ByteCode');
const AesCypher = require('../AesCypher');

class BytecodeCompiler {

    /**
     * 
     * @param {SamClusterClient} samClusterClient 
     */
    constructor(samClusterClient) {
        this.samClusterClient = samClusterClient;
    }

    compile$(bytecode, cardType, readerType, ops) {
        switch (cardType) {
            case 'SL3':
                switch (readerType) {
                    case 'BLE_HIGH_LEVEL': return this.compileSl3BleHighLevel$(bytecode, ops);
                    default: throw new Error(`invalid readerType${readerType}`);
                }
            default: throw new Error(`invalid cardType${cardType}`);
        }
    }


    compileSl3BleHighLevel$(bytecode, { conversation, cardSecondStepAuthConfirmation }) {
        const aesCypher = new AesCypher();

        return this.samClusterClient.requestSamSecondStepAuth$(cardSecondStepAuthConfirmation, { transactionId: conversation._id, samId: conversation.currentCardAuth.samId }).pipe(
            mergeMap(samAuthObj => {
                return Rx.from(bytecode.split('\n')).pipe(filter(ln => ln.trim() !== '')).pipe(
                    map(bytecodeLine => ([samAuthObj, bytecodeLine]))
                );
            })
        ).pipe(
            concatMap(([samAuthObj, bytecodeLine]) => this.compileLineSl3BleHighLevel$(bytecodeLine, samAuthObj, aesCypher)),
            toArray()
        );
    }

    compileLineSl3BleHighLevel$(bytecodeLine, samAuthObj, aesCypher) {
        const [order, codeArgs] = bytecodeLine.split(':');
        const [code, ...args] = codeArgs.trim().split(' ');
        switch (code) {
            case CRDB: return this.compileCRDBSl3BleHighLevel$(order, args, samAuthObj, aesCypher);
            default: throw new Error(`invalid bytecode line code(${code}) compileLineSl3BleHighLevel`);
        }
    }

    /**
     * 
     * @param {*} param0 
     * @param {*} samAuthObj 
     * @param {AesCypher} aesCypher 
     */
    compileCRDBSl3BleHighLevel$(order, [blockNumber, blockCount], samAuthObj, aesCypher) {
        return Rx.Observable.create(observer => {
            const readCmd_buff = Buffer.alloc(1, 0x33);
            const readCounter_buff = Buffer.alloc(2, 0);
            readCounter_buff.writeUInt16LE(samAuthObj.readCount, 0);
            const ti_buff = Buffer.from(samAuthObj.ti);
            const blockNumber_buff = Buffer.alloc(2);//Buffer.alloc(1, parseInt(blockNumber));
            blockNumber_buff.writeUInt16LE(parseInt(blockNumber), 0);
            const blockCount_buff = Buffer.alloc(1, parseInt(blockCount));

            const cmacInput_buff = Buffer.concat([readCmd_buff, readCounter_buff, ti_buff, blockNumber_buff, blockCount_buff]);
            const cmac_buff = aesCypher.aesCmac(samAuthObj.keyMac, cmacInput_buff).buffer;
            const cmac_uint8array = new Uint8Array(cmac_buff);

            const oddDataCmac = [];
            for (let i = 0; i < cmac_uint8array.length; i++) {
                if (i % 2 !== 0) {
                    oddDataCmac.push(cmac_uint8array[i]);
                }
            }

            samAuthObj.readCount += 1;
            console.log(`[[[[[[[[[[[[[[${samAuthObj.readCount}]]]]]]]]]]]]]]`);
            const binaryCommand = {
                cmd: Buffer.concat([readCmd_buff, blockNumber_buff, blockCount_buff, Buffer.from(oddDataCmac)]).toString('hex'),
                order,
                resp: '',
                cbc: CRDB,
                rbc: RRDB
            };
            observer.next(binaryCommand);
            observer.complete();
        });
    }



}

module.exports = BytecodeCompiler;