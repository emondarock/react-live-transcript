import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import {
  ContentLayout,
  Header,
  SpaceBetween,
  Button,
  Container,
} from '@cloudscape-design/components';
import '@cloudscape-design/global-styles/index.css';

import LiveTranscriptions from './components/LiveTranscriptions';

function App() {
  const [currentCredentials, setCurrentCredentials] = useState({
    accessKeyId: import.meta.env.VITE_REACT_APP_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_REACT_APP_SECRET_ACCESS_KEY,
    sessionToken: import.meta.env.VITE_REACT_APP_SESSION_TOKEN,
  });
  const [fullTranscript, setFullTranscript] = useState('');
  const [transcriptionClient, setTranscriptionClient] = useState(null);
  const [transcribeStatus, setTranscribeStatus] = useState(false);
  const [transcript, setTranscript] = useState();
  const [lines, setLines] = useState([]);
  const [currentLine, setCurrentLine] = useState([]);
  const [mediaRecorder, setMediaRecorder] = useState();

  useEffect(() => {
    if (transcript) {
      console.log('transcript', transcript);
      setFullTranscript(fullTranscript + transcript.text);
      setTranscript(transcript);
      if (transcript.partial) {
        setCurrentLine([transcript]);
      } else {
        setLines([...lines, transcript]);
        setCurrentLine([]);
      }
    }
  }, [transcript]);

  console.log(import.meta.env.VITE_REACT_APP_USER_POOL_ID);

  const handleTranscribe = async () => {
    setTranscribeStatus(!transcribeStatus);
    if (transcribeStatus) {
      console.log('Stopping transcription');
    } else {
      console.log('Starting transcription');
    }
    return transcribeStatus;
  };

  return (
    <>
      <ContentLayout
        header={
          <SpaceBetween size="m">
            <Header
              variant="h1"
              description="Demo of live transcriptions"
              actions={
                <SpaceBetween direction="horizontal" size="m">
                  <Button variant="primary" onClick={handleTranscribe}>
                    {transcribeStatus
                      ? 'Stop Transcription'
                      : 'Start Transcription'}
                  </Button>
                </SpaceBetween>
              }
            >
              Amazon Transcribe Live Transcriptions
            </Header>
          </SpaceBetween>
        }
      >
        <Container header={<Header variant="h2">Transcriptions</Header>}>
          <SpaceBetween size="xs">
            <div
              style={{ height: '663px' }}
              className={'transcriptionContainer'}
            >
              <p>{fullTranscript}</p>
              {lines.map((line, index) => {
                return (
                  <div key={index}>
                    <strong>Channel {line.channel}</strong>: {line.text}
                    <br />
                  </div>
                );
              })}
              {currentLine.length > 0 &&
                currentLine.map((line, index) => {
                  return (
                    <div key={index}>
                      <strong>Channel {line.channel}</strong>: {line.text}
                      <br />
                    </div>
                  );
                })}
            </div>
          </SpaceBetween>
        </Container>
      </ContentLayout>
      <LiveTranscriptions
        currentCredentials={currentCredentials}
        mediaRecorder={mediaRecorder}
        setMediaRecorder={setMediaRecorder}
        setTranscriptionClient={setTranscriptionClient}
        transcriptionClient={transcriptionClient}
        transcribeStatus={transcribeStatus}
        setTranscript={setTranscript}
      />
    </>
  );
}

export default App;
