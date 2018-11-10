'use strict'


const Sl3HighLevel = require('./especific-bytecodes-compilers/Sl3HighLevel');

class BytecodeCompiler {

    /**
     * 
     * @param {SamClusterClient} samClusterClient 
     */
    constructor(samClusterClient) {
        this.sl3HighLevel = new Sl3HighLevel(samClusterClient);
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
    getSpecificImplementation(cardType, readerType){
        switch (cardType) {
            case 'SL3':
                switch (readerType) {
                    case 'BLE_HIGH_LEVEL': return this.sl3HighLevel;
                    default: throw new Error(`invalid readerType${readerType}`);
                }
            default: throw new Error(`invalid cardType${cardType}`);
        }
    }


    



}

module.exports = BytecodeCompiler;