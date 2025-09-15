import express from 'express';
import bodyParser from 'body-parser';
import router from './routes';

const app = express();
app.use(bodyParser.json());

// mount routes
app.use(router);

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`[express] serving on port ${port}`);
});
