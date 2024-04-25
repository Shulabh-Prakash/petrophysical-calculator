import AWS from "aws-sdk";

AWS.config.update({
  region: "eu-north-1", // replace with your region
  accessKeyId: "AKIAZI2LE6ERKYJB5QEL", // replace with your access key ID
  secretAccessKey: "G3DTvtPMz8E2HuY0gsAc9HrBr4OHsopcHHFiMIei", // replace with your secret access key
});

export default AWS;
