'use strict'

/**
 * Max possible amount to set in the SaldoCredito value block
 */
const MAX_SALDO_CREDITO = 16777215;

/**
 * Returns the key and diversified data needed for the SAM based on the card role and card uid
 * @param {String} cardRole 
 * @param {String} cardUid 
 * @param {String} samClusterClient 
 */
const getSamAuthKeyAndDiversifiedKey = (cardRole, cardUid, samClusterClient) => {
    let key;
    let dataDiv;
    switch (cardRole) {
        case 'DEBIT':
            key = samClusterClient.KEY_DEBIT
            dataDiv = cardUid.length === 8 ? `00000000${cardUid}` : cardUid;
            break;
        case 'CREDIT':
            key = samClusterClient.KEY_CREDIT;
            dataDiv = cardUid.length === 8 ? `00000000${cardUid}` : cardUid;
            break;
        case 'PUBLIC':
            key = samClusterClient.KEY_PUBLIC;
            dataDiv = undefined;
            break;
    }

    return { key, dataDiv };
}

module.exports = {
    getSamAuthKeyAndDiversifiedKey,
    MAX_SALDO_CREDITO
};