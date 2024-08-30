// /src/builders/parameters.builder.ts

export class ParametersBuilder {
  public static addParametersToRoutes(swaggerDoc: any) {
    Object.keys(swaggerDoc.paths).forEach(path => {
      // Vérifie si le chemin contient "/:" pour détecter un paramètre de chemin
      if (path.includes('/:')) {
        const pathParams = path.match(/:([^\/\\*()]+)/g)?.map(param => param.substring(1)); // Extrait tous les noms de paramètres du chemin
  
        // Ajouter chaque paramètre de chemin pour les méthodes GET, PUT, DELETE, PATCH
        ['get', 'put', 'delete', 'patch'].forEach(method => {
          if (swaggerDoc.paths[path][method]) {
            swaggerDoc.paths[path][method].parameters = swaggerDoc.paths[path][method].parameters || [];
            
            pathParams.forEach(paramName => {
              swaggerDoc.paths[path][method].parameters.push({
                name: paramName,
                in: 'path',
                required: true,
                schema: {
                  type: 'string',
                },
                description: `Path parameter '${paramName}' for ${method.toUpperCase()} request`,
              });
            });
          }
        });
  
        // Ajouter toutes les propriétés du body pour les méthodes POST, PUT, PATCH
        ['post', 'put', 'patch'].forEach(method => {
          if (swaggerDoc.paths[path][method]) {
            const properties = swaggerDoc.components.schemas.users.properties; // Assumant que vous avez un schéma 'users'
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
  
            // Pour PUT et PATCH, aucun paramètre n'est required mais un body est requis
            if (method === 'put' || method === 'patch') {
              swaggerDoc.paths[path][method].requestBody.required = true; // Un body est requis
              swaggerDoc.paths[path][method].description = `Provide at least one field to update`;
            }
          }
        });
      }
    });
  
    return swaggerDoc;
  }
}