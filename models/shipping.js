const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const ShippingInfoSchema = new Schema({
    shipperName: String,
    shipmentDate: String,
    qty: String,
    destination: String,
    importerName: String,
    country: String
});

const ShipppingInfo = mongoose.model('shippingInfo', ShippingInfoSchema);

module.exports = ShipppingInfo;