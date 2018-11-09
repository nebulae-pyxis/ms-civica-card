'use strict'

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
    getSamAuthKeyAndDiversifiedKey
};