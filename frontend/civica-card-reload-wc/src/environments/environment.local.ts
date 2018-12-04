export const environment =  {
    "production": false,
    "hmr": false,
    "api": {
     "gateway": {
      "graphql": {
       "httpEndPoint": "http://localhost:4200/api/sales-gateway/graphql/http",
       "wsEndPoint": "ws://localhost:4200/api/sales-gateway/graphql/ws",
        "graphiqlEndPoint": "http://localhost:4200/api/sales-gateway/graphiql",
        "salesHttpEndPoint": "http://localhost:3000/api/sales-gateway/graphql/http",
        "salesWsEndPoint": "ws://localhost:3000/api/sales-gateway/graphql/ws",
        "salesGraphiqlEndPoint": "http://localhost:3000/api/sales-gateway/graphiql"
      }
     }
    }
  };
