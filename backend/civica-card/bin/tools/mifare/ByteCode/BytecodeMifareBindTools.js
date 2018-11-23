'use strict'


const Rx = require("rxjs");
const { tap, filter, toArray, concatMap, mapTo, map, reduce } = require('rxjs/operators');
const {
    codeArgs, generateByteCode,
    CRDB, CWDB, CRVB, CWVB, CIVB, CDVB, CALK,CASE,
    RRDB, RWDB, RRVB, RWVB, RIVB, RDVB, RALK,RASE
} = require('./ByteCode');
const { CustomError, CIVICA_CARD_READ_FAILED, CIVICA_CARD_WRITE_FAILED, BYTECODE_COMPILER_ERROR,CIVICA_CARD_AUTH_FAILED } = require('../../customError');

class BytecodeMifareBindTools {

    /**
     * Applies a byte code (normally a response bytecode) to the binary representation of a data card
     * @param {String} bytecode 
     * @param {*} mifareCard raw data blocks
     */
    applyBytecodeToMifareCard$(bytecode, mifareCard) {
        return Rx.from(bytecode.split('\n')).pipe(
            filter(ln => ln.trim() !== ''),
            reduce((modifiedMifareCard, bytecodeLine) => {
                return this.applyBytecodeLine(bytecodeLine, modifiedMifareCard);
            }, mifareCard)
        );
    }

    /**
     * Applies a byte line (normally a response bytecode line) to the binary representation of a data card
     * @param {*} bytecodeLine 
     * @param {*} mifareCard 
     */
    applyBytecodeLine(bytecodeLine, mifareCard) {
        const [order, codeArgs] = bytecodeLine.split(':');
        const [code, ...args] = codeArgs.trim().split(' ');
        switch (code) {
            case RALK: return this.applyRALK(order, args, mifareCard);
            case RASE: return this.applyRASE(order, args, mifareCard);
            case RRDB: return this.applyRRDB(order, args, mifareCard);
            case RWDB: return this.applyRWDB(order, args, mifareCard);            
            default: throw new CustomError(`Invalid bytecode line code`, 'BytecodeMifareBindTools.applyBytecodeLine', BYTECODE_COMPILER_ERROR, `Invalid bytecode line code(${code})`);
        }
    }

    /**
     * Applies a Response of ReadDataBlock to the binary raw blocks
     * @param {*} order 
     * @param {*} param1 
     * @param {*} mifareCard 
     */
    applyRRDB(order, [resultCode, resultDesc, block, blockCount, ...blockDataList], mifareCard) {
        if (resultCode !== '00') {
            throw new CustomError(`Read data block failed`, 'BytecodeMifareBindTools.applyRWDB', CIVICA_CARD_READ_FAILED, 'Command Response with ERROR');
            //return mifareCard; //if the idea is to ignore error an keep applying all succesess then comment above and let this line
        }

        const aclBlocks = [0, 3, 7, 11, 15, 19, 23, 27, 31, 35, 39];

        let initBlock = parseInt(block);
        let len = parseInt(blockCount);
        let index = initBlock;
        for (let i = 0; i < len; i++) {
            if (aclBlocks.includes(index)) {
                index++;
            }
            mifareCard[`${index}`] = blockDataList[i];
            index++;
        }
        return mifareCard;
    }

    /**
     * Applies a Response of WriteDataBlock to the binary raw blocks
     * @param {*} order 
     * @param {*} param1 
     * @param {*} mifareCard 
     */
    applyRWDB(order, [resultCode, resultDesc, block, blockCount, ...blockDataList], mifareCard) {
        if (resultCode !== '00') {
            throw new CustomError(`Write data block failed`, 'BytecodeMifareBindTools.applyRWDB', CIVICA_CARD_WRITE_FAILED, 'Command Response with ERROR, original command no executed');
        }
        return mifareCard;
    }

    /**
     * Applies a Response of Auth Load Key
     */
    applyRALK(order, [resultCode, resultDesc], mifareCard) {
        if (resultCode !== '00') {
            throw new CustomError(`Auth load key failed`, 'BytecodeMifareBindTools.applyRALK', CIVICA_CARD_AUTH_FAILED, 'Command Response with ERROR, original command no executed');
        }
        return mifareCard;
    }

    /**
     * Applies a Response of Auth Sector
     */
    applyRASE(order, [resultCode, resultDesc], mifareCard) {
        if (resultCode !== '00') {
            throw new CustomError(`Auth Sector failed`, 'BytecodeMifareBindTools.applyRASE', CIVICA_CARD_AUTH_FAILED, 'Command Response with ERROR, original command no executed');
        }
        return mifareCard;
    }
}

module.exports = BytecodeMifareBindTools;