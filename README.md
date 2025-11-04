# AI PDF-to-Audio Platform

Transform your PDF documents into natural, human-like audio using advanced AI voice technology powered by OpenAI's TTS.

## Features

- 📄 **PDF Upload**: Drag & drop or click to upload PDF files (up to 30MB)
- 🤖 **AI Voice Conversion**: Uses OpenAI's advanced TTS with emotional male voice
- 🎵 **Audio Player**: Built-in player with play/pause, seek, volume controls
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🎭 **Natural Speech**: Optimized text processing for human-like narration
- 💾 **Download Audio**: Save generated audio as MP3 files

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, React Icons
- **AI/ML**: OpenAI TTS API (tts-1-hd model with "onyx" voice)
- **PDF Processing**: pdf-parse for text extraction
- **File Upload**: react-dropzone for drag & drop functionality

## Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd PDF-TTS
npm install
```

### 2. Environment Configuration

Create a `.env.local` file in the root directory:

```bash
# OpenAI API Configuration
OPENAI_API_KEY=your-openai-api-key-here
```

**Get your OpenAI API key:**
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add it to your `.env.local` file

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

1. **Upload PDF**: Users upload a PDF document via drag & drop interface
2. **Text Extraction**: The system extracts actual text content from the PDF using pdf-parse with Next.js compatibility
3. **Text Processing**: Advanced text processing optimizes content for speech synthesis
4. **AI Voice Generation**: OpenAI's TTS converts text to natural, emotional audio
5. **Audio Playback**: Users can play, pause, seek, and download the generated audio

## Text Extraction Features

**Real PDF Processing**: The platform now uses `pdf-parse` library with Next.js compatibility to extract actual text content from uploaded PDFs:
- Extracts text from all pages of the PDF
- Handles various PDF formats and structures
- Processes text for optimal speech synthesis
- Supports text-based PDFs (not scanned images)

## Voice Configuration

The platform uses OpenAI's **"onyx"** voice model, which provides:
- Deep, warm male voice
- Excellent emotional expression
- Natural intonation and pacing
- Professional audiobook quality

## API Endpoints

### POST `/api/convert-to-audio`

Converts uploaded PDF to audio.

**Request:**
- Content-Type: `multipart/form-data`
- Body: PDF file in `pdf` field

**Response:**
- Success: Audio file (MP3 format)
- Error: JSON with error message

## File Structure

```
src/
├── app/
│   ├── api/convert-to-audio/route.ts  # PDF to audio conversion API
│   ├── globals.css                    # Global styles
│   ├── custom.css                     # Custom component styles
│   ├── layout.tsx                     # Root layout
│   └── page.tsx                       # Homepage
├── components/
│   ├── ui/button.tsx                  # shadcn/ui button component
│   ├── PDFUploader.tsx               # PDF upload component
│   ├── ConversionLoader.tsx          # Loading animation component
│   └── AudioPlayer.tsx               # Audio playback component
└── lib/
    ├── utils.ts                       # shadcn/ui utilities
    └── textProcessing.ts              # PDF text processing utilities
```

## Key Components

### PDFUploader
- Drag & drop interface for PDF uploads
- File validation (PDF only, max 30MB)
- Visual feedback for upload states

### ConversionLoader
- Multi-step progress indicator
- Real-time conversion status
- AI voice engine information

### AudioPlayer
- Full-featured audio controls
- Progress seeking and volume control
- Download functionality
- Audio metadata display

## Text Processing Features

- **Smart Cleaning**: Removes PDF artifacts and normalizes text
- **Speech Optimization**: Adds pauses and handles abbreviations
- **Chunk Management**: Handles large documents within API limits
- **Sentence Boundary Detection**: Intelligent text truncation

## Error Handling

The platform provides comprehensive error handling for:
- Invalid file types or sizes
- PDF text extraction failures
- OpenAI API errors (quota, billing, rate limits)
- Network and server errors

## Future Enhancements

- Multiple voice options (male/female, different accents)
- Chapter-by-chapter processing for large documents
- User authentication and file management
- Subscription plans and usage tracking
- API for third-party integrations
- Multi-language support

## Requirements

- Node.js 18+
- OpenAI API key with TTS access
- Modern web browser with audio support

## License

This project is part of the AI PDF-to-Audio Platform requirements document implementation.


https://docs.google.com/document/d/1SO__ivREzyEEtVDQbvPgNEG7P-wfp9ayD1oiPKF_y2o/edit?usp=sharing&pli=1&authuser=0

GumRoad credentials
Application id: xWrdeMWJOuKKLxPsUMkKZoqm9kclAR_YsrdZ-8cvllU
Application secret: qFXWMWUhgkNOEK0E7YEfyeDB2GIsfe6Rj-5qWBnuD2c
Access Token: 1Y03TDZb-NwZ1JKs5xerNb2N_INn4pJ6Wpjqp0AGUqo
