const sharp = require('sharp')
const AWS = require('aws-sdk')

const s3 = new AWS.S3()

const supportedWidths = new Set(['1920', '1280', '1080', '720', '480', '320', '120', '50'])

exports.handler = async (event) => {
  console.log('request: ' + JSON.stringify(event))
  if (event.headers['User-Agent'] !== 'Amazon CloudFront') {
    return {
      statusCode: 403,
      body: 'Not authorized'
    }
  }
  const { image, width } = event.pathParameters

  // redirect to default supported width when requested with is not supported
  if (!supportedWidths.has(width)) {
    return {
        statusCode: 403,
        body: 'Not authorized'
    }
  }

  const file = await s3
    .getObject({
      Bucket: process.env.PRIVATE_BUCKET_NAME,
      Key: image
    })
    .promise()

  const { data, info } = await sharp(file.Body)
    .resize({ width: parseInt(width) })
    .toBuffer({ resolveWithObject: true })

  await s3
  .putObject({
    Bucket: process.env.CDN_BUCKET_NAME,
    Key: `image/${width}/${image}`,
    Body: data,
    ContentType: 'image/' + info.format,
    Metadata: {
      original_key: image
    }
  })
  .promise()

  return {
    statusCode: 200,
    body: data.toString('base64'),
    isBase64Encoded: true,
    headers: {
      'Content-Type': 'image/' + info.format
    }
  }
}
