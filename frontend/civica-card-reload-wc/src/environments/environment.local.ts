export const environment =  {
    "production": false,
    "hmr": false,
    "api": {
     "gateway": {
      "graphql": {
       "httpEndPoint": "https://pyxis.nebulae.com.co/api/sales-gateway/graphql/http",
       "wsEndPoint": "wss://pyxis.nebulae.com.co/api/sales-gateway/graphql/ws",
        "graphiqlEndPoint": "https://pyxis.nebulae.com.co/api/sales-gateway/graphiql",
        "salesHttpEndPoint": "http://localhost:3000/api/sales-gateway/graphql/http",
        "salesWsEndPoint": "ws://localhost:3000/api/sales-gateway/graphql/ws",
        "salesGraphiqlEndPoint": "http://localhost:3000/api/sales-gateway/graphiql"
      }
     }
    }
  };
