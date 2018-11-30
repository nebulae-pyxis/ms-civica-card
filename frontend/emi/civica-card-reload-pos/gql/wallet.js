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

export const walletUpdated = gql`
  subscription walletUpdated($businessId: String!) {
    walletUpdated(businessId: $businessId) {
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

