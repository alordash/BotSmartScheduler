require('dotenv').config();
const express = require('express');
const app = express();

function dWB() {}

dWB.prototype.msgData = '';
dWB.prototype.schedule = '';
dWB.prototype.editedTime = '';

dWB.prototype.dWBinit = function () {
    app.get('/', (req, res) => {
      if (this.msgData === '') {
        res.send('No messages to display');
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(this.msgData));
      }
    });
    
    app.get('/schedule', (req, res) => {
      if (this.schedule === '') {
        res.send('No schedules to display');
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(this.schedule));
      }
    });

    app.get('/editedTime', (req, res) => {
      if (this.editedTime === '') {
        res.send('No editedTime to display');
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(this.editedTime));
      }
    });

    app.listen(process.env.PORT || 3000, () => {
        console.log('Server Started');
    });
}

module.exports = dWB;