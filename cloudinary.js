const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'dj3ybfq35',
  api_key: '644838731372239',
  api_secret: 'jqGuZxDTDCdpArFf2i5xCy2a2-o',
  secure: true,
});

module.exports = cloudinary;
