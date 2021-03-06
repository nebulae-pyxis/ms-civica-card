import gql from "graphql-tag";


export const getWallet = gql`
  query getWallet($businessId: String!) {
    getWallet(businessId: $businessId) {
      _id
      pockets {
        main
        bonus
      }
      spendingState
      businessId
    }
  }
`;

export const walletPocketUpdated = gql`
  subscription walletPocketUpdated($businessId: String!) {
    walletPocketUpdated(businessId: $businessId) {
      _id
      pockets {
        main
        bonus
      }
      spendingState
      businessId
    }
  }
`;

