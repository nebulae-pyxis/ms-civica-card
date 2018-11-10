'use strict'


const Rx = require("rxjs");
const { tap, filter, toArray, concatMap, mapTo, map, last } = require('rxjs/operators');
const {
    codeArgs, generateByteCode,
    CRDB, CWDB, CRVB, CWVB, CIVB, CDVB, CASE,
    RRDB, RWDB, RRVB, RWVB, RIVB, RDVB, RASE
} = require('./ByteCode');

class BytecodeMifareBindTools {

    applyBytecodeToMifareCard$(bytecode, mifareCard) {
        return Rx.from(bytecode.split('\n')).pipe(
            filter(ln => ln.trim() !== ''),
            concatMap(bytecodeLine => this.applyBytecodeLine$(bytecodeLine, mifareCard)),
            last()
        );
    }

    applyBytecodeLine$(bytecodeLine, mifareCard) {
        const [order, codeArgs] = bytecodeLine.split(':');
        const [code, ...args] = codeArgs.trim().split(' ');
        switch (code) {
            case RRDB: return this.applyRRDB$(order, args, mifareCard);
            default: throw new Error(`invalid bytecode line code(${code}) BytecodeMifareBindTools.applyBytecodeLine`);
        }
    }

    applyRRDB$(order, [resultCode, resultDesc, block, blockCount, ...blockDataList], mifareCard) {
        return resultCode !== '00' ? Rx.empty() : Rx.range(block, blockCount).pipe(
            tap(index => mifareCard[`${index}`] = { type: 'byteArray', value: blockDataList[index-block] }),
            mapTo(mifareCard)
        );
    }
}

module.exports = BytecodeMifareBindTools;