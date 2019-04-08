var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Create Schema
var timesheetSchema = new Schema({
  timesheetID: {
    type: String,
    required: true
  },
  employeeID: {
    type: String,
    required: true
  },
  date: { 
    type: String, 
    required: true 
  },
  percentage: { 
    type: String, 
    required: true 
  },
  project: { 
    type: String, 
    required: true 
  },
  allocation: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    required: true 
  },
  teamLead: { 
    type: String, 
    required: true 
  }
});

// Create a model, call 'timesheet' and connect it to timesheetSchema. Export to router and use it in other files
mongoose.model('Timesheet', timesheetSchema);