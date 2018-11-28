import gql from "graphql-tag";

// We use the gql tag to parse our query string into a query document

// FRAGMENTS
export const civicaCardDataFragment = gql`
    fragment civicaCardDataFields on CivicaCardData {
      numeroTarjetaPublico
      identificacionEmpresa
      identificacionEmpleado
      tipoNumeroDocumento
      saldoTarjeta
      saldoTarjetaBk
      numeroTerminal
      formaPagoUsoTransporte
      fechaHoraTransaccion
      rutaUtilizada
      rutaAnterior
      valorPagoUsoTransporte
      secuenciaUsoTrayecto
      _saldoTarjeta
      _saldoCredito
      _saldoConsolidado
      numeroTarjetaDebito
      fechaUltimoDesbloqueoTarjeta
      fechaValidez
      fechaValidezVajeBeneficio
      perfilUsuario
      grupoPerfil
      numeroAcompannantes
      valorPagoSaldoCredito
      limiteUsoDiario
      codigoUltimaRecarga
      VersionMapping
      indicadorTarjetaBloqueada
      fechaHoraRecarga
      numeroSequenciaTransaccion
      pinStatus
      pinUsuario
      cantidadIntentosErroneos
      saldoCreditoBk
      saldoCredito
      saldoBeneficio
    }
  `;

// QUERIES

export const getBusinessByFilterText = gql`
  query getBusinessByFilterText($filterText: String, $limit: Int) {
    getBusinessByFilterText(filterText: $filterText, limit: $limit) {
      _id
      generalInfo{
        name
      }
      state
    }
  }
`;

export const getMyBusiness = gql`
  query myBusiness {
    myBusiness {
      _id
      generalInfo{
        name
      }
      state
    }
  }
`;

export const civicaCardSalesHistory = gql`
  query civicaCardSalesHistory($civicaSaleFilterInput: CivicaSaleFilterInput!, $civicaSalePaginationInput: CivicaSalePaginationInput!) {
    civicaCardSalesHistory(civicaSaleFilterInput: $civicaSaleFilterInput, civicaSalePaginationInput: $civicaSalePaginationInput) {
      _id
      timestamp
      businessId
      value
      receipt {
        id
        timestamp
        reloadValue
        cardInitialValue
        cardFinalValue
        businessId
        posId
        posUserName
        posUserId
        posTerminal        
      }
      initialCard {
        ...civicaCardDataFields
      }
      finalCard {
        ...civicaCardDataFields
      }
      location {
        type
        coordinates
      }
      conversationId
    }
  }
  ${civicaCardDataFragment}
`;

export const civicaCardSalesHistoryAmount = gql`
  query civicaCardSalesHistoryAmount(
    $civicaSaleFilterInput: CivicaSaleFilterInput!
  ) {
    civicaCardSalesHistoryAmount(civicaSaleFilterInput: $civicaSaleFilterInput)
  }
`;

export const civicaCardSalesHistoryById = gql`
  query civicaCardSaleHistory($id: ID!) {
    civicaCardSaleHistory(id: $id) {
      _id
      timestamp
      businessId
      receipt {
        id
        timestamp
        reloadValue
        cardInitialValue
        cardFinalValue
        businessId
        posId
        posUserName
        posUserId
        posTerminal
      }
      initialCard {
        ...civicaCardDataFields
      }
      finalCard {
        ...civicaCardDataFields
      }
      location {
        type
        coordinates
      }
      conversationId
    }
  }
  ${civicaCardDataFragment}
`;
