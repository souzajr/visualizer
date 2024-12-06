# Deploying the AI Orb Application

## Build Steps

1. Build the TypeScript files:
```bash
npm run build
```

2. Create a `dist` folder with all required files:
```bash
mkdir -p dist
cp index.html dist/
cp styles.css dist/
cp -r src/*.js dist/
cp -r src/orbs/*.js dist/
cp -r src/types/*.js dist/
```

## S3 Setup

1. Create an S3 bucket:
   - Create a new bucket in your AWS account
   - Enable "Static website hosting" under bucket properties
   - Set index.html as the index document

2. Configure bucket policy for public access:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
        }
    ]
}
```

3. Configure CORS:
```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET"
        ],
        "AllowedOrigins": [
            "*"
        ],
        "ExposeHeaders": []
    }
]
```

## Environment Setup

1. Create a config.js file in the dist folder:
```javascript
export const OPENAI_API_KEY = 'your-api-key';
// Add other environment variables as needed
```

## Deployment Steps

1. Build and prepare files:
```bash
# Build TypeScript
npm run build

# Create dist folder
mkdir -p dist

# Copy static files
cp index.html dist/
cp styles.css dist/
cp -r src/*.js dist/
cp -r src/orbs/*.js dist/
cp -r src/types/*.js dist/

# Create config file
echo "export const OPENAI_API_KEY = 'your-api-key';" > dist/config.js
```

2. Upload to S3:
```bash
aws s3 sync dist/ s3://YOUR-BUCKET-NAME/
```

## Important Notes

1. Security Considerations:
   - Never commit API keys to source control
   - Consider using AWS Secrets Manager or similar for API key management
   - Use environment-specific config files

2. CORS and API Access:
   - Ensure OpenAI API allows requests from your S3 bucket domain
   - Set appropriate CORS headers in your S3 bucket configuration

3. Browser Support:
   - The application requires modern browser features:
     - Web Speech API
     - Canvas API
     - ES6 Modules
     - WebAudio API

4. Performance:
   - Enable S3 bucket static website hosting
   - Consider using CloudFront for better performance
   - Enable gzip compression in CloudFront

## Optional CloudFront Setup

For better performance and HTTPS support:

1. Create a CloudFront distribution:
   - Origin: Your S3 bucket website endpoint
   - Viewer protocol policy: Redirect HTTP to HTTPS
   - Default root object: index.html

2. Configure custom domain (optional):
   - Add alternate domain name in CloudFront
   - Create SSL certificate in ACM
   - Update DNS records

## Testing

After deployment:

1. Verify all static assets load correctly
2. Test speech recognition functionality
3. Verify OpenAI API calls work
4. Check audio playback
5. Test orb visualizations
6. Verify environment variables are correctly set

## Troubleshooting

Common issues:

1. CORS errors:
   - Check S3 CORS configuration
   - Verify OpenAI API CORS settings

2. Asset loading issues:
   - Verify all files were copied to dist
   - Check S3 bucket permissions

3. API key issues:
   - Verify config.js is present
   - Check API key is valid

4. Browser compatibility:
   - Test in multiple browsers
   - Check console for errors
