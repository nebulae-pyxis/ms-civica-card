const {
    generateByteCode, codeArgs,
    CRDB, CWDB, CRVB, CWVB, CIVB, CDVB, CASE,
    RRDB, RWDB, RRVB, RWVB, RIVB, RDVB, RASE
} = require('../../tools/mifare/ByteCode/ByteCode');
const { MAX_SALDO_CREDITO } = require('./CivicaCardTools');
const { CustomError, HW_CARD_TYPE_INVALID, HW_CARD_ROLE_INVALID, HW_CARD_DATA_TYPE_INVALID } = require('../../tools/customError');


/**
 * Holds the civica card binary data read and write flow
 */
class CivicaCardReadWriteFlow {


    /**
     * Generates the bytecode to read a civica card
     * @param {string} cardType Mifare SL level. eg: SL3 | SL2
     * @param {string} dataType type of data to read. PUBLIC | CIVICA
     */
    static generateReadBytecode(cardType, dataType, cardRole, bytecode = '') {
        switch (cardType) {
            case 'SL3':
                switch (dataType) {
                    case 'PUBLIC': return this.getSl3PublicReadBytecode(bytecode);
                    case 'CIVICA':
                        switch (cardRole) {
                            case 'DEBIT': return this.getSl3CivicaDebitReadBytecode(bytecode);
                            case 'CREDIT': return this.getSl3CivicaCreditReadBytecode(bytecode);
                            default: throw new CustomError(`Invalid card Role`, 'CivicaCardReadWriteFlow.generateReadBytecode', HW_CARD_ROLE_INVALID, `invalid card role: ${cardRole}`);
                        }
                        break;
                    default: throw new CustomError(`Invalid data type`, 'CivicaCardReadWriteFlow.generateReadBytecode', HW_CARD_DATA_TYPE_INVALID, `invalid data type: ${dataType}`);
                }
            default: throw new CustomError(`Invalid card type`, 'CivicaCardReadWriteFlow.generateReadBytecode', HW_CARD_TYPE_INVALID, `invalid card type: ${cardType}`);
        }
    }

    /**
     * predefined bytecode to read the public sector on Civica card
     */
    static getSl3PublicReadBytecode(bytecode = '') {
        return generateByteCode([
            codeArgs(CRDB, ['4', '3'])
        ], bytecode);
    }
    /**
     * predefined bytecode to read the civica data on Civica card the DEBIT role
     */
    static getSl3CivicaDebitReadBytecode(bytecode = '') {
        return generateByteCode([
            codeArgs(CRDB, ['8', '9']),
            codeArgs(CRDB, ['24', '9']),
        ], bytecode);
    }

    /**
     * predefined bytecode to read the civica data on Civica card when using the CREDIT role
     */
    static getSl3CivicaCreditReadBytecode(bytecode = '') {
        return generateByteCode([
            codeArgs(CRDB, ['8', '3']),
            codeArgs(CRDB, ['16', '3']),
        ], bytecode);
    }




    /**
     * Generates the bytecode to write civica card changes
     * @param {string} cardType Mifare SL level. eg: SL3 | SL2
     * @param {string} dataType type of data to read. PUBLIC | CIVICA
     */
    static generateWriteBytecode(cardType, dataType, conversation, bytecode = '') {

        const purchasedValue = conversation.purchase.value;
        const consolidatedBalance = purchasedValue + conversation.initialCard.civicaData._saldoConsolidado;
        const saldoTarjeta = (consolidatedBalance >= 0) ? consolidatedBalance : 0;
        const saldoCredito = (consolidatedBalance >= 0) ? MAX_SALDO_CREDITO : (MAX_SALDO_CREDITO - consolidatedBalance);

        const mods = {
            saldoTarjeta,
            saldoTarjetaBk: saldoTarjeta,
            saldoCredito,
            saldoCreditoBk: saldoCredito
        };

        switch (cardType) {
            case 'SL3':
                switch (dataType) {
                    case 'CIVICA': return this.getSl3CivicaWriteBytecode(conversation.initialCard, mods, bytecode);
                    //case 'PUBLIC': return this.getSl3PublicWriteBytecode(bytecode);                    
                    default: throw new CustomError(`Invalid data type`, 'CivicaCardReadWriteFlow.generateWriteBytecode', HW_CARD_DATA_TYPE_INVALID, `invalid data type: ${dataType}`);
                }
            default: throw new CustomError(`Invalid card type`, 'CivicaCardReadWriteFlow.generateWriteBytecode', HW_CARD_TYPE_INVALID, `invalid card type: ${cardType}`);
        }
    }

    /**
     * predefined bytecode to wrte the civica data on Civica card
     */
    static getSl3CivicaWriteBytecode({ rawData, civicaData }, mods, bytecode = '') {
        const codeArgsList = [];
        if ((mods.saldoTarjeta !== civicaData.saldoTarjeta) || (mods.saldoTarjetaBk !== civicaData.saldoTarjetaBk)) {
            const saldoTarjetaValueBlockHex = this.formatNumberToValueBlock(mods.saldoTarjeta);
            codeArgsList.push(codeArgs(CWDB, ['8', '2', saldoTarjetaValueBlockHex, saldoTarjetaValueBlockHex]));
        }
        if ((mods.saldoCredito !== civicaData.saldoCredito) || (mods.saldoCreditoBk !== civicaData.saldoCreditoBk)) {
            const saldoCreditoValueBlockHex = this.formatNumberToValueBlock(mods.saldoCredito);
            codeArgsList.push(codeArgs(CWDB, ['16', '2', saldoCreditoValueBlockHex, saldoCreditoValueBlockHex]));
        }
        return generateByteCode(codeArgsList, bytecode);
    }

    static formatNumberToValueBlock(number) {
        const value = Buffer.alloc(4);
        value.writeUInt32LE(number, 0);
        value[3] = 0x80;

        const valueBlock = Buffer.alloc(16);
        valueBlock[0] = value[0];
        valueBlock[1] = value[1];
        valueBlock[2] = value[2];
        valueBlock[3] = value[3];

        valueBlock[4] = Uint8Array.from([~value[0]])[0];
        valueBlock[5] = Uint8Array.from([~value[1]])[0];
        valueBlock[6] = Uint8Array.from([~value[2]])[0];
        valueBlock[7] = Uint8Array.from([~value[3]])[0];

        valueBlock[8] = value[0];
        valueBlock[9] = value[1];
        valueBlock[10] = value[2];
        valueBlock[11] = value[3];

        valueBlock[12] = 0x00;
        valueBlock[13] = 0xFF;
        valueBlock[14] = 0x00;
        valueBlock[15] = 0xFF;

        return valueBlock.toString('hex');
    }


}

module.exports = CivicaCardReadWriteFlow;