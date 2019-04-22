var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  bcrypt = require('bcrypt-nodejs'),
  SALT_FACTOR = 5;

// Create Schema
var userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  employeeID: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
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
  workingStatus: { type: String, required: true },
  startDate: { type: String, required: true },
  fullTimePartTime: { type: String, required: true }
});

userSchema.pre('save', function (next) {
  var user = this;

  // Only hash if the password has been changed/modified
  if (!user.isModified('password')) return next();

  // Generate the salt
  bcrypt.genSalt(SALT_FACTOR, function (err, salt) {
    if (err) return next(err);

    // Hash the password with the salt
    bcrypt.hash(user.password, salt, null, function (err, hash) {
      if (err) return next(err);
      
      // Override the plaintext password with the newly hashed password
      user.password = hash;
      next();
    });
  });
});

userSchema.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch){
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

// Create a model, call 'user' and connect it to userSchema. Export to router and use it in other files
module.exports = mongoose.model('User', userSchema);