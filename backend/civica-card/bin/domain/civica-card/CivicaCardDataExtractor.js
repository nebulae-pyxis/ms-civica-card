'use strict'

const Rx = require("rxjs");
const { reduce, map } = require('rxjs/operators');


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
    '2': {},
    '3': {},
    '4': {},
    '5': {},
    '6': {},
    '7': {},
    '8': {},
    '9': {},
    '10': {},
};

class CivicaCardDataExtractor {



    static extractCivicaData$(mifareCard) {
        return this.extractCommonData$(mifareCard);
    }

    static extractCommonData$(mifareCard) {
        return Rx.from(Object.keys(mapping['*'])).pipe(
            reduce((civicaCard, fieldName) => {
                return this.extractFiled(mifareCard, civicaCard, fieldName, ...mapping['*'][fieldName]);
            }, {}),
            map(civicaCard => {
                if (civicaCard.saldoTarjeta != undefined && civicaCard.saldoTarjetaBk != undefined) {
                    civicaCard._saldoTarjeta = Math.min(civicaCard.saldoTarjeta, civicaCard.saldoTarjetaBk);
                }
                return civicaCard;
            })
        );
    }


    static extractSpecificMappingVersionData$(mifareCard, civicaCard) {
    }


    static extractFiled(mifareCard, civicaCard, fieldName, fieldType, block, offset, len) {
        if (mifareCard[`${block}`] === undefined) {
            //console.log(`CivicaCardDataExtractor.extractFiled, block ${block} not found`);
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
                    default: throw new Error(`NUMBER len=${len} not allowed at CivicaCardDataExtractor.extractFiled`);
                }
                break;
            case 'VALUE_BLOCK':
                civicaCard[fieldName] = blockData.readUInt32LE(4); break;
                break;
            default: throw new Error(`FieldType=${fieldType} not allowed at CivicaCardDataExtractor.extractFiled`);
        }
        return civicaCard;
    }





}

module.exports = CivicaCardDataExtractor;