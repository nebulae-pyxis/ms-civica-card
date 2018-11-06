export const environment =  {
  "production": false,
  "hmr": false,
  "api": {
   "gateway": {
    "graphql": {
     "httpEndPoint": "http://localhost:3000/api/gateway/graphql/http",
     "wsEndPoint": "ws://localhost:3000/api/gateway/graphql/ws",
     "graphiqlEndPoint": "http://localhost:3000/api/gateway/graphiql"
    }
   }
  }
 };
