import gql from 'graphql-tag';

export const getReadCardSecondAuthToken = gql`
   query getReadCardSecondAuthToken(
    $conversationId: String, $cardUid: String, $challengeKey: String
  ){
    getReadCardSecondAuthToken(conversationId: $conversationId, 
      cardUid: $cardUid, challengeKey: $challengeKey){
     authToken 
    }
  }
`;
