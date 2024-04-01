import { useEffect } from 'react';
import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
  LanguageCode,
} from '@aws-sdk/client-transcribe-streaming';
import pEvent from 'p-event';

const sampleRate = import.meta.env.VITE_TRANSCRIBE_SAMPLING_RATE;
const language = import.meta.env.VITE_TRANSCRIBE_LANGUAGE_CODE;
const audiosource = import.meta.env.VITE_TRANSCRIBE_AUDIO_SOURCE;

const startStreaming = async (handleTranscribeOutput, currentCredentials) => {
  const audioContext = new window.AudioContext();
  let stream;

  if (audiosource === 'ScreenCapture') {
    stream = await window.navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });
  } else {
    stream = await window.navigator.mediaDevices.getUserMedia({
      video: false,
      audio: true,
    });
  }

  const source1 = audioContext.createMediaStreamSource(stream);

  const recordingprops = {
    numberOfChannels: 1,
    sampleRate: audioContext.sampleRate,
    maxFrameCount: (audioContext.sampleRate * 1) / 10,
  };

  try {
    await audioContext.audioWorklet.addModule(
      './worklets/recording-processor.js'
    );
  } catch (error) {
    console.log(`Add module error ${error}`);
  }
  const mediaRecorder = new AudioWorkletNode(
    audioContext,
    'recording-processor',
    {
      processorOptions: recordingprops,
    }
  );

  const destination = audioContext.createMediaStreamDestination();

  mediaRecorder.port.postMessage({
    message: 'UPDATE_RECORDING_STATE',
    setRecording: true,
  });

  source1.connect(mediaRecorder).connect(destination);
  mediaRecorder.port.onmessageerror = (error) => {
    console.log(`Error receving message from worklet ${error}`);
  };

  const audioDataIterator = pEvent.iterator(mediaRecorder.port, 'message');

  const getAudioStream = async function* () {
    for await (const chunk of audioDataIterator) {
      if (chunk.data.message === 'SHARE_RECORDING_BUFFER') {
        const abuffer = pcmEncode(chunk.data.buffer[0]);
        const audiodata = new Uint8Array(abuffer);
        yield {
          AudioEvent: {
            AudioChunk: audiodata,
          },
        };
      }
    }
  };
  console.log('Transcribe streaming client created', currentCredentials);
  const transcribeClient = new TranscribeStreamingClient({
    region: 'us-east-1',
    credentials: {
      accessKeyId: currentCredentials.accessKeyId,
      secretAccessKey: currentCredentials.secretAccessKey,
      sessionToken: currentCredentials.sessionToken,
    },
  });

  const command = new StartStreamTranscriptionCommand({
    LanguageCode: language,
    MediaEncoding: 'pcm',
    MediaSampleRateHertz: sampleRate,
    AudioStream: getAudioStream(),
  });
  const data = await transcribeClient.send(command);
  console.log('Transcribe sesssion established ', data.SessionId);

  if (data.TranscriptResultStream) {
    for await (const event of data.TranscriptResultStream) {
      if (event?.TranscriptEvent?.Transcript) {
        for (const result of event?.TranscriptEvent?.Transcript.Results || []) {
          if (result?.Alternatives && result?.Alternatives[0].Items) {
            let completeSentence = ``;
            for (let i = 0; i < result?.Alternatives[0].Items?.length; i++) {
              completeSentence += ` ${result?.Alternatives[0].Items[i].Content}`;
            }
            handleTranscribeOutput(
              completeSentence,
              result.IsPartial || false,
              transcribeClient,
              mediaRecorder
            );
          }
        }
      }
    }
  }
};

const stopStreaming = async (mediaRecorder, transcribeClient) => {
  if (mediaRecorder) {
    mediaRecorder.port.postMessage({
      message: 'UPDATE_RECORDING_STATE',
      setRecording: false,
    });
    mediaRecorder.port.close();
    mediaRecorder.disconnect();
  } else {
    console.log('no media recorder available to stop');
  }

  if (transcribeClient) {
    transcribeClient.destroy();
  }
};

const pcmEncode = (input) => {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
};

const LiveTranscriptions = (props) => {
  const {
    transcribeStatus,
    mediaRecorder,
    transcriptionClient,
    currentCredentials,
    setMediaRecorder,
    setTranscriptionClient,
    setTranscript,
  } = props;

  const onTranscriptionDataReceived = (
    data,
    partial,
    transcriptionClient,
    mediaRecorder
  ) => {
    setTranscript({
      channel: '0',
      partial: partial,
      text: data,
    });
    setMediaRecorder(mediaRecorder);
    setTranscriptionClient(transcriptionClient);
  };

  const startRecording = async () => {
    if (!currentCredentials) {
      console.error('credentials not found');
      return;
    }
    try {
      await startStreaming(onTranscriptionDataReceived, currentCredentials);
    } catch (error) {
      alert(`An error occurred while recording: ${error}`);
      await stopRecording();
    }
  };

  const stopRecording = async () => {
    if (mediaRecorder && transcriptionClient) {
      await stopStreaming(mediaRecorder, transcriptionClient);
    } else {
      console.log('no media recorder');
    }
  };

  async function toggleTranscribe() {
    if (transcribeStatus) {
      console.log('startRecording');
      await startRecording();
    } else {
      console.log('stopRecording');
      await stopRecording();
    }
  }

  useEffect(() => {
    toggleTranscribe();
  }, [transcribeStatus]);

  return <></>;
};

export default LiveTranscriptions;
