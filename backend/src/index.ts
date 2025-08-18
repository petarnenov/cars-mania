import { env } from './config/env';
import app from './app';

app.listen(env.port, () => {
  console.log(`API listening on :${env.port}`);
});
