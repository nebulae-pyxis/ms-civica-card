const {
    generateByteCode, codeArgs,
    CRDB, CWDB, CRVB, CWVB, CIVB, CDVB, CASE,
    RRDB, RWDB, RRVB, RWVB, RIVB, RDVB, RASE
} = require('./ByteCode');


class CivicaCardReadWriteFlow {


    /**
     * Generates the bytecode to read a civica card
     * @param {string} cardType Mifare SL level. eg: SL3 | SL2
     * @param {string} dataType type of data to read. PUBLIC | CIVICA
     */
    static generateReadBytecode(cardType, dataType) {
        switch (cardType) {
            case 'SL3':
                switch (dataType) {
                    case 'PUBLIC': return this.getSl3PublicReadBytecode();
                    case 'CIVICA': return this.getSl3CivicaReadBytecode();
                    default: throw new Error(`invalid dataType${dataType}`);
                }
            default: throw new Error(`invalid cardType${cardType}`);
        }
    }

    /**
     * predefined bytecode to read the public sector on Civica card
     */
    static getSl3PublicReadBytecode() {
        return generateByteCode([
            codeArgs(CRDB, ['4', '3'])
        ]);
    }
    /**
     * predefined bytecode to read the civica data on Civica card
     */
    static getSl3CivicaReadBytecode() {
        return generateByteCode([
            codeArgs(CRDB, ['8', '9']),
            codeArgs(CRDB, ['24', '12']),
        ]);
    }
}

module.exports = CivicaCardReadWriteFlow;