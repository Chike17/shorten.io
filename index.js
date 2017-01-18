var app = require('./shortly.js');
var bcrypt = require('bcrypt-nodejs');


var log = function (thing) {
  console.log(thing);
};




app.listen(4568, function() {
  console.log('Shortly is listening on 4568');
});
