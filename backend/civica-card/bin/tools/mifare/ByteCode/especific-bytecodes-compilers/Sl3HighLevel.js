'use strict'

const Rx = require("rxjs");
const { tap, filter, toArray, concatMap, mergeMap, map } = require('rxjs/operators');
const {
    codeArgs, generateByteCode,
    CRDB, CWDB, CRVB, CWVB, CIVB, CDVB, CASE,
    RRDB, RWDB, RRVB, RWVB, RIVB, RDVB, RASE
} = require('../ByteCode');
const AesCypher = require('../../../AesCypher');
const { SamClusterClient } = require('../../SamClusterClient');
const CivicaCardReloadConversationDA = require('../../../../data/CivicaCardReloadConversationDA');

class Sl3HighLevel {

    constructor(samClusterClient) {
        this.samClusterClient = samClusterClient;
    }

    //#region COMPILATION
    compile$(bytecode, { conversation, cardSecondStepAuthConfirmation }) {
        const aesCypher = new AesCypher();

        return this.samClusterClient.requestSamSecondStepAuth$(cardSecondStepAuthConfirmation, { transactionId: conversation._id, samId: conversation.currentCardAuth.samId }).pipe(
            mergeMap(samAuthObj => CivicaCardReloadConversationDA.setSamAuthObj$(conversation._id, samAuthObj)),
            mergeMap(samAuthObj => {
                return Rx.from(bytecode.split('\n')).pipe(filter(ln => ln.trim() !== '')).pipe(
                    map(bytecodeLine => ([samAuthObj, bytecodeLine]))
                );
            })
        ).pipe(
            concatMap(([samAuthObj, bytecodeLine]) => this.compileLine$(bytecodeLine, samAuthObj, aesCypher)),
            toArray()
        );
    }



    compileLine$(bytecodeLine, samAuthObj, aesCypher) {
        const [order, codeArgs] = bytecodeLine.split(':');
        const [code, ...args] = codeArgs.trim().split(' ');
        switch (code) {
            case CRDB: return this.compileCRDB$(order, args, samAuthObj, aesCypher);
            case CWDB: return this.compileCWDB$(order, args, samAuthObj, aesCypher);
            default: throw new Error(`invalid bytecode line code(${code}) Sl3HighLevel.compileLine`);
        }
    }

    /**
     * 
     * @param {*} param0 
     * @param {*} samAuthObj 
     * @param {AesCypher} aesCypher 
     */
    compileCRDB$(order, [blockNumber, blockCount], samAuthObj, aesCypher) {
        return Rx.Observable.create(observer => {
            const readCmd_buff = Buffer.alloc(1, 0x33);
            const readCounter_buff = Buffer.alloc(2, 0);
            readCounter_buff.writeUInt16LE(samAuthObj.readCount, 0);
            const ti_buff = Buffer.from(samAuthObj.ti);
            const blockNumber_buff = Buffer.alloc(2);//Buffer.alloc(1, parseInt(blockNumber));
            blockNumber_buff.writeUInt16LE(parseInt(blockNumber), 0);
            const blockCount_buff = Buffer.alloc(1, parseInt(blockCount));

            const oddDataCmac = this.calculateOddCmac(samAuthObj, aesCypher, Buffer.concat([readCmd_buff, readCounter_buff, ti_buff, blockNumber_buff, blockCount_buff]));

            samAuthObj.readCount += 1;
            const binaryCommand = {
                cmd: Buffer.concat([readCmd_buff, blockNumber_buff, blockCount_buff, oddDataCmac]).toString('hex'),
                order,
                resp: '',
                cbc: CRDB,
                rbc: RRDB
            };
            observer.next(binaryCommand);
            observer.complete();
        });
    }

    /**
     * 
     * @param {*} param0 
     * @param {*} samAuthObj 
     * @param {AesCypher} aesCypher 
     */
    compileCWDB$(order, [blockNumber, blockCount, ...blockDataList], samAuthObj, aesCypher) {

        return Rx.range(0, blockDataList.length).pipe(
            concatMap(index => Rx.Observable.create(observer => {
                const writeCmd_buff = Buffer.alloc(1, 0xA2);
                const writeCounter_buff = Buffer.alloc(2, 0);
                writeCounter_buff.writeUInt16LE(samAuthObj.writeCount, 0);
                const ti_buff = Buffer.from(samAuthObj.ti);
                const blockNumber_buff = Buffer.alloc(2);//Buffer.alloc(1, parseInt(blockNumber));
                blockNumber_buff.writeUInt16LE(parseInt(blockNumber), 0);
                const blockCount_buff = Buffer.alloc(1, parseInt(blockCount));

                const oddDataCmac = this.calculateOddCmac(samAuthObj, aesCypher, Buffer.concat([writeCmd_buff, writeCounter_buff, ti_buff, blockNumber_buff, blockCount_buff]));

                samAuthObj.readCount += 1;
                const binaryCommand = {
                    cmd: Buffer.concat([writeCmd_buff, blockNumber_buff, blockCount_buff, oddDataCmac]).toString('hex'),
                    order: order + index,
                    resp: '',
                    cbc: CRDB,
                    rbc: RRDB
                };
                observer.next(binaryCommand);
                observer.complete();
            }))
        );



    }
    //#endregion

    //#region DE-COMPILATION


    //#endregion


    /**
     * Decompiles card responses to bytecode
     * @param {*} binaryCommands 
     * @param {*} ops 
     */
    decompileResponses$(binaryCommands, { conversation }) {
        const aesCypher = new AesCypher();
        const samAuthObj = {
            raw: conversation.currentCardAuth.samAuthObj.raw,
            keyEnc: Buffer.from(conversation.currentCardAuth.samAuthObj.keyEnc, "hex"),
            keyMac: Buffer.from(conversation.currentCardAuth.samAuthObj.keyMac, "hex"),
            ti: Buffer.from(conversation.currentCardAuth.samAuthObj.ti, "hex"),
            readCount: conversation.currentCardAuth.samAuthObj.readCount,
            writeCount: conversation.currentCardAuth.samAuthObj.writeCount
        };
        binaryCommands.sort((b1, b2) => b1.order - b2.order);
        return Rx.from(binaryCommands).pipe(
            concatMap(binaryCommand => this.decompileResponse$(binaryCommand, samAuthObj, aesCypher)),
            toArray(),
            map(codeArgsList => generateByteCode(codeArgsList))
        );
    }

    decompileResponse$(binaryCommand, samAuthObj, aesCypher) {
        const respCode = binaryCommand.rbc;
        switch (respCode) {
            case RRDB: return this.decompileResponseRRDB$(binaryCommand, samAuthObj, aesCypher);
            default: throw new Error(`invalid binary command response code(${code}) Sl3HighLevel.decompileResponse`);
        }
    }

    decompileResponseRRDB$(binaryCommand, samAuthObj, aesCypher) {

        return Rx.Observable.create(observer => {
            const resp_buff = Buffer.from(binaryCommand.resp, 'hex');

            let errorCode = '00';
            let errorDesc = 'OK'
            let args = [];
            if (resp_buff[0] !== 0x90) {
                errorCode = '01';
                errorDesc = binaryCommand.resp;
            } else {
                const respLen = binaryCommand.resp.length / 2;
                const actualData_buff = resp_buff.slice(1, respLen - 8);
                const executedCommand_buff = Buffer.from(binaryCommand.cmd, 'hex');
                const blockNumber = executedCommand_buff.readUInt16LE(1);
                const blockCount = executedCommand_buff.readUInt8(3);

                args.push(blockNumber);
                args.push(blockCount);
                for (let i = 0; i < blockCount; i++) {
                    args.push(actualData_buff.slice(i * 16, i * 16 + 16).toString('hex'));
                }

                /* * /
                ////////// compara CMAC generado con el CMAC recibido  /////////
                const actualCmac = resp_buff.slice(respLen - 8);
                const actualCmac_str = actualCmac.toString('hex');
                samAuthObj.readCount += 1;
                const readCounter_buff = Buffer.alloc(2);//Buffer.alloc(1, parseInt(blockNumber));
                readCounter_buff.writeUInt16LE((samAuthObj.readCount), 0);
                const blockNumber_buff = Buffer.alloc(2);//Buffer.alloc(1, parseInt(blockNumber));
                blockNumber_buff.writeUInt16LE(parseInt(blockNumber), 0);

                const cmacInput_buff = Buffer.concat([
                    resp_buff.slice(0, 1),
                    readCounter_buff,
                    samAuthObj.ti,
                    blockNumber_buff,
                    Buffer.alloc(1, blockCount),
                    actualData_buff
                ])
                const expectedCmac = this.calculateOddCmac(
                    samAuthObj, aesCypher, cmacInput_buff
                );
                const x = Buffer.compare(expectedCmac, actualCmac);

                if (cypherAes.bytesTohex(cmacResp) !== cypherAes.bytesTohex(cmacToCompare)) {
                    throw new Error('Invalid cmac resp');
                }
                /* */
            }
            observer.next(codeArgs(RRDB, [errorCode, errorDesc, ...args]));
            observer.complete();
        });
    }


    calculateOddCmac(samAuthObj, aesCypher, cmacInput_buff) {
        const cmac_buff = aesCypher.aesCmac(samAuthObj.keyMac, cmacInput_buff).buffer;
        const cmac_uint8array = new Uint8Array(cmac_buff);
        const oddDataCmac = [];
        for (let i = 0; i < cmac_uint8array.length; i++) {
            if (i % 2 !== 0) {
                oddDataCmac.push(cmac_uint8array[i]);
            }
        }
        return Buffer.from(oddDataCmac);
    }


}

module.exports = Sl3HighLevel;