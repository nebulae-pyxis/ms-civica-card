'use strict'
/**
 * Command Read Data Block; ARGS: BlNumber(int) BlCount()
 */
const CRDB = 'CRDB';
/**
 * Command Write Data Block
 */
const CWDB = 'CWDB';
/**
 * Command Read Value Block
 */
const CRVB = 'CRVB';
/**
 * Command Write Value Block
 */
const CWVB = 'CWVB';
/**
 * Command Increment Value Block
 */
const CIVB = 'CIVB';
/**
 * Command Decrement Value Block
 */
const CDVB = 'CDVB';
/**
 * Command Auth Sector
 */
const CASE = 'CASE';
/**
 * Response Read Data Block
 */
const RRDB = 'RRDB';
/**
 * Response Write Data Block
 */
const RWDB = 'RWDB';
/**
 * Response Read Value Block
 */
const RRVB = 'RRVB';
/**
 * Response Write Value Block
 */
const RWVB = 'RWVB';
/**
 * Response Increment Value Block
 */
const RIVB = 'RIVB';
/**
 * Response Decrement Value Block
 */
const RDVB = 'RDVB';
/**
 * Response Auth Sector
 */
const RASE = 'RASE';


/**
 * Generates a bytecode string using a list of code vs args
 * 
 * @param [ {code : [arg]}] codeArgsList eg. [ {code:'CRDB', args:['1','2','3']}, {code:'CRDB', args:['1','2','3']} ]
 */
const generateByteCode = (codeArgsList,  bytecode = '') => {
    const byteCodeIndex = bytecode == '' ? 0 : 1 + Math.max(bytecode.split('\n').filter(l => l !== '').map(l => l.split(':')[0]).map(i => parseInt(i)));
    let i;
    for (i = 0; i < codeArgsList.length; i++) {
        const { code, args } = codeArgsList[i];
        bytecode += `${byteCodeIndex+i}: ${code} ${args.join(' ')}\n`;
    }
    return bytecode;
}

/**
 * generates a Object with both properties: code and arg list
 * @param {*} code 
 * @param {*} args 
 */
const codeArgs = (code, args) => {
    return {code,args};
}

module.exports = {
    generateByteCode,
    codeArgs,
    CRDB, CWDB, CRVB, CWVB, CIVB, CDVB, CASE,
    RRDB, RWDB, RRVB, RWVB, RIVB, RDVB, RASE
};