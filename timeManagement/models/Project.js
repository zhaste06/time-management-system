var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Create Schema
var projectSchema = new Schema({
  projectID: { type: String, required: true },
  employeeID: { type: String, required: true },
  status: { type: String, required: true },
  projectName: { type: String, required: true },
  teamLead : { type: String, required: true },
  team: { type: String, required: true }
});


// Create a model, call 'project' and connect it to projectSchema. Export to router and use it in other files
mongoose.model('Project',projectSchema);