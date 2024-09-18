// /src/builders/parameters.builder.ts

export class ParametersBuilder {
  public static addParametersToRoutes(swaggerDoc: any) {
    Object.keys(swaggerDoc.paths).forEach(path => {
      if (path.includes('/:')) {
        const paramNames = path.match(/:([^/]+)/g); // Récupère tous les paramètres du chemin

        if (paramNames) {
          ['get', 'post', 'put', 'patch', 'delete'].forEach(method => {
            if (swaggerDoc.paths[path][method]) {
              swaggerDoc.paths[path][method].parameters = swaggerDoc.paths[path][method].parameters || [];

              // Ajoute les paramètres de chemin
              paramNames.forEach(paramName => {
                const isInteger = paramName.includes("(\\d+)") || paramName.includes("(\d+)");
                const paramNameCleaned = paramName.replace(/(\(\\\\d\+\))+|(\(\\d\+\))+|[/:()*+=]/g, '');

                swaggerDoc.paths[path][method].parameters.push({
                  name: paramNameCleaned,
                  in: 'path',
                  required: true,
                  schema: {
                    type: isInteger ? 'integer' : 'string',
                  },
                  description: `${paramNameCleaned} of the resource to ${method}`,
                });
              });

              // Ajoute des réponses d'erreur standard
              swaggerDoc.paths[path][method].responses = {
                ...swaggerDoc.paths[path][method].responses,
                '400': {
                  description: 'Bad Request',
                  content: {
                    'application/json': {
                      schema: {
                        $ref: '#/components/schemas/ErrorResponse400',
                      },
                    },
                  },
                },
                '401': {
                  description: 'Unauthorized',
                  content: {
                    'application/json': {
                      schema: {
                        $ref: '#/components/schemas/ErrorResponse401',
                      },
                    },
                  },
                },
                '403': {
                  description: 'Forbidden',
                  content: {
                    'application/json': {
                      schema: {
                        $ref: '#/components/schemas/ErrorResponse403',
                      },
                    },
                  },
                },
                '404': {
                  description: 'Not Found',
                  content: {
                    'application/json': {
                      schema: {
                        $ref: '#/components/schemas/ErrorResponse404',
                      },
                    },
                  },
                },
                '409': {
                  description: 'Conflict',
                  content: {
                    'application/json': {
                      schema: {
                        $ref: '#/components/schemas/ErrorResponse409',
                      },
                    },
                  },
                },
                '422': {
                  description: 'Unprocessable Entity',
                  content: {
                    'application/json': {
                      schema: {
                        $ref: '#/components/schemas/ErrorResponse422',
                      },
                    },
                  },
                },
                '500': {
                  description: 'Internal Server Error',
                  content: {
                    'application/json': {
                      schema: {
                        $ref: '#/components/schemas/ErrorResponse500',
                      },
                    },
                  },
                },
                '503': {
                  description: 'Service Unavailable',
                  content: {
                    'application/json': {
                      schema: {
                        $ref: '#/components/schemas/ErrorResponse503',
                      },
                    },
                  },
                },
              };

              // Pour POST, PUT, PATCH, ajoute le body requis
              if (['post', 'put', 'patch'].includes(method)) {
                const properties = swaggerDoc.components.schemas.users.properties;

                swaggerDoc.paths[path][method].requestBody = {
                  required: true,
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties,
                        required: method === 'post' ? Object.keys(properties) : [], // Toutes les propriétés sont required pour POST
                      },
                    },
                  },
                };

                if (method === 'put' || method === 'patch') {
                  swaggerDoc.paths[path][method].requestBody.content['application/json'].schema.required = []; // Aucun champ obligatoire
                  swaggerDoc.paths[path][method].description = `Provide at least one field to update`;
                }
              }
            }
          });
        }

      }
    });

    return swaggerDoc;
  }
}
