const {
    generateByteCode, codeArgs,
    CRDB, CWDB, CRVB, CWVB, CIVB, CDVB, CALK, CASE,
    RRDB, RWDB, RRVB, RWVB, RIVB, RDVB, RALK, RASE
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
                break;
            case 'SL1':
                switch (dataType) {
                    //case 'PUBLIC': return this.getSl1PublicReadBytecode(bytecode);
                    case 'CIVICA':
                        switch (cardRole) {
                            case 'DEBIT': return this.getSl1CivicaDebitReadBytecode(bytecode);
                            case 'CREDIT': return this.getSl1CivicaCreditReadBytecode(bytecode);
                            default: throw new CustomError(`Invalid card Role`, 'CivicaCardReadWriteFlow.generateReadBytecode', HW_CARD_ROLE_INVALID, `invalid card role: ${cardRole}`);
                        }
                        break;
                    default: throw new CustomError(`Invalid data type`, 'CivicaCardReadWriteFlow.generateReadBytecode', HW_CARD_DATA_TYPE_INVALID, `invalid data type: ${dataType}`);
                }
                break;
            default: throw new CustomError(`Invalid card type`, 'CivicaCardReadWriteFlow.generateReadBytecode', HW_CARD_TYPE_INVALID, `invalid card type: ${cardType}`);
        }
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
                    default: throw new CustomError(`Invalid data type`, 'CivicaCardReadWriteFlow.generateWriteBytecode', HW_CARD_DATA_TYPE_INVALID, `invalid data type: ${dataType}`);
                }
                break;
            case 'SL1':
                switch (dataType) {
                    case 'CIVICA': return this.getSl1CivicaWriteBytecode(conversation.initialCard, mods, bytecode);
                    default: throw new CustomError(`Invalid data type`, 'CivicaCardReadWriteFlow.generateWriteBytecode', HW_CARD_DATA_TYPE_INVALID, `invalid data type: ${dataType}`);
                }
                break;
            default: throw new CustomError(`Invalid card type`, 'CivicaCardReadWriteFlow.generateWriteBytecode', HW_CARD_TYPE_INVALID, `invalid card type: ${cardType}`);
        }
    }

    //#region READ SL3
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
    //#endregion

    //#region READ SL1
    /**
     * predefined bytecode to read the civica data on Civica card the DEBIT role
     */
    static getSl1CivicaDebitReadBytecode(bytecode = '') {
        return generateByteCode([
            codeArgs(CALK, ['PUBLIC']),
            codeArgs(CASE, ['1', 'A']),
            codeArgs(CRDB, ['4', '1']),
            codeArgs(CRDB, ['5', '1']),
            codeArgs(CRDB, ['6', '1']),
            codeArgs(CALK, ['DEBIT']),                        
            codeArgs(CASE, ['2', 'A']),
            codeArgs(CRDB, ['8', '1']),
            codeArgs(CRDB, ['9', '1']),
            codeArgs(CRDB, ['10', '1']),
            codeArgs(CASE, ['3', 'A']),
            codeArgs(CRDB, ['12', '1']),
            codeArgs(CRDB, ['13', '1']),
            codeArgs(CRDB, ['14', '1']),
            codeArgs(CASE, ['4', 'A']),
            codeArgs(CRDB, ['16', '1']),
            codeArgs(CRDB, ['17', '1']),
            codeArgs(CRDB, ['18', '1']),
            codeArgs(CASE, ['6', 'A']),
            codeArgs(CRDB, ['24', '1']),
            codeArgs(CRDB, ['25', '1']),
            codeArgs(CRDB, ['26', '1']),
            codeArgs(CASE, ['7', 'A']),
            codeArgs(CRDB, ['28', '1']),
            codeArgs(CRDB, ['29', '1']),
            codeArgs(CRDB, ['30', '1']),
            codeArgs(CASE, ['8', 'A']),
            codeArgs(CRDB, ['32', '1']),
            codeArgs(CRDB, ['33', '1']),
            codeArgs(CRDB, ['34', '1']),
        ], bytecode);
    }

    /**
     * predefined bytecode to read the civica data on Civica card when using the CREDIT role
     */
    static getSl1CivicaCreditReadBytecode(bytecode = '') {
        const codeArgsList = [
            codeArgs(CALK, ['CREDIT']),
            codeArgs(CASE, ['2', 'B']),
            codeArgs(CRDB, ['8', '1']),
            codeArgs(CRDB, ['9', '1']),
            codeArgs(CRDB, ['10', '1']),
            codeArgs(CASE, ['4', 'B']),
            codeArgs(CRDB, ['16', '1']),
            codeArgs(CRDB, ['17', '1']),
            codeArgs(CRDB, ['19', '1']),
        ];
        return generateByteCode(codeArgsList, bytecode);
    }
    //#endregion

    //#region WRITE SL3
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
    //#endregion

    //#region WRITE SL1
    /**
     * predefined bytecode to wrte the civica data on Civica card
     */
    static getSl1CivicaWriteBytecode({ rawData, civicaData }, mods, bytecode = '') {
        const codeArgsList = [];
        if ((mods.saldoTarjeta !== civicaData.saldoTarjeta) || (mods.saldoTarjetaBk !== civicaData.saldoTarjetaBk)) {
            const saldoTarjetaValueBlockHex = this.formatNumberToValueBlock(mods.saldoTarjeta);            
            codeArgsList.push(codeArgs(CALK, ['CREDIT']));
            codeArgsList.push(codeArgs(CASE, ['2', 'B']));
            codeArgsList.push(codeArgs(CWDB, ['8', '2', saldoTarjetaValueBlockHex, saldoTarjetaValueBlockHex]));
        }
        if ((mods.saldoCredito !== civicaData.saldoCredito) || (mods.saldoCreditoBk !== civicaData.saldoCreditoBk)) {
            const saldoCreditoValueBlockHex = this.formatNumberToValueBlock(mods.saldoCredito);
            codeArgsList.push(codeArgs(CASE, ['4', 'B']));
            codeArgsList.push(codeArgs(CWDB, ['16', '2', saldoCreditoValueBlockHex, saldoCreditoValueBlockHex]));
        }
        return generateByteCode(codeArgsList, bytecode);
    }
    //#endregion

    //#region TOOLS
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
    //#endregion

}

module.exports = CivicaCardReadWriteFlow;