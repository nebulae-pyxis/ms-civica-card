'use strict'

const Rx = require("rxjs");
const { reduce, map } = require('rxjs/operators');
const { MAX_SALDO_CREDITO } = require('./CivicaCardTools');
const { CustomError, CIVICA_CARD_CORRUPTED_DATA, CIVICA_CARD_DATA_EXTRACTION_FAILED } = require('../../tools/customError');

/**
 * Mapping dictionary
  {
    MAPPING_VERSION : {
        FIELD_NAME : [ FIELD_TYPE, BLOCK, OFFSET, LEN ]
    }
  }

  MAPPING_VERSION:  *=any
  FIELD_TYPE = TEXT | NUMBER | VALUE_BLOCK

 */
const mapping = {
    '*': {
        //SECTOR 01: BL 4,5,6
        'numeroTarjetaPublico': ['NUMBER', 4, 0, 4],
        'identificacionEmpresa': ['NUMBER', 5, 0, 4],
        'identificacionEmpleado': ['TEXT', 5, 4, 12],
        'tipoNumeroDocumento': ['TEXT', 6, 0, 16],

        //SECTOR 02: BL 8,9,10
        'saldoTarjeta': ['VALUE_BLOCK', 8, 0, 16],
        'saldoTarjetaBk': ['VALUE_BLOCK', 9, 0, 16],
        // 'numeroTerminal': ['NUMBER', 10, 0, 2],
        // 'formaPagoUsoTransporte': ['NUMBER', 10, 2, 1],
        // 'fechaHoraTransaccion': ['NUMBER', 10, 3, 4],
        // 'rutaUtilizada': ['NUMBER', 10, 7, 2],
        // 'perfilUsuario': ['NUMBER', 10, 9, 1],
        // 'rutaAnterior': ['NUMBER', 10, 10, 1],
        // 'valorPagoUsoTransporte': ['NUMBER', 10, 11, 4],
        // 'secuenciaUsoTrayecto': ['NUMBER', 10, 15, 1],

        //SECTOR 03: BL 12,13,14
        'numeroTarjetaDebito': ['NUMBER', 12, 0, 4],
        'fechaUltimoDesbloqueoTarjeta': ['NUMBER', 12, 4, 4],
        'fechaValidez': ['NUMBER', 12, 8, 4],
        'fechaValidezVajeBeneficio': ['NUMBER', 12, 12, 4],
        'perfilUsuario': ['NUMBER', 13, 0, 1],
        'grupoPerfil': ['NUMBER', 13, 1, 1],
        'numeroAcompannantes': ['NUMBER', 13, 2, 1],
        'valorPagoSaldoCredito': ['NUMBER', 13, 3, 4],
        'limiteUsoDiario': ['NUMBER', 13, 7, 4],
        'codigoUltimaRecarga': ['NUMBER', 13, 11, 4],
        'VersionMapping': ['NUMBER', 13, 15, 1],
        'indicadorTarjetaBloqueada': ['NUMBER', 14, 0, 1],
        'fechaHoraRecarga': ['NUMBER', 14, 1, 4],
        'numeroSequenciaTransaccion': ['NUMBER', 14, 5, 4],
        'pinStatus': ['NUMBER', 14, 9, 1],
        'pinUsuario': ['NUMBER', 14, 10, 4],
        'cantidadIntentosErroneos': ['NUMBER', 14, 14, 1],

        //SECTOR 04: BL 16,17,18
        'saldoCreditoBk': ['VALUE_BLOCK', 16, 0, 16],
        'saldoCredito': ['VALUE_BLOCK', 17, 0, 16],
        'saldoBeneficio': ['VALUE_BLOCK', 18, 0, 16]

    },
    '1': {},
    '2': {}
};


/**
 * Extracts Civica real data from the card raw (binary) data
 */
class CivicaCardDataExtractor {

    /**
     * Extracts the data from the raw blocks bytes
     * @param {*} mifareCard raw card data
     */
    static extractCivicaData$(mifareCard) {
        return this.extractCommonData$(mifareCard);
    }

    /**
     * Extracts the common data among all mapping versions
     * @param {*} mifareCard raw card data
     */
    static extractCommonData$(mifareCard) {
        return Rx.from(Object.keys(mapping['*'])).pipe(
            reduce((civicaCard, fieldName) => {
                return this.extractField(mifareCard, civicaCard, fieldName, ...mapping['*'][fieldName]);
            }, {}),
            map(civicaCard => {
                if (civicaCard.saldoTarjeta != undefined && civicaCard.saldoTarjetaBk != undefined) {
                    civicaCard._saldoTarjeta = Math.min(civicaCard.saldoTarjeta, civicaCard.saldoTarjetaBk);
                    civicaCard._saldoConsolidado = civicaCard._saldoTarjeta;
                }
                if (civicaCard.saldoCredito != undefined && civicaCard.saldoCreditoBk != undefined) {
                    civicaCard._saldoCredito = MAX_SALDO_CREDITO - Math.min(civicaCard.saldoCredito, civicaCard.saldoCreditoBk);
                    civicaCard._saldoConsolidado -= civicaCard._saldoCredito;
                }
                return civicaCard;
            })
        );
    }


    /**
     * Extracts the data for a specific mapping version
     * @param {*} mifareCard raw card data
     * @param {*} civicaCard partailly filled civica carrd data
     */
    static extractSpecificMappingVersionData$(mifareCard, civicaCard) {
    }


    /**
     * Extracts a specific data field from the card raw data
     * @param {*} mifareCard raw card data
     * @param {*} civicaCard partailly filled civica carrd data
     * @param {*} fieldName data field name
     * @param {*} fieldType data field type
     * @param {*} block raw data block number
     * @param {*} offset raw data block offset 
     * @param {*} len field len
     */
    static extractField(mifareCard, civicaCard, fieldName, fieldType, block, offset, len) {
        if (mifareCard[`${block}`] === undefined) {
            //console.log(`CivicaCardDataExtractor.extractField, block ${block} not found`);
            return civicaCard;
        }
        const blockData = Buffer.from(mifareCard[`${block}`], 'hex');
        switch (fieldType) {
            case 'TEXT':
                civicaCard[fieldName] = blockData.toString('utf8', offset, (offset + len));
                break;
            case 'NUMBER':
                switch (len) {
                    case 1: civicaCard[fieldName] = blockData.readUInt8(offset); break;
                    case 2: civicaCard[fieldName] = blockData.readUInt16BE(offset); break;
                    case 4: civicaCard[fieldName] = blockData.readUInt32BE(offset); break;
                    default: throw new CustomError(`Civica data extraction failed`, 'CivicaCardDataExtractor.extractField', CIVICA_CARD_DATA_EXTRACTION_FAILED, `NUMBER len=${len} not allowed at block ${block} for fieldName ${fieldName}`);
                }
                break;
            case 'VALUE_BLOCK':
                const integrity =
                    ((blockData[3] & 0x80) == 0x80) &&
                    (blockData[12] == blockData[14]) &&
                    (blockData[13] == blockData[15]) &&
                    (Uint8Array.of(~blockData[12])[0] == blockData[13]) &&
                    (Uint8Array.of(~blockData[14])[0] == blockData[15]);
                if (!integrity) {
                    throw new CustomError(`Civica data extraction failed`, 'CivicaCardDataExtractor.extractField', CIVICA_CARD_CORRUPTED_DATA, `VALUE_BLOCK integrity check failed at CivicaCardDataExtractor.extractField field ${fieldName} at block ${block}`);
                }
                const value = blockData.slice(0, 4);
                value[3] = value[3] & 0x7F;
                civicaCard[fieldName] = value.readUInt32LE(0);
                break;
            default: throw new CustomError(`Civica data extraction failed`, 'CivicaCardDataExtractor.extractField', CIVICA_CARD_DATA_EXTRACTION_FAILED, `field ${fieldName} of FieldType=${fieldType} not allowed at CivicaCardDataExtractor.extractField at block ${block}`);
        }
        return civicaCard;
    }





}

module.exports = CivicaCardDataExtractor;