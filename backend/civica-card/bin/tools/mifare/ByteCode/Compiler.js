'use strict'

const { CustomError, HW_CARD_TYPE_INVALID, HW_READER_TYPE_INVALID } = require('../../customError');
const Sl3HighLevel = require('./especific-bytecodes-compilers/Sl3HighLevel');
const Sl1ACR1255 = require('./especific-bytecodes-compilers/Sl1ACR1255');

class Compiler {

    /**
     * 
     * @param {SamClusterClient} samClusterClient 
     */
    constructor(samClusterClient) {
        this.sl3HighLevel = new Sl3HighLevel(samClusterClient);
        this.sl1ACR1255 = new Sl1ACR1255(samClusterClient);
    }

    /**
     * Compiles Bytecode to specific Card and Reader commands
     * @param {String} bytecode 
     * @param {*} cardType 
     * @param {*} readerType 
     * @param {*} ops Especial options for an especific card and reader pair
     */
    compile$(bytecode, cardType, readerType, ops) {
        return this.getSpecificImplementation(cardType, readerType).compile$(bytecode, ops);
    }

    /**
     * Decompile commands response into Bytecode
     * @param {Array} binaryCommands binary commands with responses
     * @param {*} cardType 
     * @param {*} readerType 
     * @param {*} ops Especial options for an especific card and reader pair
     */
    decompileResponses$(binaryCommands, cardType, readerType, ops) {
        return this.getSpecificImplementation(cardType, readerType).decompileResponses$(binaryCommands, ops);
    }

    /**
     * Selects and returns especific compiler implementation
     * @param {*} cardType 
     * @param {*} readerType 
     */
    getSpecificImplementation(cardType, readerType) {
        switch (cardType) {
            case 'SL3':
                switch (readerType) {
                    case 'ACR1252': case 'ACR1255': return this.sl3HighLevel;
                    default: throw new CustomError(`Invalid reader type`, 'Compiler.getSpecificImplementation', HW_READER_TYPE_INVALID, `invalid readerType ${readerType}`);
                }
            case 'SL1':
                switch (readerType) {
                    case 'ACR1252': case 'ACR1255': return this.sl1ACR1255;
                    default: throw new CustomError(`Invalid reader type`, 'Compiler.getSpecificImplementation', HW_READER_TYPE_INVALID, `invalid readerType ${readerType}`);
                }
            default: throw new CustomError(`Invalid card type`, 'Compiler.getSpecificImplementation', HW_CARD_TYPE_INVALID, `invalid card type: ${cardType}`);
        }
    }

}

module.exports = Compiler;