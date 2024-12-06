#!/bin/bash

# Check if bucket name is provided
if [ -z "$1" ]; then
    echo "Usage: ./deploy.sh <s3-bucket-name>"
    exit 1
fi

BUCKET_NAME=$1

# Build TypeScript files
echo "Building TypeScript files..."
npm run build

# Create dist directory
echo "Creating dist directory..."
rm -rf dist
mkdir -p dist

# Copy static files
echo "Copying static files..."
cp index.html dist/
cp styles.css dist/
cp -r src/*.js dist/
cp -r src/orbs/*.js dist/
cp -r src/types/*.js dist/

# Check if config exists
if [ ! -f "dist/config.js" ]; then
    echo "Creating config.js..."
    if [ -f ".env" ]; then
        # Extract OPENAI_API_KEY from .env and create config.js
        OPENAI_API_KEY=$(grep OPENAI_API_KEY .env | cut -d '=' -f2)
        echo "export const OPENAI_API_KEY = '$OPENAI_API_KEY';" > dist/config.js
    else
        echo "Warning: .env file not found. Creating empty config.js"
        echo "export const OPENAI_API_KEY = '';" > dist/config.js
    fi
fi

# Create and configure S3 bucket
echo "Configuring S3 bucket..."

# Enable static website hosting
aws s3 website s3://$BUCKET_NAME --index-document index.html

# Set bucket policy for public access
echo "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [
        {
            \"Sid\": \"PublicReadGetObject\",
            \"Effect\": \"Allow\",
            \"Principal\": \"*\",
            \"Action\": \"s3:GetObject\",
            \"Resource\": \"arn:aws:s3:::$BUCKET_NAME/*\"
        }
    ]
}" > bucket-policy.json

aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://bucket-policy.json
rm bucket-policy.json

# Set CORS configuration
echo "[
    {
        \"AllowedHeaders\": [
            \"*\"
        ],
        \"AllowedMethods\": [
            \"GET\"
        ],
        \"AllowedOrigins\": [
            \"*\"
        ],
        \"ExposeHeaders\": []
    }
]" > cors-policy.json

aws s3api put-bucket-cors --bucket $BUCKET_NAME --cors-configuration file://cors-policy.json
rm cors-policy.json

# Upload files to S3
echo "Uploading files to S3..."
aws s3 sync dist/ s3://$BUCKET_NAME/

# Get the website URL
WEBSITE_URL=$(aws s3 website s3://$BUCKET_NAME --index-document index.html | grep -o 'http://.*')

echo "Deployment complete!"
echo "Your website is available at: $WEBSITE_URL"
echo ""
echo "Important notes:"
echo "1. Make sure your OpenAI API key is correctly set in config.js"
echo "2. For better performance and HTTPS, consider setting up CloudFront"
echo "3. Test the application thoroughly after deployment"
