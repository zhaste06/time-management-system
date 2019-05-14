var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
// To catch whatever is typed in the form
var bodyParser = require('body-parser');
var session = require('express-session');
var mongoose = require('mongoose');
var multer = require('multer');
var GridFsStorage = require('multer-gridfs-storage');
var Grid = require('gridfs-stream');
var nodemailer = require('nodemailer');
var MongoStore = require('connect-mongo')(session);
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcrypt-nodejs');
var async = require('async');
var crypto = require('crypto');
//var flash = require('express-flash');
var expressValidator = require('express-validator');
var flash = require('connect-flash');
var app = express();

// Load Timesheet and User Model into variables
require('./models/Timesheet');
var Timesheet = mongoose.model('Timesheet');
require('./models/Project');
var Project = mongoose.model('Project');
var User = require('./models/User');

passport.use(new LocalStrategy(function (username, password, done) {
  // Check for the user and match username with name that is passed in
  User.findOne({ username: username }, function (err, user) {
    if (err) return done(err);
    // Null as the error, false is no user, and message
    if (!user) return done(null, false, { message: 'Incorrect username.' });
    // Match password
    user.comparePassword(password, function (err, isMatch) {
      if (isMatch) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Incorrect password.' });
      }
    });
  });
}));

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

// Connect to mongoose. Pass the database (local, MLAB, etc)
// mongoose.connect('mongodb://localhost:27017/db');
mongoose.connect('mongodb://localhost/ObenDB', {
  //useMongoClient: true  // if not, error msg
  useNewUrlParser: true
})
  .then(() => console.log('\n\nMongoDB Connected!!!...'))  // catch
  .catch(err => console.log(err));  // if can't connect, display error

// Middleware
app.set('views', path.join(__dirname, 'views'));

// EJS Middleware
app.set('view engine', 'ejs');

app.use(favicon());
app.use(logger('dev'));

// Body parser middleware -> 3rd party module
// So we can access whatever is submitted and get the form values
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(session({ secret: 'session secret key', resave: true, saveUninitialized: true }));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Static folder. Set public folder
// Joins 2 paths together: Current directory (_dirname) and folder name --> Sets public folder to be the Express static folder 
app.use(express.static(path.join(__dirname, 'public')));

// Connect Flash
app.use(flash());

// Global variables
app.use(function (req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  next();
});

// Express session midleware
app.use(session({
  secret: 'stuff',  // Can be anything we want
  resave: false,
  // resave: true,
  // store: new MongoStore({url:"mongodb://localhost:27017/db"}),
  store: new MongoStore({ url: "mongodb://localhost/ObenDB" }),
  saveUninitialized: true,
  cookie: {
    expires: 600000
  }
}));

// Express Messages Middleware
app.use(require('connect-flash')());
app.use(function (req, res, next) {
  res.locals.messages = require('express-messages')(req, res);
  next();
});

// Store files on Mongodb
// Init gfs
const conn = mongoose.createConnection('mongodb://localhost/ObenDB');
let gfs;
conn.once('open', () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
})
var filename = '';
const storage = new GridFsStorage({
  url: 'mongodb://localhost/ObenDB',
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });

// ROUTES
// Index Route. Get request, the home URL.
app.get('/', (req, res) => {
  const title = 'Test Tile';
  // res.send('INDEX');
  res.render('index', {
    user: req.user
  });
});
app.post('/', function (req, res, next) {
  passport.authenticate('local', function (err, user, info) {
    //let errors = [];
    if (err) return next(err)
    if (!user) {
      req.flash('error_msg', 'Please enter a valid user');
      //return res.redirect('/error')
      return res.redirect('/')
    } else if (user.verifyUserToken !== undefined) {
      return res.redirect('/')
      // return res.redirect('/error')
    }
    req.logIn(user, function (err) {
      if (err) return next(err);
      req.session.username = user.employeeID;
      return res.redirect('/dashboard/' + user.employeeID);
    });
  })(req, res, next);
});
// *******************************************************************

//app.use('/logout', loginOutRT); // if it goes to /jobs, call jobs from LOAD ROUTES
app.get('/logout', function (req, res) {
  req.logout();
  req.flash('success_msg', 'You are logged out');
  res.redirect('/');
});

// *******************************************************************

// EDIT PROJECTS
app.get('/editproject/:employeeID', function (req, res) {



  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {

      return res.redirect('/error');
    } else if (user.level != 2 && user.level != 0) {
      return res.redirect('/error');
    }

    if (user.level == 2) {
      Project.findOne({ projectID: req.query.projectID }, function (err, project) {
        if (project != null) {
          User.find({ team: user.team, level: "3" }, function (err, allUser) {
            if (allUser != null) {
              res.render('editproject', {
                user: req.user,
                project,
                allUser
              });
  
  
            }
          });
        }
      });
  
    } else if (user.level == 0) {
      Project.findOne({ projectID: req.query.projectID }, function (err, project) {
        if (project != null) {
          User.find({ level: "3" }, function (err, allUser) {
            User.find({ level: "2" }, function (err, allTeamLead) {
            if (allUser != null) {
              res.render('editproject', {
                user: req.user,
                project,
                allUser,
                allTeamLead
              });
  
  
            }
          });
          });
        }
      });
  
    }

    

  });

});

app.post('/editproject/:employeeID', function (req, res) {

  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {
      return res.redirect('/error');
    } if(user.level == 0) {
      var teamLeadArray = req.body.teamLead.split(":");

      Project.findOne({ projectID: req.query.projectID }, function (err, project) {
        if (!project) {
          return res.redirect('/error');
        }
    
          project.projectName = req.body.projectName,
          project.status = req.body.status,
          project.employeeID = req.body.teamLead +',' + req.body.team_members
          project.teamLead =  teamLeadArray[0]
          
    
        project.save(function (err) {
          req.flash('success_msg', 'The project has been updated');
          return res.redirect('/project/' + req.params.employeeID);
        });
      });
    } else if (user.level == 2) {
     

      Project.findOne({ projectID: req.query.projectID }, function (err, project) {
        if (!project) {
          return res.redirect('/error');
        }
    
          project.projectName = req.body.projectName,
          project.status = req.body.status,
          project.employeeID = user.employeeID + ':' + user.firstName + ':' + user.lastName + ',' + req.body.team_members 
          
    
        project.save(function (err) {
          req.flash('success_msg', 'The project has been updated');
          return res.redirect('/project/' + req.params.employeeID);
        });
      });
    }
    
  });



 





});

// *******************************************************************



// *******************************************************************
app.get('/error', function (req, res) {
  res.render('error');
});

// *******************************************************************
app.get('/newpassword/:employeeID', function (req, res) {
  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {
      return res.redirect('/error');
    } else if (user.employeeID != req.user.employeeID) {
      return res.redirect('/error');
    }
    res.render('passwordchange', {
      user: req.user
    });
  });
});

// *******************************************************************
// TEAM LEADER APPROVES TIMESHEETS
app.get('/approval/:employeeID', function (req, res) {

  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {

      return res.redirect('/error');
    } else if (user.level == 2) {
      Timesheet.find({ teamLead: req.params.employeeID, status: "Pending", level: "3", employeeID: { $not: { $eq: req.params.employeeID } } }, function (err, allTimesheets) {
        if (allTimesheets != null) {
          res.render('approval', {
            user: req.user,
            allTimesheets
          });
        }
      });
    } else if (user.level == 1) {
      Timesheet.find({ level: "2", status: "Pending", employeeID: { $not: { $eq: req.params.employeeID } } }, function (err, allTimesheets) {
        if (allTimesheets != null) {
          res.render('approval', {
            user: req.user,
            allTimesheets
          });
        }
      });
    } else if (user.level == 0) {
      Timesheet.find({ level: "1", status: "Pending", employeeID: { $not: { $eq: req.params.employeeID } } }, function (err, allTimesheets) {
        if (allTimesheets != null) {
          res.render('approval', {
            user: req.user,
            allTimesheets
          });
        }
      });
    } else {
      return res.redirect('/error');
    }

  });
});

app.post('/approval/:employeeID', function (req, res) {

  Timesheet.findOne({ timesheetID: req.body.timesheetID }, function (err, timesheet) {

    timesheet.status = "Approved";

    timesheet.save(function (err) {
      req.flash('success_msg', 'You have approved a Timesheet');
      res.redirect('/approval/' + req.params.employeeID);
    });
  });
});

// *******************************************************************


// *******************************************************************
// ASSIGN PROJECTS TO TEAM MEMBERS
app.get('/closedproject/:employeeID', function (req, res) {

  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {

      return res.redirect('/error');
    } else if (user.level != 2 && user.level != 0) {
      return res.redirect('/error');
    }

    Project.find({ status: "Closed" }, function (err, projects) {
      res.render('closedproject', {
        user: req.user,
        projects
      });
    });
  });
});

app.post('/closedproject/:employeeID', function (req, res) {
});

// *******************************************************************
// *******************************************************************

// ASSIGN PROJECTS TO TEAM MEMBERS
app.get('/project/:employeeID', function (req, res) {

  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {
      return res.redirect('/error');
    } else if (user.level != 2 && user.level != 0) {
      return res.redirect('/error');
    }
    if (user.level == 2) {
      User.find({ department: user.department, level: "3" }, function (err, allUser) {
        if (allUser != null) {

          Project.find({ status: 'Open' }, function (err, projects) {
            res.render('project', {
              user: req.user,
              allUser,
              projects
            });
          });
          /*
                 Project.aggregate([
                  { $lookup:
                    {
                      from: 'users',
                      localField: 'employeeID',
                      foreignField: 'employeeID',
                      as: 'orderdetails'
                    }
                  }
                 ], function(err, projects) {
          
                 console.log(JSON.stringify(projects) + "WHATTT");
                  res.render('project', {
                    user: req.user,
                    allUser,
                    projects
                });
               
                  
                });
          
                */
        }
      });
    };
    if (user.level == 0) {
      User.find({}, function (err, allUser) {
        if (allUser != null) {
          User.find({ level: "2" }, function (err, allLeaders) {
            Project.find({ status: 'Open' }, function (err, projects) {
              res.render('project', {
                user: req.user,
                allUser,
                projects,
                allLeaders
              });
            });
          });
        };
      });
    };
  });
});

app.post('/project/:employeeID', function (req, res) {

  function makeProjectID(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < length; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
  }

  if (req.user.level == 0) {
    User.findOne({ employeeID: req.body.team_leaders }, function (err, leader) {

      var leadersTeam = leader.team;
      var leadersID = leader.employeeID;
      var leadersFirst = leader.firstName;
      var leadersLast = leader.lastName;
      var leadersDetails = leadersID + ":" + leadersFirst + ":" + leadersLast + ":";

      var project = new Project({
        projectID: makeProjectID(10),
        employeeID: leadersDetails + req.body.team_members,
        status: req.body.status,
        projectName: req.body.project_name,
        teamLead: req.body.team_leaders,
        team: leadersTeam
      });

      project.save(function (err) {
        req.flash('success_msg', 'You created a Project');
        res.redirect('/project/' + req.params.employeeID);
      });
    });
  }
  else {
    var project = new Project({
      projectID: makeProjectID(10),
      employeeID: req.body.team_members,
      status: req.body.status,
      projectName: req.body.project_name,
      teamLead: req.params.employeeID,
      team: req.body.team
    });

    project.save(function (err) {
      res.redirect('/project/' + req.params.employeeID);
    });
  };
});

app.post('/genMembers', function (req, res) {
  var name = req.body.name;
  console.log(name);
  User.findOne({ employeeID: name }, function (err, leader) {
    User.find({ team: leader.team, level: "3" }, function (err, teamMembers) {
      res.send(teamMembers);
    })
  })


});

// *******************************************************************

// *******************************************************************
// PASSWORD CHANGE
app.get('/passwordchange/:employeeID', function (req, res) {
  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {
      return res.redirect('/error');
    } else if (user.employeeID != req.user.employeeID) {
      return res.redirect('/error');
    }
    res.render('passwordchange', {
      user: req.user
    });
  });
});

app.post('/passwordchange/:employeeID', function (req, res, next) {
  passport.authenticate('local', function (err, user, info) {
    if (err) return next(err)
    if (!user) {
      return res.redirect('/login');
    }
  });

  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {
      req.flash('error_msg', 'User Not Found.');
      return res.redirect('/login');
    } else if (user.employeeID != req.user.employeeID) {
      req.flash('error_msg', 'Invalid Form Submission.');
      return res.redirect('/login');
    }
    user.comparePassword(req.body.password, function(err, isMatch){
      if(isMatch){
        if (req.body.newPassword != req.body.reNewPassword) {
          req.flash('error_msg', 'Re-enter Password does Not match.');
          return res.redirect('/passwordchange/' + req.params.employeeID);
        }
        else {
          user.password = req.body.newPassword;
          user.save(function (err) {
            req.flash('success_msg', 'You have updated your password');
            return res.redirect('/profile/' + user.employeeID);
          });
        }
      }
      else {
        req.flash('error_msg', 'Current Password is incorrect.');
        return res.redirect('/passwordchange/' + req.params.employeeID);
      }
    })
  });
});

// *********************************************************************
// ADMIN CREATION
app.get('/admincreate', function (req, res, next) {
  res.render('admincreate');
});
app.post('/admincreate', function (req, res, next) {

  if (req.body.adminPassword != req.body.reAdminPassword) {
    req.flash('error_msg', 'Re-enter Password does Not match.');
    return res.redirect('/admincreate');
  } else {
    // Create a new admin user
    var user = new User({
      username: req.body.username,
      password: req.body.adminPassword,
      employeeID: req.body.adminID,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      department: 'ADMIN',
      jobTitle: 'ADMIN',
      level: '0',
      workingStatus: 'ADMIN',
      startDate: '----',
      team: 'ADMIN',
      fullTimePartTime: 'ADMIN'
    });

    // Save admin to database
    user.save(function (err) {
      if (err) throw err;
      return res.redirect('/');
    });
  }
});

// *******************************************************************
app.get('/employee/:employeeID', function (req, res) {
  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {

      return res.redirect('/error');
    } else if (user.level == 3) {
      return res.redirect('/error');
    }else if (user.level == 2) {
      return res.redirect('/error');
    }else if (user.level == 1) {
      return res.redirect('/error');
    }

    //Query & Sorting for Users
    if (Object.keys(req.query).length !== 0) {
      for (const key in req.query) {
        if (req.query[key] == 'asc') {
          User.find({ fullTimePartTime: { $not: { $eq: "Contractor" } } }).sort({ [key]: 1 }).exec(function (err, allUser) {
            User.find({ fullTimePartTime: "Contractor" }).sort({ [key]: 1 }).exec(function (err, allContractors) {

              res.render('employee', {
                user: req.user,
                allUser,
                allContractors
              });
            });
          });

        }
        else if (req.query[key] == 'des') {
          User.find({ fullTimePartTime: { $not: { $eq: "Contractor" } } }).sort({ [key]: -1 }).exec(function (err, allUser) {
            User.find({ fullTimePartTime: "Contractor" }).sort({ [key]: -1 }).exec(function (err, allContractors) {
              res.render('employee', {
                user: req.user,
                allUser,
                allContractors
              });
            });
          });
        }
      }
    }
    else {
      User.find({ fullTimePartTime: { $not: { $eq: "Contractor" } } }, function (err, allUser) {
        User.find({ fullTimePartTime: "Contractor" }, function (err, allContractors) {
          res.render('employee', {
            user: req.user,
            allUser,
            allContractors
          });
        });
      });
    }
  });
});

// *******************************************************************

// *******************************************************************
app.get('/contractor/:employeeID', function (req, res) {
  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {

      return res.redirect('/error');
    } else if (user.level == 3) {
      return res.redirect('/error');
    }

    //Query & Sorting for Users
    if (Object.keys(req.query).length !== 0) {
      for (const key in req.query) {
        if (req.query[key] == 'asc') {
          User.find({ fullTimePartTime: { $not: { $eq: "Contractor" } } }).sort({ [key]: 1 }).exec(function (err, allUser) {
            User.find({ fullTimePartTime: "Contractor" }).sort({ [key]: 1 }).exec(function (err, allContractors) {

              res.render('contractor', {
                user: req.user,
                allUser,
                allContractors
              });
            });
          });

        }
        else if (req.query[key] == 'des') {
          User.find({ fullTimePartTime: { $not: { $eq: "Contractor" } } }).sort({ [key]: -1 }).exec(function (err, allUser) {
            User.find({ fullTimePartTime: "Contractor" }).sort({ [key]: -1 }).exec(function (err, allContractors) {
              res.render('contractor', {
                user: req.user,
                allUser,
                allContractors
              });
            });
          });
        }
      }
    }
    else {
      User.find({ fullTimePartTime: { $not: { $eq: "Contractor" } } }, function (err, allUser) {
        User.find({ fullTimePartTime: "Contractor" }, function (err, allContractors) {
          res.render('contractor', {
            user: req.user,
            allUser,
            allContractors
          });
        });
      });
    }
  });
});

// *******************************************************************




// *******************************************************************
app.get('/viewemployee/:employeeID', function (req, res) {
  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {

      return res.redirect('/error');
    } else if (user.level == 3 || user.level == 2) {
      return res.redirect('/error');
    }

    if (Object.keys(req.query).length !== 0) {
      for (const key in req.query) {
        if (req.query[key] == 'asc') {
        
            User.find({}).sort({ [key]: 1 }).exec(function (err, allUser) {

              res.render('viewemployee', {
                user: req.user,
                allUser
              });
            });
         

        }
        else if (req.query[key] == 'des') {
  
            User.find({}).sort({ [key]: -1 }).exec(function (err, allUser) {
              res.render('viewemployee', {
                user: req.user,
                allUser
              });
            });
  
        }
      }
    }
    else {
      User.find({}, function (err, allUser) {
        if (allUser != null) {
          res.render('viewemployee', {
            user: req.user,
            allUser
          });
        }
      });
    }

  });
});

// *******************************************************************



// *******************************************************************
app.get('/team/:employeeID', function (req, res) {
  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {

      return res.redirect('/error');
    } else if (user.level == 3) {
      return res.redirect('/error');
    }

    User.find({}, function (err, allUser) {
      if (allUser != null) {
        res.render('team', {
          user: req.user,
          allUser
        });
      }
    });
  });
});

// *******************************************************************

app.get('/profile/:employeeID', function (req, res) {
  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {
      return res.redirect('/error');
    } else if (user.employeeID != req.user.employeeID) {
      return res.redirect('/error');
    }
    res.render('profile', {
      user: req.user
    });
  });
});

app.post('/profile/:employeeID', function (req, res) {
  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {
      return res.redirect('/error');
    } else if (user.employeeID != req.user.employeeID) {
      return res.redirect('/error');
    }
    user.phone = req.body.phone;
    user.address = req.body.address;
    user.contactName = req.body.contactName;
    user.contactPhone = req.body.contactPhone;
    user.save(function (err) {


      req.flash('success_msg', 'Profile updated');
      return res.redirect('/profile/' + user.employeeID);
    });
  });
});



// *******************************************************************
// DELETE THE USER
app.get('/deleteuser/:employeeID', function (req, res) {

  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {
      return res.redirect('/error');
    } else if (user.level != 0) {
      return res.redirect('/error');
    }

    User.deleteOne({ employeeID: req.query.userID }, function (err, editUser) {
      if (!user) {
        return res.redirect('/error');
      } else if (user.level != 0) {
        return res.redirect('/error');
      }

      req.flash('success_msg', 'A user has been deleted');
      // req.flash('success_msg', 'User: ' + user.firstName + ' ' + user.lastName + '  has been deleted');
      return res.redirect('/employee/' + req.params.employeeID);

    });
  });
});


// *******************************************************************

// DELETE THE project
app.get('/deleteproject/:employeeID', function (req, res) {

  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {
      return res.redirect('/error');
    } else if (user.level != 2 && user.level != 0) {
      return res.redirect('/error');
    }

    Project.deleteOne({ projectID: req.query.projectID }, function (err, project) {
      if (!project) {
        return res.redirect('/error');
      }
      req.flash('success_msg', 'Project has been deleted');
      return res.redirect('/project/' + req.params.employeeID);

    });
  });
});


// *******************************************************************



// *******************************************************************
// EDIT THE USER
app.get('/edituser/:employeeID', function (req, res) {

  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {
      return res.redirect('/error');
    } else if (user.level != 0) {
      return res.redirect('/error');
    }

    User.findOne({ employeeID: req.query.userID }, function (err, editUser) {
      if (!user) {
        return res.redirect('/error');
      } else if (user.level != 0) {
        return res.redirect('/error');
      }
      res.render('edituser', {
        user: req.user,
        editUser
      });
    });
  });
});

app.post('/edituser/:employeeID', function (req, res, next) {

  User.findOne({ employeeID: req.query.userID }, function (err, user) {
    if (!user) {
      return res.redirect('/error');
    }
    user.username = req.body.username,
      user.employeeID = req.body.employeeID,
      user.firstName = req.body.firstName,
      user.lastName = req.body.lastName,
      user.department = req.body.department,
      user.jobTitle = req.body.jobTitle,
      user.level = req.body.level,
      user.workingStatus = req.body.workingStatus,
      user.startDate = req.body.startDate,
      user.team = req.body.team,
      user.fullTimePartTime = req.body.fullTimePartTime

    user.save(function (err) {
      req.flash('success_msg', 'User: ' + user.firstName + ' ' + user.lastName + '  has been updated');
      return res.redirect('/employee/' + req.params.employeeID);
    });
  });
});

// *******************************************************************
// ADD NEW USER
app.get('/user/:employeeID', function (req, res) {
  res.render('user', {
    user: req.user
  });
});

app.post('/user/:employeeID', function (req, res, next) {
  var user = new User({
    username: req.body.username,
    password: "1233",
    employeeID: req.body.employeeID,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    department: req.body.department,
    jobTitle: req.body.jobTitle,
    level: req.body.level,
    workingStatus: req.body.workingStatus,
    startDate: req.body.startDate,
    team: req.body.team,
    fullTimePartTime: req.body.fullTimePartTime
  });

  user.save(function (err) {
    async.waterfall([
      function (done) {
        crypto.randomBytes(20, function (err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function (token, done) {

        user.verifyUserToken = token;
        user.verifyUserExpires = Date.now() + 3600000; // 1 hour

        user.save(function (err) {
          done(err, token, user);
        });
      },
      function (token, user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: '5bitsoftwareteam@gmail.com',
            pass: 'cppcispn1!!2'
          }
        });
        var mailOptions = {
          to: user.username,
          from: '5bitsoftwareteam@gmail.com',
          subject: 'Login Instrusction for your Time Managment Account',
          text: 'You are receiving this because your account has been created.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'http://' + req.headers.host + '/validate/' + token + '\n\n' +
            'If you did not request this, please ignore this email.\n'
        };
        smtpTransport.sendMail(mailOptions, function (err) {
          req.flash('info', 'An e-mail has been sent to ' + user.username + ' with further instructions.');
          done(err, 'done');
        });
      }
    ], function (err) {
      if (err) return next(err);
      res.redirect('/employee/' + req.params.employeeID);
    });
    req.flash('success_msg', 'An e-mail has been sent to ' + user.username + ' with further instructions.');
    res.redirect('/employee/' + req.params.employeeID);
  });
});

// *******************************************************************
// ADD NEW TIMESHEET
app.get('/timesheet/:employeeID', function (req, res) {
  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {
      return res.redirect('/error');
    } else if (user.employeeID != req.user.employeeID) {
      return res.redirect('/error');
    }
    var allmyproject = [];
    var allmyprojectID = [];
    var teamLead;

    Project.find({ team: user.team, status: 'Open' }, function (err, allOpenedProject) {
      if (allOpenedProject != null) {

        for (var i = 0; i < allOpenedProject.length; i++) {
          var myProject = allOpenedProject[i].employeeID;
          var projectArray = myProject.split(",");
          for (j = 0; j < projectArray.length; j++) {
            var projectArraywithID = projectArray[j].split(":");

            for (k = 0; k < projectArraywithID.length; k += 3) {
              console.log(projectArraywithID[k]);
              if (projectArraywithID[k] == user.employeeID) {

                allmyproject.push(allOpenedProject[i].projectName);

                allmyprojectID.push(allOpenedProject[i].projectID);
                teamLead = allOpenedProject[i].teamLead;
              }
            }
          }
        }
        res.render('timesheet', {
          user: req.user,
          allmyproject,
          allmyprojectID,
          teamLead
        });

      } else {
        allmyproject.push("No Assigned Project(s)");
        res.render('timesheet', {
          user: req.user,
          allmyproject
        });
      }
    });
  });
});

// *******************************************************************
// ADD NEW TIMESHEET-TEMP for Admin
app.get('/timesheetTemp/:employeeID', function (req, res) {
  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {
      return res.redirect('/error');
    } else if (user.employeeID != req.user.employeeID) {
      return res.redirect('/error');
    }
    var allmyproject = [];
    var allmyprojectID = [];
    var teamLead;

    Project.find({ team: user.team, status: 'Open' }, function (err, allOpenedProject) {
      if (allOpenedProject != null) {

        for (var i = 0; i < allOpenedProject.length; i++) {
          var myProject = allOpenedProject[i].employeeID;
          var projectArray = myProject.split(",");
          for (j = 0; j < projectArray.length; j++) {
            var projectArraywithID = projectArray[j].split(":");

            for (k = 0; k < projectArraywithID.length; k += 3) {
              console.log(projectArraywithID[k]);
              if (projectArraywithID[k] == user.employeeID) {

                allmyproject.push(allOpenedProject[i].projectName);

                allmyprojectID.push(allOpenedProject[i].projectID);
                teamLead = allOpenedProject[i].teamLead;
              }
            }
          }
        }
        res.render('timesheetTemp', {
          user: req.user,
          allmyproject,
          allmyprojectID,
          teamLead
        });

      } else {
        allmyproject.push("No Assigned Project(s)");
        res.render('timesheetTemp', {
          user: req.user,
          allmyproject
        });
      }
    });
  });
})

function makeProjectID(length) {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}

app.post('/timesheetTemp/:employeeID', function (req, res, next) {
  fechas = req.body.date.split(" - ");
  var timesheet = new Timesheet({
    timesheetID: makeProjectID(11),
    employeeID: req.body.employeeID,
    date: req.body.date,

    begDate: new Date(fechas[0]),
    endDate: new Date(fechas[1]),

    
    percentage: req.body.percentage,
    project: req.body.project,
    allocation: req.body.allocation,
    allocable_percentage: req.body.allocable_percentage,
    non_allocable_percentage: req.body.non_allocable_percentage,
    personal_time_percentage: req.body.personal_time_percentage,

    level: req.body.level,
    status: "Pending",
    teamLead: req.body.teamLead,
    firstName: req.body.firstName,
    lastName: req.body.lastName
  });

  timesheet.save(function (err) {
    req.flash('success_msg', 'A new Timesheet has been entered');
    res.redirect('/timesheetTemp/' + req.params.employeeID);
  });
});


app.post('/timesheet/:employeeID', function (req, res, next) {
  fechas = req.body.date.split(" - ");
  var timesheet = new Timesheet({
    timesheetID: makeProjectID(11),
    employeeID: req.body.employeeID,
    date: req.body.date,
    begDate: new Date(fechas[0]),
    endDate: new Date(fechas[1]),
    level: req.body.level,
    allocable_percentage: req.body.allocable_percentage,
    non_allocable_percentage: req.body.non_allocable_percentage,
    personal_time_percentage: req.body.personal_time_percentage,
    percentage: req.body.percentage,
    project: req.body.project,
    allocation: req.body.allocation,
    status: "Pending",
    teamLead: req.body.teamLead,
    firstName: req.body.firstName,
    lastName: req.body.lastName
  });

  timesheet.save(function (err) {
    req.flash('success_msg', 'A new Timesheet has been entered');
    res.redirect('/timesheet/' + req.params.employeeID);
  });
});

// *******************************************************************
// TIMESHEET SUMARY
app.get('/timesheetsummary/:employeeID', function (req, res) {
  /*
  Timesheet.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {
      // req.flash('error_msg', 'No Timesheet found');
      return res.redirect('/dashboard/' + req.params.employeeID);
    }
    */
  Timesheet.find({}, function (err, allUser) {
    if (allUser != null) {
      User.find({ employeeID: req.params.employeeID }, function (err, userInfo) {
        if (userInfo[0].level != '0') {
          filter_row = allUser.filter(x => x.employeeID == req.params.employeeID);
        } else {
          filter_row = allUser;
        }

        res.render('timesheetsummary', {
          user: req.user,
          allUser,
          userInfo,
          filter_row
        });
      });
    }
  });
});


app.post('/timesheetsummary/:employeeID', function (req, res) {
  //console.log("ferfecha", req.body.fecha)
  var date = req.body.fecha.split(" - ");
  var begDate = date[0];
  var endDate = date[1];
  d = new Date(begDate);
  var day = d.getDay();
  diff = d.getDate() - day;

  e = new Date(endDate);
  var eDay = e.getDay();
  sum = e.getDate() + (7 - eDay - 1);
  
  var initDate = new Date(d.setDate(diff));
  var lastDate = new Date(e.setDate(sum));


  Timesheet.find({ begDate: {
        $gte: initDate,
        $lt: lastDate,
      }, endDate: {
        $gte: initDate,
        $lt: lastDate,
      }
}, function (err, allUser) {
    if (allUser != null) {
      User.find({ employeeID: req.params.employeeID }, function (err, userInfo) {
        if (userInfo[0].level != '0') {
          filter_row = allUser.filter(x => x.employeeID == req.params.employeeID);
        } else {
          filter_row = allUser;
        }

        res.render('timesheetsummary', {
          user: req.user,
          allUser,
          userInfo,
          filter_row
        });
      });
    }
  });
});


/*
app.get('/timesheetsummary/:employeeID', async function(req, res){  
  Promise.all()    
  .then(result =>{
    if (result == 1){
      res.render('timesheetsummary', {
        user: req.user,
        allUser: allUser        
      });
    }
  })
  .catch((err) => {
    console.log(err.message)
  });

  return new Promise(function(resolve, reject){
    var allUser = [];
    User.findOne({ employeeID: req.params.employeeID}, function(err, user) {
      if (!user) {        
        return res.redirect('/error');
      } else if (user.level == 0 || user.level == 1){
        User.find({}, function(err, Users) {         
          for(var i = 0; i < Users.length; i++){
            Timesheet.find({employeeID: Users[i].employeeID}, function(err, allUserTimesheet) {        
              allUser.push(allUserTimesheet);
              console.log(allUserTimesheet +'dsfffff'+ i);             
            });            
          }  
         resolve(1);        
        });  
      } else if (user.level == 2) {        
      } else {  
      }
    });
  })
});
*/

app.get('/dashboard/:employeeID', function (req, res) {
  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {
      return res.redirect('/error');
    } else if (user.employeeID != req.user.employeeID) {
      return res.redirect('/error');
    }

    if (user.level == 0) {
      User.find({}, function (err, allUser) {
        Project.find({}, function (err, allProject) {
          Timesheet.find({}, function (err, allTimesheets) {
            Timesheet.find({status: 'Pending'}, function (err, pendingTimesheets) {
            res.render('dashboard', {
              user: req.user,
              allUser,
              allProject,
              allTimesheets,
              pendingTimesheets
            });
          });
          });
        });

       
      });
    } else {
      var allmyproject = [];
      var allmyprojectID = [];

      Project.find({ team: user.team, status: 'Open' }, function (err, allOpenedProject) {
        if (allOpenedProject != null) {

          for (i = 0; i < allOpenedProject.length; i++) {
            var myProject = allOpenedProject[i].employeeID;
            var projectArray = myProject.split(",");
            for (j = 0; j < projectArray.length; j++) {
              var projectArraywithID = projectArray[j].split(":");

              for (k = 0; k < projectArraywithID.length; k += 3) {
                console.log(projectArraywithID[k]);
                if (projectArraywithID[k] == user.employeeID) {
                  allmyproject.push(allOpenedProject[i].projectName);

                  allmyprojectID.push(allOpenedProject[i].projectID);
                  teamLead = allOpenedProject[i].teamLead;
                }
              }
            }
          }

          User.find({}, function (err, allUser) {
            Timesheet.find({ employeeID: req.params.employeeID}, function (err, allTimesheets) {
              Timesheet.find({ employeeID: req.params.employeeID, status: 'Pending'}, function (err, pendingTimesheets) {
                res.render('dashboard', {
                user: req.user,
                allUser,
                allmyproject,
                allmyprojectID,
                allTimesheets,
                pendingTimesheets
               });
            });
            });

          
          });
        }
      });
    }
  });
});

// *******************************************************************
// *******************************************************************
app.get('/forgot', function (req, res) {
  res.render('forgot', {
    user: req.user
  });
});

app.post('/forgot', function (req, res, next) {
  async.waterfall([
    function (done) {
      crypto.randomBytes(20, function (err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function (token, done) {
      User.findOne({ username: req.body.email }, function (err, user) {
        if (!user) {
          req.flash('error_msg', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function (err) {
          done(err, token, user);
        });
      });
    },
    function (token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: '5bitsoftwareteam@gmail.com',
          pass: 'cppcispn1!!2'
        }
      });
      var mailOptions = {
        to: user.username,
        from: '5bitsoftwareteam@gmail.com',
        subject: 'Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function (err) {
        req.flash('info', 'An e-mail has been sent to ' + user.username + ' with further instructions.');
        done(err, 'done');
      });

      res.redirect('/');
    }
  ], function (err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

// *******************************************************************
// *******************************************************************
app.get('/reset/:token', function (req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function (err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {
      user: req.user
    });
  });
});

app.post('/reset/:token', function (req, res) {
  async.waterfall([
    function (done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function (err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }

        if (req.body.password != req.body.rePassword) {
          req.flash('error', 'Passwords do Not match.');
          return res.redirect('/reset/' + req.params.token);
        } else {
          user.password = req.body.password;
          user.resetPasswordToken = undefined;
          user.resetPasswordExpires = undefined;

          user.save(function (err) {
            req.logIn(user, function (err) {
              res.redirect('/dashboard/' + user.employeeID);
              done(err, user);
            });
          });
        }
      });
    },
    function (user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: '5bitsoftwareteam@gmail.com',
          pass: 'cppcispn1!!2'
        }
      });
      var mailOptions = {
        to: user.email,
        from: '5bitsoftwareteam@gmail.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function (err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ]);
});

// *******************************************************************
app.get('/validate/:token', function (req, res) {
  User.findOne({ verifyUserToken: req.params.token, verifyUserExpires: { $gt: Date.now() } }, function (err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('validate', {
      user: req.user
    });
  });
});

app.post('/validate/:token', function (req, res) {
  async.waterfall([
    function (done) {
      User.findOne({ verifyUserToken: req.params.token, verifyUserExpires: { $gt: Date.now() } }, function (err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }

        user.password = req.body.password;
        user.verifyUserToken = undefined;
        user.verifyUserExpires = undefined;

        user.save(function (err) {
          req.logIn(user, function (err) {
            res.redirect('/dashboard/' + user.employeeID);
            done(err, user);
          });
        });
      });
    },
    function (user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: '5bitsoftwareteam@gmail.com',
          pass: 'cppcispn1!!2'
        }
      });
      var mailOptions = {
        to: user.username,
        from: '5bitsoftwareteam@gmail.com',
        subject: 'Your account has been verified',
        text: 'Hello,' + user.firstName + user.lastName + '\n\n' +
          'This is a confirmation that your account ' + user.username + ' has just been verifiied.\n'
      };
      smtpTransport.sendMail(mailOptions, function (err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ]);
});
// *******************************************************************

//****** Profile Picture Upload ****************************************** */
// @route POST /upload
// @desc Uploads file to DB
app.post('/upload/:employeeID', upload.single('file'), (req, res) => {
  //res.json({ file: req.file });
  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {
      return res.redirect('/error')
    }
    user.picture = filename;
    user.save(function (err) {
      req.flash('success_msg', 'Profile picture uploaded');
      res.redirect('/profile/' + user.employeeID);
    });
  });
});

// @route GET /files/:filename
// @desc Display file in json
app.get('/files/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }
    return res.json(file);
  });
});

// @route GET /image/:filename
// @desc Display files in json
app.get('/image/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }
    // Check if image
    if (file.contentType === 'image/jpeg' || file.contentType === 'img/png') {
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: 'Not an image'
      });
    }
  });
});


module.exports = app;
