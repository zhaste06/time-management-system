
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Create Schema
var userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  employeeID: { type: String, required: true, unique: true},
  firstName: { type: String, required: true},
  lastName: { type: String, required: true},
  phone: String,
  department: { type: String, required: true },
  team: { type: String, required: true },
  jobTitle: { type: String, required: true },
  level: { type: String, required: true },
  picture: String,
  verifyUserToken: String,
  verifyUserExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  workingStatus: { type: String, required: true},
  startDate: {type: String, required: true},
  fullTimePartTime: {type: String, required: true}
});
// Create a model, call 'user' and connect it to userSchema. Export to router and use it in other files
mongoose.model('User', userSchema);

exports.userSchema = userSchema;