const mongoose = require('mongoose');
const CONNECT_DB = 'mongodb+srv://development:ZgngfKEGdt3o8vk8@clusterdev.p75nl.mogodb.net/voudemoto?retryWrites=true&w=majority';


mongoose
  .connect(CONNECT_DB)
  .then(() => {
    console.log("DB is up!");
  })
  .catch((err) => {
    console.error(err.message);
  });
