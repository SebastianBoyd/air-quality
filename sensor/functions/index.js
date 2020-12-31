/**
 * Responds to any HTTP request.
 *
 * @param {!Object} req HTTP request context.
 * @param {!Object} res HTTP response context.
 */
const bigquery = require('@google-cloud/bigquery')();

exports.helloWorld = (req, res) => {
    if (req.body.deviceID == undefined || req.body.message == undefined){
        res.status(400).send('Error');
        return;
    }
    let data = {
        deviceID: req.body.deviceID,
        timestamp: req.body.timestamp,
        temp: req.body.temp,
        humidity: req.body.humidity,
        pressure: req.body.pressure,
        pm_1_0: req.body.pm_1_0,
        pm_2_5: req.body.pm_2_5,
        pm_10_0: req.body.pm_10_0
    };
    if (
        data.humidity < 0 ||
        data.humidity > 100 ||
        data.temp > 100 ||
        data.temp < -50 ||
        data.pressure > 2000 ||
        data.pressure < 0 ||
        data.pm_1_0 < 0 ||
        data.pm_1_0 > 10000 ||
        data.pm_2_5 < 0 ||
        data.pm_2_5 > 10000 ||
        data.pm_10_0 < 0 ||
        data.pm_10_0 > 10000
      ) {
        // Unresonable data
            res.status(400).send('Error');
            return;
        }
    var options = {
        ignoreUnknownValues: true
    };
    // TODO: Make sure you set the `bigquery.datasetname` Google Cloud environment variable.
    const dataset = bigquery.dataset(functions.config().bigquery.datasetname);
    const table = dataset.table(functions.config().bigquery.tablename);
    table.insert(data, options);
    res.status(200).send(message);
};

exports.addRows = (req, res) => {

};
  