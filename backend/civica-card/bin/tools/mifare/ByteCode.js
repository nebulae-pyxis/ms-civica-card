'use strict'

const CRDB = 'CRDB';// Command Read Data Block; ARGS: BlNumber(int) BlCount()
const CWDB = 'CWDB';// Command Write Data Block
const CRVB = 'CRVB';// Command Read Value Block
const CWVB = 'CWVB';// Command Write Value Block
const CIVB = 'CIVB';// Command Increment Value Block
const CDVB = 'CDVB';// Command Decrement Value Block
const CASE = 'CASE';// Command Auth Sector

const RRDB = 'RRDB';// Response Read Data Block
const RWDB = 'RWDB';// Response Write Data Block
const RRVB = 'RRVB';// Response Read Value Block
const RWVB = 'RWVB';// Response Write Value Block
const RIVB = 'RIVB';// Response Increment Value Block
const RDVB = 'RDVB';// Response Decrement Value Block
const RASE = 'RASE';// Response Auth Sector


/**
 * Generates a bytecode string using a list of code vs args
 * 
 * @param [ {code : [arg]}] codeArgsList eg. [ {code:'CRDB', args:['1','2','3']}, {code:'CRDB', args:['1','2','3']} ]
 */
const generateByteCode = (codeArgsList) => {
    let bytecode = '';
    let i;
    for (i = 0; i < codeArgsList.length; i++) {
        const { code, args } = codeArgsList[i];
        bytecode += `${i}: ${code} ${args.join(' ')}\n`;
    }
    return bytecode;
}

const codeArgs = (code, args) => {
    return {code,args};
}

module.exports = {
    generateByteCode,
    codeArgs,
    CRDB, CWDB, CRVB, CWVB, CIVB, CDVB, CASE,
    RRDB, RWDB, RRVB, RWVB, RIVB, RDVB, RASE
};