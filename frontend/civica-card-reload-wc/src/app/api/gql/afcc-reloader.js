import gql from 'graphql-tag';

export const startCivicaCardReloadConversation = gql`
  mutation startCivicaCardReloadConversation(
    $id: ID!
    $posId: String
    $cardUid: String
    $posUser: String
    $posTerminal: String
    $posLocation: [Float]
    $readerType: String
    $cardType: String
  ) {
    startCivicaCardReloadConversation(
      id: $id
      posId: $posId
      posUser: $posUser
      cardUid: $cardUid
      posTerminal: $posTerminal
      posLocation: $posLocation
      readerType: $readerType
      cardType: $cardType
    ) {
      id
      timestamp
      userJwt
      userName
      posId
      posUser
      posTerminal
      posLocation
      operationState
      readerType
      cardType
    }
  }
`;

export const generateCivicaCardReloadSecondAuthToken = gql`
  mutation generateCivicaCardReloadSecondAuthToken(
    $conversationId: String
    $cardChallenge: String
    $cardRole: String
  ) {
    generateCivicaCardReloadSecondAuthToken(
      conversationId: $conversationId
      cardChallenge: $cardChallenge
      cardRole: $cardRole
    ) {
      conversationId
      token
    }
  }
`;

export const generateCivicaCardReloadReadApduCommands = gql`
  mutation generateCivicaCardReloadReadApduCommands(
    $conversationId: String
    $cardAuthConfirmationToken: String
    $dataType: String
  ) {
    generateCivicaCardReloadReadApduCommands(
      conversationId: $conversationId
      cardAuthConfirmationToken: $cardAuthConfirmationToken
      dataType: $dataType
    ) {
      order
      cmd
      resp
      cbc
      rbc
    }
  }
`;

export const processCivicaCardReloadReadApduCommandRespones = gql`
  mutation processCivicaCardReloadReadApduCommandRespones(
    $conversationId: String
    $commands: [BinaryCommandInput]
  ) {
    processCivicaCardReloadReadApduCommandRespones(
      conversationId: $conversationId
      commands: $commands
    ) {
      identificacionEmpresa
      identificacionEmpleado
      tipoNumeroDocumento
      saldoTarjeta
      saldoTarjetaBk
      numeroTerminal
      formaPagoUsoTransporte
      fechaHoraTransaccion
      rutaUtilizada
      perfilUsuario
      rutaAnterior
      valorPagoUsoTransporte
      secuenciaUsoTrayecto
      _saldoTarjeta
    }
  }
`;
