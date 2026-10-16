// Environnement des tests unitaires : aucune connexion à une base n'est attendue.
// Le port 1 garantit qu'un accès réel à la base échouerait immédiatement.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.UNIT_JWT_SECRET || 'unit-test-jwt-secret';
process.env.SECRET_SESSION = 'unit-test-session-secret';
process.env.DB_USERNAME = 'unit';
process.env.DB_PASSWORD = 'unit';
process.env.DB_PORT = '1';
process.env.DB_SYNC = 'false';
delete process.env.CRUD_BLOCKED_MODELS;
delete process.env.CRUD_ALLOWED_MODELS;
delete process.env.GENERIC_CRUD_AUTH;
