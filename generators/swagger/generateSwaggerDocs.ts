import fs from 'fs';
import path from 'path';
import Route from '../../src/interfaces/routes.interface';
import { buildSwaggerDoc } from '../../src/swagger/buildDocs';
import { SwaggerDoc } from '../../src/swagger/swaggerDoc.interface';

/** Même générateur que la doc servie par l'appli (/swagger/api-docs). */
export function generateSwaggerDocs(routes: Route[]): SwaggerDoc {
  return buildSwaggerDoc(routes);
}

/** Écrit docs/api/openapi.json (complet) et docs/api/swagger-<tag>.json (un fichier par modèle/tag). */
export function writeSwaggerDocs(swaggerDoc: SwaggerDoc, outDir = path.resolve(__dirname, '../../docs/api')): void {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'openapi.json'), JSON.stringify(swaggerDoc, null, 2));

  const byTag: Record<string, SwaggerDoc['paths']> = {};
  for (const [p, methods] of Object.entries(swaggerDoc.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      const tag = ((op as { tags?: string[] }).tags || ['default'])[0];
      byTag[tag] = byTag[tag] || {};
      byTag[tag][p] = { ...(byTag[tag][p] || {}), [method]: op };
    }
  }
  for (const [tag, paths] of Object.entries(byTag)) {
    fs.writeFileSync(path.join(outDir, `swagger-${tag}.json`), JSON.stringify({ ...swaggerDoc, paths }, null, 2));
  }
  console.log(`Documentation OpenAPI écrite dans ${outDir}`);
}
