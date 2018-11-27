import gql from 'graphql-tag';

export const startCivicaCardReloadConversation = gql`
  mutation startCivicaCardReloadConversation(
    $id: ID!
    $posId: String!
    $cardUid: String!
    $posUserId: String!
    $posUserName: String!
    $posTerminal: String
    $posLocation: [Float]!
    $readerType: String!
    $cardType: String!
  ) {
    startCivicaCardReloadConversation(
      id: $id
      posId: $posId
      posUserName: $posUserName
      posUserId: $posUserId
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
    $conversationId: String!
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

export const generateCivicaCardReloadWriteAndReadApduCommands = gql`
  mutation generateCivicaCardReloadWriteAndReadApduCommands(
    $conversationId: String!
    $cardAuthConfirmationToken: String
    $dataType: String!
  ) {
    generateCivicaCardReloadWriteAndReadApduCommands(
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
    $conversationId: String!
    $commands: [BinaryCommandInput]!
  ) {
    processCivicaCardReloadReadApduCommandRespones(
      conversationId: $conversationId
      commands: $commands
    ) {
      numeroTarjetaPublico
      _saldoConsolidado
    }
  }
`;

export const processCivicaCardReloadWriteAndReadApduCommandResponses = gql`
  mutation processCivicaCardReloadWriteAndReadApduCommandResponses(
    $conversationId: String!
    $commands: [BinaryCommandInput]!
  ) {
    processCivicaCardReloadWriteAndReadApduCommandResponses(
      conversationId: $conversationId
      commands: $commands
    ) {
      numeroTarjetaPublico
      _saldoConsolidado
    }
  }
`;

export const purchaseCivicaCardReload = gql`
  mutation purchaseCivicaCardReload($conversationId: String!, $value: Int!) {
    purchaseCivicaCardReload(conversationId: $conversationId, value: $value) {
      granted
      errorMsg
      receipt {
        id
        timestamp
        reloadValue
        cardInitialValue
        cardFinalValue
        businesId
        posId
        posUserName
        posUserId
        posTerminal
      }
    }
  }
`;

export const CivicaCardReloadConversation = gql`
  query CivicaCardReloadConversation($id: ID!) {
    CivicaCardReloadConversation(id: $id) {
      id
      timestamp
      userJwt
      userName
      posId
      posTerminal
      posLocation
      readerType
      cardType
      cardUid
      uiState
      uiStateHistory
      purchase{
        receipt{
          id
          timestamp
          reloadValue
          cardInitialValue
          cardFinalValue
          businesId
          posId
          posUserName
          posUserId
          posTerminal
        }
      }
    }
  }
`;

export const setCivicaCardReloadConversationUiState = gql`
  mutation setCivicaCardReloadConversationUiState(
    $conversationId: String!
    $uiState: String!
  ) {
    setCivicaCardReloadConversationUiState(
      conversationId: $conversationId
      uiState: $uiState
    )
  }
`;
