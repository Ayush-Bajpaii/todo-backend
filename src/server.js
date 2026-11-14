// Local development server (not used on Netlify).
const app = require('./app');

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`TaskFlow API running at http://localhost:${port}/api`);
});
