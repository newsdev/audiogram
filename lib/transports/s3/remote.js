var AWS = require("aws-sdk"),
    fs = require("fs");

module.exports = function(bucket, storagePath) {

  var s3Options = { params: { Bucket: bucket } };
  if (process.env.S3_ENDPOINT) {
    s3Options.endpoint = process.env.S3_ENDPOINT;
  }
  var s3 = new AWS.S3(s3Options);

  // Test credentials
  s3.headBucket({}, function(err){ if (err) { throw err; } });

  function upload(source, key, cb) {

    var params = {
      Key: storagePath + key,
      Body: fs.createReadStream(source)
    };

    // gzipping results in inconsistent file size :(
    s3.putObject(params, cb);

  }

  function download(key, destination, cb) {

    var file = fs.createWriteStream(destination)
      .on("error", cb)
      .on("close", cb);

    s3.getObject({ Key: storagePath + key })
      .createReadStream()
      .pipe(file);

  }

  function clean(cb) {

    s3.listObjects({ Prefix: storagePath }, function(err, data){

      if (err || !data.Contents || !data.Contents.length) {
        return cb(err);
      }

      var objects = data.Contents.map(function(obj) {
        return { Key: obj.Key };
      });

      deleteObjects(objects, !!data.IsTruncated, cb);

    });

  }

  function deleteObjects(objects, truncated, cb) {

    s3.deleteObjects({ Delete: { Objects: objects } }, function(err, data){

      if (err) {
        return cb(err);
      }

      if (truncated) {
        return clean(cb);
      }

      return cb(null);

    });

  }

  // TODO make this more configurable
  function getURL(id) {
    return "https://" + bucket + "/" + storagePath + "video/" + id + ".mp4";
  }

  return {
    upload: upload,
    download: download,
    getURL: getURL,
    clean: clean
  };

};
