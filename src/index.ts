process.env['NODE_CONFIG_DIR'] = __dirname + '/configs';

import 'dotenv/config';
import App from './app';
import validateEnv from './utils/validateEnv.util'
import BaseRoute from './routes/base.route'
// import AuthRoute from './routes/auth.route'
// import FilterRoute from './routes/filter.route'
// import IndexRoute from './routes/index.route'
// import MailRoute from './routes/mail.route'
// import NotificationRoute from '@routes/notification.route'

validateEnv()

const app = new App([new BaseRoute()/*, new IndexRoute(), new AuthRoute(), new MailRoute(),
new NotificationRoute(), new FilterRoute()*/])

app.listen()