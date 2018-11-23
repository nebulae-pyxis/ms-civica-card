'use strict'

const SamClusterClient = require('../../SamClusterClient');
const Rx = require("rxjs");
const { tap, filter, toArray, concatMap, mergeMap, map } = require('rxjs/operators');
const {
    codeArgs, generateByteCode,
    CRDB, CWDB, CRVB, CWVB, CIVB, CDVB, CALK, CASE,
    RRDB, RWDB, RRVB, RWVB, RIVB, RDVB, RALK, RASE
} = require('../ByteCode');
const AesCypher = require('../../../AesCypher');
const CivicaCardReloadConversationDA = require('../../../../data/CivicaCardReloadConversationDA');
const { CustomError,
    DefaultError,
    BUSINESS_NOT_FOUND,
    BUSINESS_NOT_ACTIVE,
    BUSINESS_WALLET_NOT_FOUND,
    BUSINESS_WALLET_SPENDING_FORBIDDEN,
    CONVERSATION_NOT_FOUND,
    CIVICA_CARD_CORRUPTED_DATA,
    CIVICA_CARD_READ_FAILED,
    CIVICA_CARD_WRITE_FAILED,
    CIVICA_CARD_DATA_EXTRACTION_FAILED,
    BYTECODE_COMPILER_ERROR,
    HW_CARD_TYPE_INVALID,
    HW_CARD_ROLE_INVALID,
    HW_CARD_DATA_TYPE_INVALID,
    HW_READER_TYPE_INVALID, } = require('../../../customError');

class Sl1ACR1255 {

    /**
     * 
     * @param {SamClusterClient} samClusterClient 
     */
    constructor(samClusterClient) {
        this.samClusterClient = samClusterClient;
        this.samKeyMap = {
            'CREDIT': { samKey: 71 },
            'DEBIT': { samKey: 72 },
            'OPERATION': { samKey: 73 },
            'RESERV': { samKey: 74 },
            'MAD': { samKey: 75, cardAuthKey: process.env.CARD_AUTH_SL1_MAD },
            'ADM': { samKey: 76, cardAuthKey: process.env.CARD_AUTH_SL1_ADM },
            'PUBLIC': { samKey: 77, cardAuthKey: process.env.CARD_AUTH_SL1_PUBLIC },
        };
    }

    //#region COMPILATION
    compile$(bytecode, { conversation }) {
        return Rx.from(bytecode.split('\n')).pipe(filter(ln => ln.trim() !== '')).pipe(
            concatMap((bytecodeLine) => this.compileLine$(bytecodeLine, conversation._id, conversation.cardUid)),
            toArray()
        );
    }



    compileLine$(bytecodeLine, conversationId, cardUid) {
        const [order, codeArgs] = bytecodeLine.split(':');
        const [code, ...args] = codeArgs.trim().split(' ');
        switch (code) {
            case CALK: return this.compileCALK$(order, conversationId, cardUid, args);
            case CASE: return this.compileCASE$(order, args);
            case CRDB: return this.compileCRDB$(order, args);
            case CWDB: return this.compileCWDB$(order, args);
            default: throw new CustomError(`invalid bytecode line code`, 'Sl1ACR1255.compileLine$', BYTECODE_COMPILER_ERROR, `invalid bytecode line code(${code}) Sl3HighLevel.compileLine`);
        }
    }


    /**
     * Compiles Command Auth Load Key
     * @param {Number} order 
     * @param {String} cardUid 
     * @param {[sectorNumber, cardRole]} args
     */
    compileCALK$(order, conversationId, cardUid, [cardRole]) {
        const authKey$ = this.samKeyMap[cardRole].cardAuthKey !== undefined
            ? Rx.of({ key: Buffer.from(this.samKeyMap[cardRole].cardAuthKey, 'hex') })
            : this.samClusterClient.requestSL1OfflineAuthKey$(conversationId, this.samKeyMap[cardRole].samKey, cardUid);
        return authKey$.pipe(
            map(({ key }) => Buffer.concat([Buffer.from([0xFF, 0x82, 0x00, 0x00, 0x06]), key])),
            map(apdu_buff => ({ cmd: apdu_buff.toString('hex'), order, resp: '', cbc: CALK, rbc: RALK }))
        );
    }

    /**
    * Compiles Command Auth Sector
    * @param {Number} order      
    * @param {[sectorNumber, cardRole]} args
    */
    compileCASE$(order, [sectorNumber, keyType]) {
        const bl = parseInt(sectorNumber) * 4;
        const kt = keyType === 'A' ? 0x60 : 0x61;
        const apdu = Buffer.from([0xFF, 0x86, 0x00, 0x00, 0x05, 0x01, 0x00, bl, kt, 0x00]);


        return Rx.of(apdu).pipe(
            map(apdu_buff => ({ cmd: apdu_buff.toString('hex'), order, resp: '', cbc: CASE, rbc: RASE }))
        );
    }


    /**
     * Compiles Comand Read Data Block
     * @param {number} order 
     * @param { [blockNumber, blockCount]} args 
     */
    compileCRDB$(order, [blockNumber, blockCount]) {
        const bl = parseInt(blockNumber);
        const count = parseInt(blockCount) * 16;
        return Rx.of(Buffer.from([0xFF, 0xB0, 0x00, bl, count])).pipe(
            map(apdu_buff => ({ cmd: apdu_buff.toString('hex'), order, resp: '', cbc: CRDB, rbc: RRDB }))
        );
    }

    /**
     * Compiles Write Data Block
     * @param {number} order 
     * @param { [blockNumber, blockCount]} args 
     */
    compileCWDB$(order, [blockNumber, blockCount, ...blockDataList]) {
        const initBl = parseInt(blockNumber);
        const blCount = parseInt(blockCount);

        return Rx.range(initBl, blCount).pipe(
            map(bl => Buffer.concat([Buffer.from([0xFF, 0xD6, 0x00, bl, 16]), Buffer.from(blockDataList[bl - initBl], 'hex')])),
            map(apdu_buff => ({ cmd: apdu_buff.toString('hex'), order, resp: '', cbc: CWDB, rbc: RWDB }))
        );
    }
    //#endregion

    //#region DE-COMPILATION





    /**
     * Decompiles card responses to bytecode
     * @param {*} binaryCommands 
     */
    decompileResponses$(binaryCommands) {
        binaryCommands.sort((b1, b2) => b1.order - b2.order);
        return Rx.from(binaryCommands).pipe(
            concatMap(binaryCommand => this.decompileResponse$(binaryCommand)),
            toArray(),
            map(codeArgsList => generateByteCode(codeArgsList))
        );
    }

    decompileResponse$(binaryCommand) {
        const respCode = binaryCommand.rbc;
        switch (respCode) {
            case RALK: return this.decompileResponseRALK$(binaryCommand);
            case RASE: return this.decompileResponseRASE$(binaryCommand);
            case RRDB: return this.decompileResponseRRDB$(binaryCommand);
            case RWDB: return this.decompileResponseRWDB$(binaryCommand);
            default: throw new CustomError(`invalid binary command response code`, 'Sl1ACR1255.decompileResponse$', BYTECODE_COMPILER_ERROR, `invalid binary command response code(${code})`);
        }
    }

    decompileResponseRALK$(binaryCommand) {
        return Rx.of(binaryCommand).pipe(
            map(bc => {
                return bc.resp === '9000' ? codeArgs(RALK, ['00', 'OK']) : codeArgs(RALK, ['01', bc.resp]);
            })
        );
    }

    decompileResponseRASE$(binaryCommand) {
        return Rx.of(binaryCommand).pipe(
            map(bc => {
                return bc.resp === '9000' ? codeArgs(RASE, ['00', 'OK']) : codeArgs(RASE, ['01', bc.resp]);
            })
        );
    }

    decompileResponseRRDB$(binaryCommand) {

        return Rx.Observable.create(observer => {
            const resp_buff = Buffer.from(binaryCommand.resp, 'hex');

            let errorCode = '00';
            let errorDesc = 'OK'
            let args = [];
            if (resp_buff[resp_buff.length - 2] !== 0x90 || resp_buff[resp_buff.length - 1] !== 0x00) {
                errorCode = '01';
                errorDesc = binaryCommand.resp;
            } else {
                const data_buff = resp_buff.slice(0, resp_buff.length - 2);
                const executedCommand_buff = Buffer.from(binaryCommand.cmd, 'hex');
                const blockNumber = parseInt(executedCommand_buff.readUInt8(3));
                const blockCount = parseInt( (executedCommand_buff.readUInt8(4)/16));

                args.push(blockNumber);
                args.push(blockCount);
                for (let i = 0; i < blockCount; i++) {
                    args.push(data_buff.slice(i * 16, i * 16 + 16).toString('hex'));
                }
            }
            observer.next(codeArgs(RRDB, [errorCode, errorDesc, ...args]));
            observer.complete();
        });
    }

    decompileResponseRWDB$(binaryCommand) {
        return Rx.Observable.create(observer => {
            const resp_buff = Buffer.from(binaryCommand.resp, 'hex');

            let errorCode = '00';
            let errorDesc = 'OK'
            let args = [];
            if (resp_buff[0] !== 0x90) {
                errorCode = '01';
                errorDesc = binaryCommand.resp;
            } else {
                const executedCommand_buff = Buffer.from(binaryCommand.cmd, 'hex');
                const blockNumber = parseInt(executedCommand_buff.readUInt8(3));
                args.push(blockNumber);
            }
            observer.next(codeArgs(RWDB, [errorCode, errorDesc, ...args]));
            observer.complete();
        });
    }

    //#endregion


}

module.exports = Sl1ACR1255;