// To use a real AI backend like ChatGPT/Claude, set the page-level variable
// `window.AI_ASSISTANT_ENDPOINT` to a server endpoint that accepts POST JSON
// { prompt } and returns JSON { text }.
let recognition = null;
let recognitionActive = false;
let isSpeaking = false;

function formatMessage(role, text) {
  return `
    <div class="voice-demo-message ${role}">
      <strong>${role === 'user' ? 'You' : 'Assistant'}:</strong>
      <p>${text}</p>
    </div>
  `;
}

async function fetchAiAssistantResponse(prompt) {
  const endpoint = window.AI_ASSISTANT_ENDPOINT;
  if (!endpoint) {
    return simulateAssistantResponse(prompt);
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`AI endpoint error ${response.status}`);
    }

    const data = await response.json();
    return data.text || data.response || data.answer || simulateAssistantResponse(prompt);
  } catch (error) {
    console.warn('AI voice assistant endpoint failed:', error);
    return simulateAssistantResponse(prompt);
  }
}

function scrollTranscript() {
  const transcript = document.getElementById('voice-demo-transcript');
  if (transcript) {
    transcript.scrollTop = transcript.scrollHeight;
  }
}

function setVoiceDemoStatus(text) {
  const status = document.getElementById('voice-demo-status');
  if (status) status.textContent = text;
}

function appendVoiceTranscript(role, text) {
  const transcript = document.getElementById('voice-demo-transcript');
  if (!transcript) return;
  transcript.insertAdjacentHTML('beforeend', formatMessage(role, text));
  scrollTranscript();
}

function speakText(text, callback) {
  if (!window.speechSynthesis) {
    if (callback) callback();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 1;
  utterance.pitch = 1;

  utterance.onstart = () => {
    isSpeaking = true;
    setVoiceDemoStatus('Assistant is speaking...');
  };

  utterance.onend = () => {
    isSpeaking = false;
    if (callback) {
      callback();
    } else if (recognitionActive) {
      setVoiceDemoStatus('Listening for your next update.');
    }
  };

  utterance.onerror = () => {
    isSpeaking = false;
    if (callback) callback();
  };

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const recog = new SpeechRecognition();
  recog.interimResults = false;
  recog.continuous = true;
  recog.lang = 'en-US';

  recog.addEventListener('result', (event) => {
    if (!recognitionActive) return;
    const result = event.results[event.results.length - 1];
    const transcript = result[0].transcript.trim();
    if (transcript) {
      appendVoiceTranscript('user', transcript);
      handleVoiceDemoPrompt(transcript);
    }
  });

  recog.addEventListener('end', () => {
    if (recognitionActive && !isSpeaking) {
      try {
        recog.start();
        setVoiceDemoStatus('Listening...');
      } catch (e) {
        console.warn('Speech recognition restart failed:', e);
      }
    }
  });

  recog.addEventListener('error', (event) => {
    console.warn('Speech recognition error:', event.error);
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      setVoiceDemoStatus('Microphone access denied. Voice input is disabled.');
      stopRecognition();
    }
  });

  return recog;
}

function startRecognition() {
  if (!recognition || recognitionActive || isSpeaking) return;
  recognitionActive = true;
  try {
    recognition.start();
    setVoiceDemoStatus('Listening for your voice. Please speak now.');
  } catch (e) {
    console.warn('Speech recognition start failed:', e);
  }
}

function stopRecognition() {
  if (!recognition || !recognitionActive) return;
  recognitionActive = false;
  try {
    recognition.stop();
  } catch (e) {
    // ignore
  }
}

function openVoiceDemo() {
  const overlay = document.getElementById('voice-demo-overlay');
  if (!overlay) return;
  overlay.classList.add('open');
  document.body.classList.add('voice-demo-open');
  overlay.setAttribute('aria-hidden', 'false');
  const backendReady = window.AI_ASSISTANT_ENDPOINT ? 'AI voice backend is available.' : 'No AI backend configured; using local demo responses.';
  setVoiceDemoStatus(`Audio demo ready. Click start to begin the voice call. ${backendReady}`);
  const transcript = document.getElementById('voice-demo-transcript');
  if (transcript) transcript.innerHTML = '';
  appendVoiceTranscript('assistant', 'Hello! I am your demo customer service assistant. Click Start voice call and speak anytime once the call begins.');
}

function closeVoiceDemo() {
  const overlay = document.getElementById('voice-demo-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.classList.remove('voice-demo-open');
  overlay.setAttribute('aria-hidden', 'true');
  stopRecognition();
  window.speechSynthesis?.cancel();
}

function setCallButtons(running) {
  const start = document.getElementById('voice-demo-start');
  const stop = document.getElementById('voice-demo-stop');
  if (start) start.disabled = running;
  if (stop) stop.disabled = !running;
}

function simulateAssistantResponse(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes('schedule')) {
    return 'I can help schedule an appointment. What day and time work best for you?' ;
  }
  if (lowerPrompt.includes('explain') || lowerPrompt.includes('services')) {
    return 'We offer installation, repair, maintenance, indoor air quality, and emergency HVAC support for homes and small businesses.';
  }
  if (lowerPrompt.includes('emergency')) {
    return 'If this is an emergency, our team can dispatch a technician quickly. Please share the issue and your address so we can prioritize your request.';
  }
  if (lowerPrompt.includes('pricing')) {
    return 'Our pricing is transparent and depends on the service. I can arrange a free estimate or give you a quick ballpark based on your needs.';
  }
  return 'I am here to help with appointments, service details, or urgent HVAC repairs. Please tell me how I can assist you next.';
}

async function handleVoiceDemoPrompt(prompt) {
  if (recognitionActive) {
    stopRecognition();
  }

  appendVoiceTranscript('user', prompt);
  setVoiceDemoStatus('Assistant is preparing a response...');

  await new Promise((resolve) => setTimeout(resolve, 400));
  const response = await fetchAiAssistantResponse(prompt);

  appendVoiceTranscript('assistant', response);
  speakText(response, () => {
    if (recognition) {
      startRecognition();
    }
  });
  setVoiceDemoStatus('Demo mode: assistant response delivered.');
}

function startVoiceDemoCall() {
  setCallButtons(true);
  setVoiceDemoStatus('Connecting your voice demo assistant...');
  appendVoiceTranscript('assistant', 'Connecting to the customer service assistant. Please wait.');
  speakText('Connecting to the customer service assistant. Please wait.', () => {
    setVoiceDemoStatus('Voice demo call started. Speak a question when you hear the assistant.');
    appendVoiceTranscript('assistant', 'I am listening. How can I help with your HVAC needs today?');
    speakText('I am listening. How can I help with your HVAC needs today?', () => {
      if (recognition) {
        startRecognition();
      }
    });
  });
}

function stopVoiceDemoCall() {
  setCallButtons(false);
  stopRecognition();
  setVoiceDemoStatus('Voice demo call ended. Open the assistant again to restart the voice conversation.');
  appendVoiceTranscript('assistant', 'The demo call has ended. Thank you for trying the AI Voice assistant.');
  speakText('The demo call has ended. Thank you for trying the AI Voice assistant.');
}

window.addEventListener('DOMContentLoaded', () => {
  const openButton = document.getElementById('open-voice-demo');
  const closeButton = document.getElementById('close-voice-demo');
  const overlay = document.getElementById('voice-demo-overlay');
  const startButton = document.getElementById('voice-demo-start');
  const stopButton = document.getElementById('voice-demo-stop');
  const suggestionButtons = document.querySelectorAll('.suggestion-button');

  recognition = initSpeechRecognition();
  if (!recognition) {
    setVoiceDemoStatus('Speech recognition is not supported in this browser. The assistant will still speak responses.');
  }

  if (openButton) {
    openButton.addEventListener('click', openVoiceDemo);
  }

  if (closeButton) {
    closeButton.addEventListener('click', closeVoiceDemo);
  }

  if (overlay) {
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        closeVoiceDemo();
      }
    });
  }

  if (startButton) {
    startButton.addEventListener('click', startVoiceDemoCall);
  }

  if (stopButton) {
    stopButton.addEventListener('click', stopVoiceDemoCall);
  }

  suggestionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const prompt = button.textContent.trim();
      if (prompt) {
        handleVoiceDemoPrompt(prompt);
      }
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const overlayEl = document.getElementById('voice-demo-overlay');
      if (overlayEl && overlayEl.classList.contains('open')) {
        closeVoiceDemo();
      }
    }
  });
});
