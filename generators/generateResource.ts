import fs from 'fs/promises';
import path from 'path';

function pascal(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export async function generateResource(name: string) {
  if (!name) throw new Error('Nom de ressource requis. Ex: npm run gen-resource -- orders');
  const modelName = name.replace(/[^a-zA-Z0-9_]/g, '');
  const ClassName = pascal(modelName);
  const routesDir = path.resolve(__dirname, '../src/routes');
  const controllersDir = path.resolve(__dirname, '../src/controllers');
  const servicesDir = path.resolve(__dirname, '../src/services');

  await fs.writeFile(path.join(servicesDir, `${modelName}.service.ts`), `import BaseService from './base.service';\nimport { Model } from 'sequelize';\n\nclass ${ClassName}Service<T extends Model> extends BaseService<T> {}\n\nexport default ${ClassName}Service;\n`);

  await fs.writeFile(path.join(controllersDir, `${modelName}.controller.ts`), `import { Request, Response, NextFunction } from 'express';\nimport ${ClassName}Service from '../services/${modelName}.service';\nimport HttpException from '../exceptions/HttpException';\n\nclass ${ClassName}Controller {\n  private service = new ${ClassName}Service();\n\n  public customAction = async (req: Request, res: Response, next: NextFunction) => {\n    try {\n      res.status(200).json({ datas: '${modelName} custom endpoint ready', params: req.params });\n    } catch (error) {\n      next(error instanceof HttpException ? error : new HttpException(500, 'Internal Server Error'));\n    }\n  };\n}\n\nexport default ${ClassName}Controller;\n`);

  await fs.writeFile(path.join(routesDir, `${modelName}.route.ts`), `import { Router } from 'express';\nimport Route from '../interfaces/routes.interface';\nimport ${ClassName}Controller from '../controllers/${modelName}.controller';\n\nclass ${ClassName}Route implements Route {\n  public path = '/${modelName}';\n  public router = Router();\n  public controller = new ${ClassName}Controller();\n\n  constructor() {\n    this.initializeRoutes();\n  }\n\n  private initializeRoutes() {\n    this.router.get(\`\${this.path}/custom\`, this.controller.customAction);\n  }\n}\n\nexport default ${ClassName}Route;\n`);

  console.log(`Ressource ${ClassName} générée. Le CRUD générique /${modelName} est déjà exposé.`);
}

if (require.main === module) {
  generateResource(process.argv[2]).catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}
