# Restlation
- A proxy server to capture & record requests
- A swagger/open-api spec generator off the recorded requests


## Requirements
- `nodejs 6.x.x+`

## Usage
- `serve ./proxy.json`
- `node generator ./gen.json > swagger.yaml`

### Swagger Links
- http://azimi.me/2015/07/16/split-swagger-into-smaller-files.html
- https://apihandyman.io/writing-openapi-swagger-specification-tutorial-part-4-advanced-data-modeling/
- https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#schemaObject

#### Other
If you need to setup certs for node, checkout link
- https://github.com/coolaj86/node-ssl-root-cas

