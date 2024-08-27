process.env['NODE_CONFIG_DIR'] = __dirname + '/config';

import 'dotenv/config';
import App from './app';
import { validateEnv } from './utils/validateEnv.util'
import BaseRoute from './routes/base.route'
// import AuthRoute from './routes/auth.route'
// import IndexRoute from './routes/index.route'
// import MailRoute from './routes/mail.route'
// import NotificationRoute from './routes/notification.route'

validateEnv()

export const app = new App([new BaseRoute()])

app.listen()