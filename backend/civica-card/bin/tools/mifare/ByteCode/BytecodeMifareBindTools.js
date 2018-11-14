'use strict'


const Rx = require("rxjs");
const { tap, filter, toArray, concatMap, mapTo, map, reduce } = require('rxjs/operators');
const {
    codeArgs, generateByteCode,
    CRDB, CWDB, CRVB, CWVB, CIVB, CDVB, CASE,
    RRDB, RWDB, RRVB, RWVB, RIVB, RDVB, RASE
} = require('./ByteCode');

class BytecodeMifareBindTools {

    applyBytecodeToMifareCard$(bytecode, mifareCard) {
        return Rx.from(bytecode.split('\n')).pipe(
            filter(ln => ln.trim() !== ''),
            reduce((modifiedMifareCard, bytecodeLine) => {
                return this.applyBytecodeLine(bytecodeLine, modifiedMifareCard);
            }, mifareCard)
        );
    }

    applyBytecodeLine(bytecodeLine, mifareCard) {
        const [order, codeArgs] = bytecodeLine.split(':');
        const [code, ...args] = codeArgs.trim().split(' ');
        switch (code) {
            case RRDB: return this.applyRRDB(order, args, mifareCard);
            case RWDB: return this.applyRWDB(order, args, mifareCard);
            default: throw new Error(`invalid bytecode line code(${code}) BytecodeMifareBindTools.applyBytecodeLine`);
        }
    }

    applyRRDB(order, [resultCode, resultDesc, block, blockCount, ...blockDataList], mifareCard) {
        if (resultCode !== '00') {
            return mifareCard;
        }

        const aclBlocks = [0,3,7,11,15,19,23,27,31,35,39];

        let initBlock = parseInt(block);
        let len = parseInt(blockCount);
        let index = initBlock;
        for (let i = 0; i < len; i++) {
            if(aclBlocks.includes(index)){
                index++;
            }
            mifareCard[`${index}`] = blockDataList[i];
            index++;
        }
        return mifareCard;
    }

    applyRWDB(order, [resultCode, resultDesc, block, blockCount, ...blockDataList], mifareCard) {
        if (resultCode !== '00') {
            throw new Error('Command Response with ERROR, original command no executed');
        }

        const aclBlocks = [0,3,7,11,15,19,23,27,31,35,39];

        let initBlock = parseInt(block);
        let len = parseInt(blockCount);
        let index = initBlock;
        for (let i = 0; i < len; i++) {
            if(aclBlocks.includes(index)){
                index++;
            }
            mifareCard[`${index}`] = blockDataList[i];
            index++;
        }
        return mifareCard;
    }
}

module.exports = BytecodeMifareBindTools;