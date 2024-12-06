# AI Orb

An interactive AI-powered orb visualization with speech interaction.

## Features

- Speech-to-text input
- OpenAI-powered responses
- Text-to-speech output
- Multiple orb visualizations
- Audio-reactive animations
- Click-to-stop functionality

## Development

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with your OpenAI API key:
```
OPENAI_API_KEY=your-key-here
```

3. Start development server:
```bash
npm run dev
```

## Deployment

### Quick Deploy to S3

1. Ensure you have AWS CLI installed and configured with your credentials.

2. Deploy to your S3 bucket:
```bash
npm run deploy your-bucket-name
```

This will:
- Build the TypeScript files
- Create a distribution bundle
- Configure the S3 bucket for static website hosting
- Upload the files
- Set up necessary permissions and CORS

### Manual Deployment

See [deploy.md](deploy.md) for detailed deployment instructions, including:
- Manual build steps
- S3 configuration
- CloudFront setup (optional)
- Environment configuration
- Security considerations

## Browser Requirements

- Modern browser with support for:
  - Web Speech API
  - Canvas API
  - ES6 Modules
  - WebAudio API

## Security Notes

- Never commit your `.env` file or API keys
- Use appropriate CORS settings
- Consider using CloudFront for HTTPS

## License

MIT
